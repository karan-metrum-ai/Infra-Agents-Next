import { describe, expect, it } from "vitest";
import { segmentActivityStream } from "./segmentActivityStream";
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

describe("segmentActivityStream", () => {
  it("clusters consecutive sub-agents after thinking blocks", () => {
    const blocks = [
      {
        id: "r1",
        kind: "reasoning",
        content: "Plan",
        status: "complete",
        locked: true,
        created_at: 1,
      },
      tool("tc1"),
      sub("dev-a"),
      sub("dev-b"),
    ] as Block[];

    const segments = segmentActivityStream(blocks);

    expect(segments).toHaveLength(2);
    expect(segments[0]?.kind).toBe("thinking");
    expect(segments[1]).toEqual({
      kind: "subagent_cluster",
      blocks: [blocks[2], blocks[3]],
    });
  });

  it("splits sub-agent clusters around other block kinds", () => {
    const blocks = [
      sub("a"),
      sub("b"),
      {
        id: "txt",
        kind: "text",
        content: "Summary",
        status: "complete",
        locked: true,
        created_at: 1,
      },
      sub("c"),
    ] as Block[];

    const segments = segmentActivityStream(blocks);

    expect(segments).toHaveLength(3);
    expect(segments[0]?.kind).toBe("subagent_cluster");
    expect(segments[1]?.kind).toBe("block");
    expect(segments[2]?.kind).toBe("subagent_cluster");
  });
});
