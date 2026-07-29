/**
 * Port of the Vite app's `store/flowStream/flowStreamSlice.test.ts`.
 *
 * No test cases were dropped: the original spec file only ever imported
 * the "original flow management" actions (`setConnected`, `setPlanBundle`,
 * `applyFlowDeltaOps`, `resetSession`, etc.) — it never imported or
 * exercised the dead v2 block-streaming reducers (`applyAgentFrame`,
 * `blockCreated`, `blockUpdated`, `blockLocked`, `streamStarted/Connected/
 * Error/Closed`, `rememberEventId`, `resetStream`) that were dropped from
 * `flowStreamSlice.ts`, nor the confirmed-dead `activeConversation*`
 * actions. That absence is itself corroborating evidence those reducers
 * were dead scaffolding. Only the `INITIAL` state fixture below was
 * trimmed to match the ported (smaller) `FlowStreamState` shape.
 */
import { describe, it, expect } from "vitest";
import reducer, {
  setConnected,
  setCorrelationId,
  setSessionId,
  setQueryStatus,
  setQueryResponse,
  setQueryReasoning,
  setError,
  setLastSeq,
  setPlanBundle,
  patchPlanBundle,
  addPhase,
  updateNodeStatus,
  setFlowsList,
  addFlowToList,
  addTelemetry,
  setViewingQuery,
  applyFlowDeltaOps,
  resetSession,
  resetFullState,
  clearFlowsList,
  type FlowStreamState,
} from "./flowStreamSlice";
import type { FlowListItem, PlanBundle } from "../../components/QueryTrace/flowPayload.types";

const TEAM_A = "1001";
const TEAM_B = "2001";

function flowsFor(teamId: string, flows: FlowListItem[], replace?: boolean) {
  return { teamId, flows, replace };
}

function flowForList(flow: FlowListItem, teamId = TEAM_A) {
  return { teamId, flow };
}

const INITIAL: FlowStreamState = {
  connected: false,
  error: null,
  correlationId: null,
  sessionId: null,
  queryStatus: "idle",
  queryResponse: null,
  queryReasoning: null,
  lastSeq: null,
  planBundle: null,
  flowData: null,
  phases: [],
  telemetry: {},
  flowsList: [],
  flowsListTeamId: null,
  flowsListNextCursor: null,
  flowsListLoading: false,
  viewingQuery: null,
};

const makePlanBundle = (): PlanBundle => ({
  correlation_id: "corr-1",
  session_id: "sess-1",
  query: "Test Plan",
  dag_export: {
    dag_id: "dag-1",
    nodes: [
      {
        task_id: "task-1",
        goal: "Check server health",
        target_agent: "monitoring-agent",
        status: "pending",
        result: undefined,
        error: undefined,
      },
    ],
    edges: [],
  },
  verification_result: {
    is_valid: true,
    overall_score: 1.0,
    node_scores: { "task-1": 1.0 },
  },
  status: "pending",
  created_at: "2026-04-13T12:00:00Z",
});

describe("flowStreamSlice basic reducers", () => {
  it("returns initial state", () => {
    expect(reducer(undefined, { type: "" })).toEqual(INITIAL);
  });

  it("setConnected", () => {
    const s = reducer(INITIAL, setConnected(true));
    expect(s.connected).toBe(true);
  });

  it("setCorrelationId", () => {
    const s = reducer(INITIAL, setCorrelationId("c-1"));
    expect(s.correlationId).toBe("c-1");
  });

  it("setSessionId", () => {
    const s = reducer(INITIAL, setSessionId("s-1"));
    expect(s.sessionId).toBe("s-1");
  });

  it("setQueryStatus", () => {
    const s = reducer(INITIAL, setQueryStatus("processing"));
    expect(s.queryStatus).toBe("processing");
  });

  it("setQueryResponse", () => {
    const s = reducer(INITIAL, setQueryResponse("result text"));
    expect(s.queryResponse).toBe("result text");
  });

  it("setQueryReasoning", () => {
    const s = reducer(INITIAL, setQueryReasoning("because..."));
    expect(s.queryReasoning).toBe("because...");
  });

  it("setError", () => {
    const s = reducer(INITIAL, setError("timeout"));
    expect(s.error).toBe("timeout");
  });

  it("setLastSeq", () => {
    const s = reducer(INITIAL, setLastSeq("seq-42"));
    expect(s.lastSeq).toBe("seq-42");
  });

  it("setViewingQuery", () => {
    const s = reducer(INITIAL, setViewingQuery("q-1"));
    expect(s.viewingQuery).toBe("q-1");
  });
});

