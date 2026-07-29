import { describe, it, expect } from "vitest";
import { applyAgentFrameInput } from "./agentFrameReducer";
import type { BlockStoreState, TextBlock, ToolBlock, ReasoningBlock } from "./types";

function initialState(): BlockStoreState {
  return {
    session_id: null,
    correlation_id: "c1",
    phase: "executing",
    active_block_id: null,
    todo_list: [],
    interruption: null,
    order: [],
    byId: {},
    last_timestamp: null,
    version: 0,
    aliases: {},
  };
}

describe("agentFrameReducer — schema alignment", () => {
  it('stores a tool block (kind "tool") with output via patch', () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: {
        id: "t1",
        kind: "tool",
        tool_name: "ssh",
        arguments: { host: "a" },
        status: "streaming",
        locked: false,
        created_at: 0,
      } as ToolBlock,
    });
    expect(s.order).toContain("t1");
    expect((s.byId["t1"] as ToolBlock).kind).toBe("tool");

    s = applyAgentFrameInput(s, {
      type: "block_updated",
      block_id: "t1",
      patch: { status: "complete", output: "exit 0" } as Partial<ToolBlock>,
    });
    const tool = s.byId["t1"] as ToolBlock;
    expect(tool.output).toBe("exit 0");
    expect(tool.status).toBe("complete");
  });

  it("preserves a failed tool status when locked", () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: {
        id: "t1",
        kind: "tool",
        tool_name: "ssh",
        arguments: {},
        status: "failed",
        locked: false,
        created_at: 0,
      } as ToolBlock,
    });
    s = applyAgentFrameInput(s, { type: "block_complete", block_id: "t1" });
    expect(s.byId["t1"].status).toBe("failed");
    expect(s.byId["t1"].locked).toBe(true);
  });

  it('normalises "completed" to "complete" on block_complete', () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: {
        id: "t2",
        kind: "text",
        format: "markdown-lite",
        content: "hello",
        status: "streaming",
        locked: false,
        created_at: 0,
      } as TextBlock,
    });
    s = applyAgentFrameInput(s, {
      type: "block_complete",
      block_id: "t2",
      status: "completed" as never,
    });
    expect(s.byId["t2"].status).toBe("complete");
    expect(s.byId["t2"].locked).toBe(true);
  });

  it("nests a child block under its parent via parent_id", () => {
    let s = initialState();
    // Parent sub-agent block.
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: {
        id: "sub1",
        kind: "subagent",
        agent_name: "noc",
        locked: false,
        status: "streaming",
        created_at: 0,
      } as never,
    });
    // Child reasoning block tagged with parent_id.
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: {
        id: "r1",
        kind: "reasoning",
        content: "thinking",
        parent_id: "sub1",
        locked: false,
        status: "streaming",
        created_at: 0,
      } as ReasoningBlock,
    });
    expect(s.byId["r1"].parent_id).toBe("sub1");
    // Both are in the flat store; the SubAgentBlock component filters
    // children by parent_id at render time.
    expect(s.order).toEqual(["sub1", "r1"]);
  });
});

