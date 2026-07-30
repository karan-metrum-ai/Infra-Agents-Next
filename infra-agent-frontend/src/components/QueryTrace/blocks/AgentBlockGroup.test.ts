import { describe, expect, it } from "vitest";
import { getRenderableBlocks } from "./AgentBlockGroup";
import type { AgentGroup } from "../groupBlocksByAgent";
import type { BlockStoreState } from "../blockStream/types";

function emptySnapshot(): BlockStoreState {
  return {
    session_id: null,
    correlation_id: "flow-1",
    phase: "completed",
    active_block_id: null,
    todo_list: [],
    interruption: null,
    order: [],
    byId: {},
    last_timestamp: null,
    version: 1,
    aliases: {},
  };
}

describe("getRenderableBlocks", () => {
  it("converts subagent content into a markdown text block", () => {
    const group: AgentGroup = {
      id: "group-sub-1",
      agentName: "level1_support",
      displayName: "Level 1 Support",
      role: "primary",
      blocks: [
        {
          id: "sub-1",
          kind: "subagent",
          agent_name: "level1_support",
          content: "## CDU Triage Findings\n\n| Device | Status |",
          status: "complete",
          locked: true,
          created_at: 100,
        },
      ],
    };
    const snapshot: BlockStoreState = {
      ...emptySnapshot(),
      order: ["sub-1", "tool-1"],
      byId: {
        "sub-1": group.blocks[0],
        "tool-1": {
          id: "tool-1",
          kind: "tool",
          tool_name: "get_cooling_topology",
          arguments: {},
          status: "complete",
          locked: true,
          created_at: 200,
          parent_id: "sub-1",
        },
      },
    };

    const blocks = getRenderableBlocks(group, snapshot);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].kind).toBe("tool");
    expect(blocks[1]).toMatchObject({
      id: "sub-1-response",
      kind: "text",
      format: "markdown-lite",
      content: "## CDU Triage Findings\n\n| Device | Status |",
    });
  });

  it("skips synthetic text when an identical text child already exists", () => {
    const group: AgentGroup = {
      id: "group-sub-2",
      agentName: "liquid_cooling_agent",
      displayName: "Liquid Cooling Specialist",
      role: "subagent",
      blocks: [
        {
          id: "sub-2",
          kind: "subagent",
          agent_name: "liquid_cooling_agent",
          content: "## Summary",
          status: "complete",
          locked: true,
          created_at: 100,
        },
      ],
    };
    const snapshot: BlockStoreState = {
      ...emptySnapshot(),
      order: ["sub-2", "text-1"],
      byId: {
        "sub-2": group.blocks[0],
        "text-1": {
          id: "text-1",
          kind: "text",
          format: "markdown-lite",
          content: "## Summary",
          status: "complete",
          locked: true,
          created_at: 200,
          parent_id: "sub-2",
        },
      },
    };

    const blocks = getRenderableBlocks(group, snapshot);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].id).toBe("text-1");
  });

  it("keeps parallel device sub-agents as tiles instead of text blocks", () => {
    const group: AgentGroup = {
      id: "group-sub-3",
      agentName: "level1_support",
      displayName: "Level 1 Support",
      role: "primary",
      blocks: [
        {
          id: "sub-l1",
          kind: "subagent",
          agent_name: "level1_support",
          content: "",
          status: "streaming",
          locked: false,
          created_at: 100,
        },
      ],
    };
    const snapshot: BlockStoreState = {
      ...emptySnapshot(),
      order: ["sub-l1", "sub-dev-a", "sub-dev-b"],
      byId: {
        "sub-l1": group.blocks[0],
        "sub-dev-a": {
          id: "sub-dev-a",
          kind: "subagent",
          agent_name: "dell-r740-rr-01",
          content: "status=warning, findings=2, tools=0, duration=15773ms",
          status: "complete",
          locked: true,
          created_at: 200,
          parent_id: "sub-l1",
        },
        "sub-dev-b": {
          id: "sub-dev-b",
          kind: "subagent",
          agent_name: "dell-r740-rr-02",
          content: "Triage compute device dell-r740-rr-02",
          status: "streaming",
          locked: false,
          created_at: 300,
          parent_id: "sub-l1",
        },
      },
    };

    const blocks = getRenderableBlocks(group, snapshot);

    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.kind === "subagent")).toBe(true);
    expect(blocks.map((block) => block.id)).toEqual(["sub-dev-a", "sub-dev-b"]);
  });
});