describe("flowStreamSlice plan operations", () => {
  it("setPlanBundle stores the bundle", () => {
    const bundle = makePlanBundle();
    const s = reducer(INITIAL, setPlanBundle(bundle));
    expect(s.planBundle?.correlation_id).toBe("corr-1");
  });

  it("patchPlanBundle merges into existing", () => {
    const bundle = makePlanBundle();
    let s = reducer(INITIAL, setPlanBundle(bundle));
    s = reducer(s, patchPlanBundle({ query: "Patched query" }));
    expect(s.planBundle?.query).toBe("Patched query");
    expect(s.planBundle?.correlation_id).toBe("corr-1");
  });

  it("patchPlanBundle is a no-op without existing bundle", () => {
    const s = reducer(INITIAL, patchPlanBundle({ query: "x" }));
    expect(s.planBundle).toBeNull();
  });

  it("updateNodeStatus updates node by taskId", () => {
    const bundle = makePlanBundle();
    let s = reducer(INITIAL, setPlanBundle(bundle));
    s = reducer(s, updateNodeStatus({ taskId: "task-1", status: "completed", result: "done" }));
    const node = s.planBundle!.dag_export.nodes[0];
    expect(node.status).toBe("completed");
    expect(node.result).toBe("done");
  });

  it("updateNodeStatus is a no-op without plan", () => {
    const s = reducer(INITIAL, updateNodeStatus({ taskId: "x", status: "running" }));
    expect(s.planBundle).toBeNull();
  });
});

