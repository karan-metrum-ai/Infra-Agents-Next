/**
 * Tests for blockStore.hydrate() with historical block_snapshot payloads.
 *
 * Validates the end-to-end hydration contract: given a persisted
 * snapshot of blocks from a completed flow, the blockStore should
 * correctly populate its state so the v2 LiveBlockStream renderer
 * activates.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { blockStore } from "./blockStore";
import type {
  AgentFrameEvent,
  AgentFrameInput,
  Block,
  BlockCompleteEvent,
  BlockCreatedEvent,
} from "./types";

/**
 * Simulates the frontend's block_snapshot → hydrate path exactly as
 * implemented in useFlowStream.ts case 'block_snapshot'.
 */
function buildHydrateEvents(snapshot: {
  phase?: string;
  todo_list?: Array<{ id: string; title: string; status: string }>;
  blocks?: Array<Record<string, unknown>>;
}): AgentFrameInput[] {
  const events: AgentFrameInput[] = [];

  events.push({
    event: "agent_frame",
    data: {
      phase: (snapshot.phase ?? "completed") as AgentFrameEvent["data"]["phase"],
      todo_list: snapshot.todo_list ?? [],
      active_block_id: null,
    },
  } as AgentFrameEvent);

  for (const block of snapshot.blocks ?? []) {
    events.push({
      type: "block_created",
      block: block as unknown as Block,
    } as BlockCreatedEvent);
    events.push({
      type: "block_complete",
      block_id: block.id as string,
      status: block.status as "complete" | undefined,
    } as BlockCompleteEvent);
  }

  return events;
}

describe("blockStore.hydrate() for historical flows", () => {
  beforeEach(() => {
    blockStore.reset(null);
  });

  it("populates blocks from snapshot payload", () => {
    const snapshot = {
      phase: "completed",
      todo_list: [{ id: "t1", title: "Check pods", status: "completed" }],
      blocks: [
        { id: "rsn_1", kind: "reasoning", content: "Thinking...", locked: true },
        { id: "tc_1", kind: "tool", tool_name: "kubectl_get", output: "3 pods", locked: true },
        { id: "txt_1", kind: "text", content: "All healthy.", locked: true },
      ],
    };

    const events = buildHydrateEvents(snapshot);
    blockStore.hydrate(events);

    const state = blockStore.getSnapshot();
    expect(state.order).toHaveLength(3);
    expect(state.byId["rsn_1"]).toBeDefined();
    expect(state.byId["tc_1"]).toBeDefined();
    expect(state.byId["txt_1"]).toBeDefined();
    expect(state.byId["rsn_1"].kind).toBe("reasoning");
  });

  it("sets phase to completed and marks blocks locked", () => {
    const snapshot = {
      phase: "completed",
      blocks: [{ id: "b1", kind: "text", content: "Done", locked: true }],
    };

    blockStore.hydrate(buildHydrateEvents(snapshot));
    const state = blockStore.getSnapshot();

    expect(state.phase).toBe("completed");
    const block = state.byId["b1"];
    expect(block).toBeDefined();
    expect(block.locked).toBe(true);
  });

  it("handles empty blocks array without crash", () => {
    const events = buildHydrateEvents({ phase: "completed", blocks: [] });
    expect(() => blockStore.hydrate(events)).not.toThrow();
    const state = blockStore.getSnapshot();
    expect(state.order).toHaveLength(0);
    expect(state.phase).toBe("completed");
  });

  it("does not carry stale blocks after reset + hydrate", () => {
    // First hydration
    blockStore.hydrate(
      buildHydrateEvents({
        phase: "completed",
        blocks: [{ id: "old_1", kind: "text", content: "old" }],
      }),
    );
    expect(blockStore.getSnapshot().byId["old_1"]).toBeDefined();

    // Reset for new flow
    blockStore.reset("new-flow");

    // Second hydration
    blockStore.hydrate(
      buildHydrateEvents({
        phase: "failed",
        blocks: [{ id: "new_1", kind: "error", message: "oops" }],
      }),
    );

    const state = blockStore.getSnapshot();
    expect(state.byId["old_1"]).toBeUndefined();
    expect(state.byId["new_1"]).toBeDefined();
    expect(state.phase).toBe("failed");
  });

  it("activates v2 renderer condition (order.length > 0)", () => {
    blockStore.hydrate(
      buildHydrateEvents({
        phase: "completed",
        blocks: [
          { id: "rsn_a", kind: "reasoning", content: "analysis" },
          { id: "tc_b", kind: "tool", tool_name: "scan" },
        ],
      }),
    );

    const state = blockStore.getSnapshot();
    // This is the condition QueryTracePanel uses:
    const useV2Renderer = state.order.length > 0;
    expect(useV2Renderer).toBe(true);
  });

  it("preserves correlation_id when hydrating in snapshot mode", () => {
    blockStore.hydrate(
      buildHydrateEvents({
        phase: "completed",
        blocks: [{ id: "b1", kind: "text", content: "done" }],
      }),
      { mode: "snapshot", correlationId: "flow-test-001" },
    );
    expect(blockStore.getSnapshot().correlation_id).toBe("flow-test-001");
  });

  it("preserves todo_list from snapshot", () => {
    const snapshot = {
      phase: "completed",
      todo_list: [
        { id: "t1", title: "Deploy service", status: "completed" },
        { id: "t2", title: "Verify health", status: "completed" },
      ],
      blocks: [{ id: "b1", kind: "text", content: "done" }],
    };

    blockStore.hydrate(buildHydrateEvents(snapshot));
    const state = blockStore.getSnapshot();
    expect(state.todo_list).toHaveLength(2);
    expect(state.todo_list[0].title).toBe("Deploy service");
  });

  it("handles subagent blocks in snapshot", () => {
    const snapshot = {
      phase: "completed",
      blocks: [
        {
          id: "sub_1",
          kind: "subagent",
          agent_name: "dns_specialist",
          content: "DNS records verified",
          locked: true,
        },
        {
          id: "rsn_nested",
          kind: "reasoning",
          content: "Checking A records...",
          parent_id: "sub_1",
          locked: true,
        },
      ],
    };

    blockStore.hydrate(buildHydrateEvents(snapshot));
    const state = blockStore.getSnapshot();
    expect(state.byId["sub_1"]).toBeDefined();
    expect(state.byId["sub_1"].kind).toBe("subagent");
    expect(state.byId["rsn_nested"]).toBeDefined();
  });
});
