import { describe, expect, it } from "vitest";
import {
  agentHasRenderableV2Coverage,
  countNamedTraceEntries,
  getSupplementalAgents,
  isSpecialistAgentName,
  mergeDelegatedTaskNodes,
  mergeFlowPayload,
} from "./flowTraceMerge";
import type { TaskNode } from "./flowPayload.types";
import type { ParsedAgentTrace } from "./traceDataParser";
import type { BlockStoreState } from "./blockStream/types";

describe("flowTraceMerge", () => {
  it("countNamedTraceEntries ignores final_response rows", () => {
    const trace = [
      { name: "operations_manager", query: "q" },
      { final_response: { content: "done" } },
      { name: "level1_support", query: "q" },
    ];
    expect(countNamedTraceEntries(trace)).toBe(2);
  });

  it("mergeFlowPayload keeps richer existing trace", () => {
    const existing = {
      correlation_id: "flow-1",
      trace: [{ name: "operations_manager" }, { name: "level1_support" }],
    };
    const incoming = {
      correlation_id: "flow-1",
      trace: [{ name: "operations_manager" }],
      status: "completed",
    };
    const merged = mergeFlowPayload(existing, incoming);
    expect(merged.status).toBe("completed");
    expect(countNamedTraceEntries(merged.trace)).toBe(2);
  });

  it("mergeFlowPayload prefers incoming when it has more agents", () => {
    const existing = {
      trace: [{ name: "operations_manager" }],
    };
    const incoming = {
      trace: [{ name: "operations_manager" }, { name: "liquid_cooling_agent" }],
    };
    const merged = mergeFlowPayload(existing, incoming);
    expect(countNamedTraceEntries(merged.trace)).toBe(2);
  });

  it("getSupplementalAgents returns agents missing from block store", () => {
    const agents: ParsedAgentTrace[] = [
      {
        name: "operations_manager",
        query: "q",
        agent_response: "",
        reasoning_content: [],
        created_at: "",
        completed_at: "",
        status: "completed",
      },
      {
        name: "level1_support",
        query: "q",
        agent_response: "",
        reasoning_content: [],
        created_at: "",
        completed_at: "",
        status: "completed",
      },
      {
        name: "liquid_cooling_agent",
        query: "q",
        agent_response: "",
        reasoning_content: [],
        created_at: "",
        completed_at: "",
        status: "completed",
      },
    ];
    const blockSnapshot: BlockStoreState = {
      session_id: null,
      correlation_id: "flow-1",
      phase: "completed",
      active_block_id: null,
      todo_list: [],
      interruption: null,
      order: ["sub-1"],
      byId: {
        "sub-1": {
          id: "sub-1",
          kind: "subagent",
          agent_name: "level1_support",
          status: "complete",
          locked: true,
          created_at: 1,
        },
      },
      last_timestamp: null,
      version: 1,
      aliases: {},
    };
    const supplemental = getSupplementalAgents(agents, blockSnapshot);
    expect(supplemental.map((a) => a.name)).toEqual(["liquid_cooling_agent"]);
    expect(agentHasRenderableV2Coverage("level1_support", blockSnapshot)).toBe(true);
  });

  it("getSupplementalAgents excludes agents with renderable v2 blocks", () => {
    const agents: ParsedAgentTrace[] = [
      {
        name: "level1_support",
        query: "q",
        agent_response: "",
        reasoning_content: [],
        created_at: "",
        completed_at: "",
        status: "completed",
      },
    ];
    const blockSnapshot: BlockStoreState = {
      session_id: null,
      correlation_id: "flow-1",
      phase: "completed",
      active_block_id: null,
      todo_list: [],
      interruption: null,
      order: ["sub-1", "tool-1"],
      byId: {
        "sub-1": {
          id: "sub-1",
          kind: "subagent",
          agent_name: "level1_support",
          status: "complete",
          locked: true,
          created_at: 1,
        },
        "tool-1": {
          id: "tool-1",
          kind: "tool",
          tool_name: "check_health",
          arguments: {},
          status: "complete",
          locked: true,
          created_at: 2,
          parent_id: "sub-1",
        },
      },
      last_timestamp: null,
      version: 1,
      aliases: {},
    };
    expect(getSupplementalAgents(agents, blockSnapshot)).toEqual([]);
    expect(agentHasRenderableV2Coverage("level1_support", blockSnapshot)).toBe(true);
  });

  it("isSpecialistAgentName recognizes runtime specialist agents", () => {
    expect(isSpecialistAgentName("liquid_cooling_agent")).toBe(true);
    expect(isSpecialistAgentName("systems_admin_hw")).toBe(true);
    expect(isSpecialistAgentName("level1_support")).toBe(false);
    expect(isSpecialistAgentName("dell-r740-rr-01")).toBe(false);
  });

  it("mergeDelegatedTaskNodes adds specialists from the block stream", () => {
    const planNodes: TaskNode[] = [
      {
        task_id: "task-1",
        goal: "Triage cooling alert",
        target_agent: "level1_support",
        status: "executing",
      },
    ];
    const blockSnapshot: BlockStoreState = {
      session_id: null,
      correlation_id: "flow-1",
      phase: "executing",
      active_block_id: null,
      todo_list: [],
      interruption: null,
      order: ["sub-lc"],
      byId: {
        "sub-lc": {
          id: "sub-lc",
          kind: "subagent",
          agent_name: "liquid_cooling_agent",
          content: "Investigate CDU pressure drop",
          status: "streaming",
          locked: false,
          created_at: 1,
        },
      },
      last_timestamp: null,
      version: 1,
      aliases: {},
    };

    const merged = mergeDelegatedTaskNodes(planNodes, blockSnapshot);
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({
      target_agent: "liquid_cooling_agent",
      goal: "Investigate CDU pressure drop",
      status: "executing",
    });
  });

  it('mergeDelegatedTaskNodes skips the unresolved "agent" placeholder', () => {
    const planNodes: TaskNode[] = [
      {
        task_id: "task-1",
        goal: "Collect memory metrics",
        target_agent: "level1_support",
        status: "pending",
      },
    ];
    const blockSnapshot: BlockStoreState = {
      session_id: null,
      correlation_id: "flow-1",
      phase: "executing",
      active_block_id: null,
      todo_list: [],
      interruption: null,
      order: ["sub-orphan"],
      byId: {
        "sub-orphan": {
          id: "sub-orphan",
          kind: "subagent",
          agent_name: "agent",
          status: "streaming",
          locked: false,
          created_at: 1,
        },
      },
      last_timestamp: null,
      version: 1,
      aliases: {},
    };

    expect(mergeDelegatedTaskNodes(planNodes, blockSnapshot)).toEqual(planNodes);
  });

  it("mergeDelegatedTaskNodes skips device triage subagents", () => {
    const blockSnapshot: BlockStoreState = {
      session_id: null,
      correlation_id: "flow-1",
      phase: "executing",
      active_block_id: null,
      todo_list: [],
      interruption: null,
      order: ["sub-device"],
      byId: {
        "sub-device": {
          id: "sub-device",
          kind: "subagent",
          agent_name: "dell-r740-rr-01",
          content: "Triage server device dell-r740-rr-01",
          status: "streaming",
          locked: false,
          created_at: 1,
        },
      },
      last_timestamp: null,
      version: 1,
      aliases: {},
    };

    expect(mergeDelegatedTaskNodes([], blockSnapshot)).toEqual([]);
  });
});