describe("agentFrameReducer — adjacent tool dedup", () => {
  /**
   * Build a tool block_created payload. Defaults match the MOP +
   * specialist emission shape so each test reads as a realistic
   * streaming sequence.
   */
  function toolBlock(
    id: string,
    tool_name: string,
    args: Record<string, unknown>,
    status: ToolBlock["status"] = "streaming",
    parentId?: string,
  ): ToolBlock {
    return {
      id,
      kind: "tool",
      tool_name,
      arguments: args,
      status,
      locked: false,
      created_at: 0,
      parent_id: parentId ?? null,
    };
  }

  it("merges an adjacent duplicate tool tag into the predecessor and " + "records an alias", () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock("tc_AAA", "classify_query", {
        raw: "{'query': 'check health'}",
      }),
    });
    s = applyAgentFrameInput(s, {
      type: "block_complete",
      block_id: "tc_AAA",
    });

    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock("run_BBB", "classify_query", {
        query: "check health",
        conversation_context: "",
      }),
    });

    expect(s.order).toEqual(["tc_AAA"]);
    expect(s.byId["run_BBB"]).toBeUndefined();
    expect(s.aliases["run_BBB"]).toBe("tc_AAA");

    const surviving = s.byId["tc_AAA"] as ToolBlock;
    expect(surviving.arguments).toEqual({
      raw: "{'query': 'check health'}",
      query: "check health",
      conversation_context: "",
    });
    // Terminal status from the orchestrator emission is preserved.
    expect(surviving.status).toBe("complete");
    expect(surviving.locked).toBe(true);
  });

  it("routes a block_complete for the dropped ID to the survivor", () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock("tc_AAA", "classify_query", { raw: "x" }),
    });
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock("run_BBB", "classify_query", { query: "x" }),
    });
    // tc_AAA was not yet completed at merge time, so the survivor is
    // still streaming. The dropped ID's block_complete should lock it.
    expect(s.byId["tc_AAA"].status).toBe("streaming");
    expect(s.aliases["run_BBB"]).toBe("tc_AAA");

    s = applyAgentFrameInput(s, {
      type: "block_complete",
      block_id: "run_BBB",
    });

    expect(s.byId["tc_AAA"].locked).toBe(true);
    expect(s.byId["tc_AAA"].status).toBe("complete");
  });

  it(
    "routes a block_updated for the dropped ID to the survivor and " +
      "enriches a locked tool without downgrading its status",
    () => {
      let s = initialState();
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock("tc_AAA", "classify_query", { raw: "x" }),
      });
      s = applyAgentFrameInput(s, {
        type: "block_complete",
        block_id: "tc_AAA",
      });
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock("run_BBB", "classify_query", { query: "x" }),
      });

      // Specialist sends a streaming partial output for run_BBB after
      // the survivor has already locked to 'complete'.
      s = applyAgentFrameInput(s, {
        type: "block_updated",
        block_id: "run_BBB",
        patch: {
          status: "running",
          output: "partial",
        } as unknown as Partial<ToolBlock>,
      });

      const tool = s.byId["tc_AAA"] as ToolBlock;
      expect(tool.output).toBe("partial");
      // Terminal status preserved; not downgraded back to 'streaming'.
      expect(tool.status).toBe("complete");
      expect(tool.locked).toBe(true);
    },
  );

  it(
    "keeps two same-tag tool blocks separate when an unrelated block " + "sits between them",
    () => {
      let s = initialState();
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock("tc_AAA", "classify_query", { raw: "x" }),
      });
      s = applyAgentFrameInput(s, {
        type: "block_complete",
        block_id: "tc_AAA",
      });

      // A text block lands between the two tool calls — they are no
      // longer adjacent, so the next classify_query stays distinct.
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: {
          id: "txt1",
          kind: "text",
          format: "markdown-lite",
          content: "thinking…",
          status: "streaming",
          locked: false,
          created_at: 0,
        } as TextBlock,
      });

      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock("tc_CCC", "classify_query", {
          query: "second invocation",
        }),
      });

      expect(s.order).toEqual(["tc_AAA", "txt1", "tc_CCC"]);
      expect(s.aliases["tc_CCC"]).toBeUndefined();
    },
  );

  it("does not merge adjacent tool blocks with different tool names", () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock("tc_AAA", "classify_query", { raw: "x" }),
    });
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock("tc_BBB", "execute_plan", { plan: "y" }),
    });

    expect(s.order).toEqual(["tc_AAA", "tc_BBB"]);
    expect(s.aliases).toEqual({});
  });

  it("merges adjacent duplicate tool calls nested under the same parent", () => {
    let s = initialState();
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock(
        "tc_AAA",
        "get_memory_metrics",
        { host: "64ncw54" },
        "streaming",
        "sub_placeholder",
      ),
    });
    s = applyAgentFrameInput(s, {
      type: "block_created",
      block: toolBlock(
        "tc_BBB",
        "get_memory_metrics",
        { host: "64ncw54" },
        "streaming",
        "sub_placeholder",
      ),
    });

    expect(s.order).toEqual(["sub_placeholder", "tc_AAA"]);
    expect(s.byId["tc_BBB"]).toBeUndefined();
    expect(s.aliases["tc_BBB"]).toBe("tc_AAA");
  });

  it(
    "does not merge same-parent tool blocks when a different sibling " + "sits between them",
    () => {
      let s = initialState();
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock(
          "tc_AAA",
          "get_memory_metrics",
          { host: "a" },
          "streaming",
          "sub_placeholder",
        ),
      });
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock(
          "tc_BBB",
          "get_gpu_metrics",
          { host: "a" },
          "streaming",
          "sub_placeholder",
        ),
      });
      s = applyAgentFrameInput(s, {
        type: "block_created",
        block: toolBlock(
          "tc_CCC",
          "get_memory_metrics",
          { host: "b" },
          "streaming",
          "sub_placeholder",
        ),
      });

      expect(s.order).toEqual(["sub_placeholder", "tc_AAA", "tc_BBB", "tc_CCC"]);
      expect(s.aliases).toEqual({});
    },
  );
});
