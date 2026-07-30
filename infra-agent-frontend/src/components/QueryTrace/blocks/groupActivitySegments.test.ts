/**
 * Tests for groupActivitySegments — activity segment grouper.
 */
import { describe, expect, it } from "vitest";
import {
  groupActivitySegments,
  computeThinkingMeta,
  type ActivitySegment,
} from "./groupActivitySegments";
import type {
  Block,
  ReasoningBlock,
  ToolBlock,
  TextBlock,
  SubAgentBlock,
  TodoBlock,
} from "../blockStream/types";

function makeReasoning(id: string, overrides: Partial<ReasoningBlock> = {}): ReasoningBlock {
  return {
    id,
    kind: "reasoning",
    content: `reasoning ${id}`,
    status: "complete",
    locked: true,
    created_at: 1000,
    ...overrides,
  };
}

function makeTool(id: string, overrides: Partial<ToolBlock> = {}): ToolBlock {
  return {
    id,
    kind: "tool",
    tool_name: "test_tool",
    arguments: {},
    status: "complete",
    locked: true,
    created_at: 1000,
    ...overrides,
  };
}

function makeText(id: string, overrides: Partial<TextBlock> = {}): TextBlock {
  return {
    id,
    kind: "text",
    format: "markdown-lite",
    content: `text ${id}`,
    status: "complete",
    locked: true,
    created_at: 1000,
    ...overrides,
  };
}

function makeSubAgent(id: string, overrides: Partial<SubAgentBlock> = {}): SubAgentBlock {
  return {
    id,
    kind: "subagent",
    agent_name: "test_agent",
    status: "complete",
    locked: true,
    created_at: 1000,
    ...overrides,
  };
}

function makeTodo(id: string): TodoBlock {
  return {
    id,
    kind: "todo",
    items: [],
    status: "complete",
    locked: true,
    created_at: 1000,
  };
}

describe("groupActivitySegments", () => {
  it("returns empty for empty blocks", () => {
    expect(groupActivitySegments([])).toEqual([]);
  });

  it("groups consecutive reasoning blocks into thinking", () => {
    const blocks: Block[] = [makeReasoning("r1"), makeReasoning("r2")];
    const segments = groupActivitySegments(blocks);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("thinking");
    expect((segments[0] as Extract<ActivitySegment, { kind: "thinking" }>).blocks).toHaveLength(2);
  });

  it("groups reasoning + tool + todo into one thinking segment", () => {
    const blocks: Block[] = [makeReasoning("r1"), makeTool("t1"), makeTodo("td1")];
    const segments = groupActivitySegments(blocks);
    expect(segments).toHaveLength(1);
    expect(segments[0].kind).toBe("thinking");
    expect((segments[0] as Extract<ActivitySegment, { kind: "thinking" }>).blocks).toHaveLength(3);
  });

  it("splits text blocks into response segments", () => {
    const blocks: Block[] = [makeText("txt1"), makeText("txt2")];
    const segments = groupActivitySegments(blocks);
    expect(segments).toHaveLength(2);
    expect(segments[0].kind).toBe("response");
    expect(segments[1].kind).toBe("response");
  });

  it("splits subagent blocks into delegation segments", () => {
    const blocks: Block[] = [makeSubAgent("sa1"), makeSubAgent("sa2")];
    const segments = groupActivitySegments(blocks);
    expect(segments).toHaveLength(2);
    expect(segments[0].kind).toBe("delegation");
    expect(segments[1].kind).toBe("delegation");
  });

  it("interleaves thinking and response correctly", () => {
    const blocks: Block[] = [
      makeReasoning("r1"),
      makeTool("t1"),
      makeText("txt1"),
      makeReasoning("r2"),
      makeText("txt2"),
    ];
    const segments = groupActivitySegments(blocks);
    expect(segments).toHaveLength(4);
    expect(segments[0].kind).toBe("thinking");
    expect(segments[1].kind).toBe("response");
    expect(segments[2].kind).toBe("thinking");
    expect(segments[3].kind).toBe("response");
  });

  it("preserves block order within thinking segments", () => {
    const blocks: Block[] = [makeReasoning("r1"), makeTool("t1"), makeReasoning("r2")];
    const segments = groupActivitySegments(blocks);
    const thinking = segments[0] as Extract<ActivitySegment, { kind: "thinking" }>;
    expect(thinking.blocks.map((b) => b.id)).toEqual(["r1", "t1", "r2"]);
  });
});

describe("computeThinkingMeta", () => {
  it("detects streaming state", () => {
    const segment: Extract<ActivitySegment, { kind: "thinking" }> = {
      kind: "thinking",
      blocks: [makeReasoning("r1", { status: "streaming", locked: false })],
      startedAt: 1000,
    };
    const meta = computeThinkingMeta(segment);
    expect(meta.isStreaming).toBe(true);
    expect(meta.stepCount).toBe(1);
    expect(meta.hasFailed).toBe(false);
  });

  it("detects failed state", () => {
    const segment: Extract<ActivitySegment, { kind: "thinking" }> = {
      kind: "thinking",
      blocks: [makeTool("t1", { status: "failed" })],
      startedAt: 1000,
    };
    const meta = computeThinkingMeta(segment);
    expect(meta.hasFailed).toBe(true);
    expect(meta.isStreaming).toBe(false);
  });

  it("computes duration for completed segments", () => {
    const segment: Extract<ActivitySegment, { kind: "thinking" }> = {
      kind: "thinking",
      blocks: [makeReasoning("r1", { created_at: 1000 }), makeTool("t1", { created_at: 3000 })],
      startedAt: 1000,
    };
    const meta = computeThinkingMeta(segment);
    expect(meta.durationMs).toBe(2000);
    expect(meta.isStreaming).toBe(false);
  });

  it("computes positive duration even when timestamps equal", () => {
    const segment: Extract<ActivitySegment, { kind: "thinking" }> = {
      kind: "thinking",
      blocks: [makeReasoning("r1", { created_at: 1000 })],
      startedAt: 1000,
    };
    const meta = computeThinkingMeta(segment);
    expect(meta.durationMs).toBe(0);
  });
});
