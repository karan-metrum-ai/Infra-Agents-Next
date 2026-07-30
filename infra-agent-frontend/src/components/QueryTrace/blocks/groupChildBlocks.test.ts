import { describe, expect, it } from "vitest";
import { groupChildBlocks } from "./groupChildBlocks";
import type { Block, SubAgentBlock } from "../blockStream/types";

function sub(id: string): SubAgentBlock {
  return {
    id,
    kind: "subagent",
    agent_name: id,
    content: `Triage device ${id}`,
    status: "streaming",
    locked: false,
    created_at: Date.now(),
  };
}

function tool(id: string): Block {
  return {
    id,
    kind: "tool",
    tool_name: "triage_devices_parallel",
    arguments: {},
    status: "complete",
    locked: true,
    created_at: Date.now(),
  };
}

describe("groupChildBlocks", () => {
  it("groups consecutive sub-agent blocks into one cluster segment", () => {
    const blocks = [tool("tc1"), sub("dev-a"), sub("dev-b"), sub("dev-c")];

    const segments = groupChildBlocks(blocks);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ kind: "block", block: blocks[0] });
    expect(segments[1]).toEqual({
      kind: "subagent_cluster",
      blocks: [blocks[1], blocks[2], blocks[3]],
    });
  });

  it("splits sub-agent runs around other block kinds", () => {
    const blocks = [sub("a"), sub("b"), tool("tc1"), sub("c")];
    const segments = groupChildBlocks(blocks);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.kind).toBe("subagent_cluster");
    expect(segments[1]?.kind).toBe("block");
    expect(segments[2]?.kind).toBe("subagent_cluster");
  });
});