describe("flowStreamSlice flow lists", () => {
  const flow1: FlowListItem = {
    correlation_id: "c1",
    session_id: "s1",
    query: "test",
    status: "completed",
    created_at: "2026-04-13T12:00:00Z",
    completed_at: "2026-04-13T12:01:00Z",
  };
  const flow2: FlowListItem = {
    correlation_id: "c2",
    session_id: "s2",
    query: "test2",
    status: "running",
    created_at: "2026-04-13T13:00:00Z",
    completed_at: null,
  };

  it("setFlowsList deduplicates by correlation_id", () => {
    const s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1, flow1, flow2])));
    expect(s.flowsList).toHaveLength(2);
  });

  it("addFlowToList prepends new flow", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    s = reducer(s, addFlowToList(flowForList(flow2)));
    expect(s.flowsList).toHaveLength(2);
    expect(s.flowsList[0].correlation_id).toBe("c2");
  });

  it("addFlowToList replaces existing with same id", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    const updated = { ...flow1, status: "error" };
    s = reducer(s, addFlowToList(flowForList(updated)));
    expect(s.flowsList).toHaveLength(1);
    expect(s.flowsList[0].status).toBe("error");
  });

  it("setFlowsList does NOT wipe populated list with empty response", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1, flow2])));
    expect(s.flowsList).toHaveLength(2);
    s = reducer(s, setFlowsList(flowsFor(TEAM_A, [])));
    expect(s.flowsList).toHaveLength(2);
    expect(s.flowsList[0].correlation_id).toBe("c2");
  });

  it("setFlowsList allows setting list from empty state", () => {
    const s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    expect(s.flowsList).toHaveLength(1);
    expect(s.flowsList[0].correlation_id).toBe("c1");
    expect(s.flowsListTeamId).toBe(TEAM_A);
  });

  it("setFlowsList merge-upserts: updates existing and adds new", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    const updatedFlow1 = { ...flow1, status: "error" };
    s = reducer(s, setFlowsList(flowsFor(TEAM_A, [updatedFlow1, flow2])));
    expect(s.flowsList).toHaveLength(2);
    const found1 = s.flowsList.find((f) => f.correlation_id === "c1");
    expect(found1?.status).toBe("error");
    const found2 = s.flowsList.find((f) => f.correlation_id === "c2");
    expect(found2).toBeDefined();
  });

  it("setFlowsList does not downgrade completed status on poll merge", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    const stalePoll = {
      ...flow1,
      status: "pending",
      completed_at: null,
      query: "Collect CPU metrics for host x (execution_mode=direct_metrics)",
    };
    s = reducer(s, setFlowsList(flowsFor(TEAM_A, [stalePoll])));
    const found = s.flowsList.find((f) => f.correlation_id === "c1");
    expect(found?.status).toBe("completed");
    expect(found?.query).toBe("test");
    expect(found?.completed_at).toBe("2026-04-13T12:01:00Z");
  });

  it("setFlowsList preserves flows not in incoming (merge behavior)", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1, flow2])));
    const updatedFlow2 = { ...flow2, status: "completed" };
    s = reducer(s, setFlowsList(flowsFor(TEAM_A, [updatedFlow2])));
    expect(s.flowsList).toHaveLength(2);
    const found1 = s.flowsList.find((f) => f.correlation_id === "c1");
    expect(found1).toBeDefined();
    const found2 = s.flowsList.find((f) => f.correlation_id === "c2");
    expect(found2?.status).toBe("completed");
  });

  it("setFlowsList replace union-merges local-only flows", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1, flow2])));
    s = reducer(s, setFlowsList(flowsFor(TEAM_A, [flow2], true)));
    expect(s.flowsList).toHaveLength(2);
    expect(s.flowsList.find((f) => f.correlation_id === "c1")).toBeDefined();
    expect(s.flowsList.find((f) => f.correlation_id === "c2")).toBeDefined();
  });

  it("setFlowsList ignores stale cluster responses", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    s = reducer(s, setFlowsList(flowsFor(TEAM_B, [flow2], true)));
    expect(s.flowsList).toHaveLength(1);
    expect(s.flowsList[0].correlation_id).toBe("c1");
    expect(s.flowsListTeamId).toBe(TEAM_A);
  });

  it("addFlowToList ignores stale cluster rows", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    s = reducer(s, addFlowToList(flowForList(flow2, TEAM_B)));
    expect(s.flowsList).toHaveLength(1);
    expect(s.flowsList[0].correlation_id).toBe("c1");
  });

  it("clearFlowsList resets cluster ownership", () => {
    let s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [flow1])));
    s = reducer(s, clearFlowsList());
    expect(s.flowsList).toHaveLength(0);
    expect(s.flowsListTeamId).toBeNull();
  });

  it("setFlowsList sorts by created_at descending", () => {
    const older: FlowListItem = {
      correlation_id: "c-old",
      session_id: "s-old",
      query: "old",
      status: "completed",
      created_at: "2026-01-01T00:00:00Z",
      completed_at: null,
    };
    const newer: FlowListItem = {
      correlation_id: "c-new",
      session_id: "s-new",
      query: "new",
      status: "active",
      created_at: "2026-06-01T00:00:00Z",
      completed_at: null,
    };
    const s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [older, newer])));
    expect(s.flowsList[0].correlation_id).toBe("c-new");
    expect(s.flowsList[1].correlation_id).toBe("c-old");
  });

  it("setFlowsList caps at 500 entries", () => {
    const manyFlows: FlowListItem[] = Array.from({ length: 250 }, (_, i) => ({
      correlation_id: `c-${i}`,
      session_id: `s-${i}`,
      query: `query ${i}`,
      status: "completed",
      created_at: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T${String(
        Math.floor(i / 28),
      ).padStart(2, "0")}:00:00Z`,
      completed_at: null,
    }));
    const s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, manyFlows)));
    expect(s.flowsList.length).toBeLessThanOrEqual(500);
  });

  it("setFlowsList handles flows with null created_at gracefully", () => {
    const noDate: FlowListItem = {
      correlation_id: "c-nodate",
      session_id: "s-nodate",
      query: "no date",
      status: "active",
      created_at: null,
      completed_at: null,
    };
    const s = reducer(INITIAL, setFlowsList(flowsFor(TEAM_A, [noDate, flow1])));
    expect(s.flowsList).toHaveLength(2);
    expect(s.flowsList[0].correlation_id).toBe("c1");
    expect(s.flowsList[1].correlation_id).toBe("c-nodate");
  });
});

describe("flowStreamSlice phases and telemetry", () => {
  it("addPhase appends phase event", () => {
    const phase = {
      phase_name: "planning",
      phase_status: "done",
      timestamp: "2026-01-01T00:00:00Z",
    };
    const s = reducer(INITIAL, addPhase(phase));
    expect(s.phases).toHaveLength(1);
  });

  it("addTelemetry groups by task_id", () => {
    const entry = {
      task_id: "task-1",
      event_type: "tool_call",
      timestamp: "2026-01-01T00:00:00Z",
    };
    let s = reducer(INITIAL, addTelemetry(entry));
    expect(s.telemetry["task-1"]).toHaveLength(1);

    s = reducer(s, addTelemetry({ ...entry, duration_ms: 200 }));
    expect(s.telemetry["task-1"]).toHaveLength(2);
  });

  it("addTelemetry uses _global when no task_id", () => {
    const entry = { event_type: "latency", timestamp: "2026-01-01T00:00:00Z" };
    const s = reducer(INITIAL, addTelemetry(entry));
    expect(s.telemetry["_global"]).toHaveLength(1);
  });
});

describe("flowStreamSlice applyFlowDeltaOps", () => {
  it("phase.add appends a phase", () => {
    const s = reducer(
      INITIAL,
      applyFlowDeltaOps([
        {
          op: "phase.add",
          phase: { phase_name: "exec", phase_status: "started", timestamp: "2026-01-01T00:00:00Z" },
        },
      ]),
    );
    expect(s.phases).toHaveLength(1);
  });

  it("plan.set replaces the plan bundle", () => {
    const bundle = makePlanBundle();
    const s = reducer(INITIAL, applyFlowDeltaOps([{ op: "plan.set", plan: bundle }]));
    expect(s.planBundle?.correlation_id).toBe("corr-1");
  });

  it("plan.patch merges fields into plan", () => {
    const bundle = makePlanBundle();
    let s = reducer(INITIAL, setPlanBundle(bundle));
    s = reducer(
      s,
      applyFlowDeltaOps([{ op: "plan.patch", fields: { query: "Patched via delta" } }]),
    );
    expect(s.planBundle?.query).toBe("Patched via delta");
  });

  it("task.patch updates a node by task_id", () => {
    const bundle = makePlanBundle();
    let s = reducer(INITIAL, setPlanBundle(bundle));
    s = reducer(
      s,
      applyFlowDeltaOps([{ op: "task.patch", task_id: "task-1", fields: { status: "running" } }]),
    );
    expect(s.planBundle!.dag_export.nodes[0].status).toBe("running");
  });

  it("final.set with completed status", () => {
    const s = reducer(
      INITIAL,
      applyFlowDeltaOps([
        {
          op: "final.set",
          status: "completed",
          final_response: "All done",
          reasoning: "Because",
        },
      ]),
    );
    expect(s.queryStatus).toBe("completed");
    expect(s.queryResponse).toBe("All done");
    expect(s.queryReasoning).toBe("Because");
  });

  it("final.set with error status", () => {
    const s = reducer(
      INITIAL,
      applyFlowDeltaOps([{ op: "final.set", status: "error", error: "Timeout" }]),
    );
    expect(s.queryStatus).toBe("error");
    expect(s.error).toBe("Timeout");
  });

  it("unknown op is silently ignored", () => {
    const s = reducer(INITIAL, applyFlowDeltaOps([{ op: "unknown.op" }]));
    expect(s).toEqual(INITIAL);
  });
});

describe("flowStreamSlice reset actions", () => {
  it("resetSession preserves connected and flowsList", () => {
    let s = reducer(INITIAL, setConnected(true));
    s = reducer(
      s,
      setFlowsList(flowsFor(TEAM_A, [{ correlation_id: "c1", session_id: "s1" } as FlowListItem])),
    );
    s = reducer(s, setCorrelationId("c-active"));
    s = reducer(s, setQueryStatus("processing"));

    s = reducer(s, resetSession());

    expect(s.connected).toBe(true);
    expect(s.flowsList).toHaveLength(1);
    expect(s.correlationId).toBeNull();
    expect(s.queryStatus).toBe("idle");
    expect(s.phases).toEqual([]);
    expect(s.telemetry).toEqual({});
  });

  it("resetFullState returns to initial", () => {
    let s = reducer(INITIAL, setConnected(true));
    s = reducer(s, setError("fail"));
    s = reducer(s, resetFullState());
    expect(s).toEqual(INITIAL);
  });
});
