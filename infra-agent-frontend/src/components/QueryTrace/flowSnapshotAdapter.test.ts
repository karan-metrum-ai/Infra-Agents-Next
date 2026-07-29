import { describe, expect, it } from "vitest";
import {
  buildTraceFromFlowSnapshot,
  deriveQueryStatusFromSnapshot,
  normalizeFlowSnapshot,
  reconcilePlanBundleForCompletedFlow,
} from "./flowSnapshotAdapter";

const completedSnapshot = {
  correlation_id: "flow-98ff8db7-d2a9-4e90-9386-248dd9765dde",
  status: "unknown",
  sessions: [
    {
      agent_id: "operations_manager",
      session_id: "38842d7c-9795-4bf0-8650-4d358c0ac31d",
      initial_query: "generate health report of last 25 days",
      final_response: "Report ready",
      status: "completed",
      created_at: "2026-06-11T10:40:48.916906",
      completed_at: "2026-06-11T10:47:56.457567",
      turns: [
        {
          user_message: "generate health report of last 25 days",
          agent_response: "Report ready",
          reasoning_content: "The\n\n user wants a\n\n health report",
          tool_invocations: [{ tool_name: "delegate_to_agent", status: "completed" }],
          status: "completed",
        },
      ],
    },
    {
      agent_id: "report_generator",
      session_id: "flow-98ff8db7-report_generator-cf5a682e",
      initial_query: "Generate a datacenter health report",
      final_response: "## Report Generated Successfully",
      status: "completed",
      created_at: "2026-06-11T10:41:53.560643",
      completed_at: "2026-06-11T10:47:47.680714",
      turns: [
        {
          user_message: "Generate a datacenter health report",
          agent_response: "## Report Generated Successfully",
          status: "completed",
        },
      ],
    },
  ],
  trace: [
    {
      name: "operations_manager",
      query: "generate health report of last 25 days",
      agent_response: "Report ready",
      reasoning_content: "The\n\n user wants a\n\n health report",
      created_at: "2026-06-11T10:40:49.110786",
      completed_at: "2026-06-11T10:47:56.454942",
      status: "completed",
    },
    {
      name: "report_generator",
      query: "Generate a datacenter health report",
      agent_response: "## Report Generated Successfully",
      created_at: "2026-06-11T10:47:47.678466",
      completed_at: "2026-06-11T10:47:47.678466",
      status: "completed",
    },
    {
      final_response: {
        content: "Report ready",
        created_at: "2026-06-11T10:40:48.916906",
        completed_at: "2026-06-11T10:47:56.457567",
        status: "completed",
      },
    },
  ],
};

describe("flowSnapshotAdapter", () => {
  it("derives completed status when top-level status is unknown", () => {
    expect(deriveQueryStatusFromSnapshot(completedSnapshot)).toBe("completed");
  });

  it("enriches trace rows with session tool invocations", () => {
    const trace = buildTraceFromFlowSnapshot(completedSnapshot);
    const ops = trace.find((row) => row.name === "operations_manager") as {
      tool_calls?: Array<{ tool_name: string }>;
    };

    expect(ops?.tool_calls).toEqual([{ tool_name: "delegate_to_agent", status: "completed" }]);
  });

  it("builds trace from sessions when trace is missing", () => {
    const trace = buildTraceFromFlowSnapshot({
      sessions: completedSnapshot.sessions,
    });

    expect(trace).toHaveLength(3);
    expect(trace[0]).toMatchObject({ name: "operations_manager" });
    expect(trace[1]).toMatchObject({ name: "report_generator" });
    expect(trace[2]).toMatchObject({
      final_response: expect.objectContaining({
        content: "Report ready",
        status: "completed",
      }),
    });
  });

  it("reconciles stale pending plan rows for completed flows", () => {
    const reconciled = reconcilePlanBundleForCompletedFlow(
      {
        correlation_id: "flow-1",
        session_id: "s-1",
        query: "test",
        dag_export: {
          dag_id: "d-1",
          nodes: [
            {
              task_id: "t1",
              goal: "Report health",
              target_agent: "operations_manager",
              status: "completed",
            },
            {
              task_id: "t2",
              goal: "Triage fleet",
              target_agent: "level1_support",
              status: "pending",
            },
          ],
          edges: [],
        },
        verification_result: {
          is_valid: true,
          overall_score: 1,
          node_scores: {},
        },
        status: "pending",
        created_at: "2026-06-11T10:00:00",
      },
      true,
    );

    expect(reconciled?.status).toBe("completed");
    expect(reconciled?.dag_export.nodes[1].status).toBe("completed");
  });

  it("normalizes REST snapshots for Redux hydration", () => {
    const normalized = normalizeFlowSnapshot(completedSnapshot);

    expect(normalized.correlation_id).toBe("flow-98ff8db7-d2a9-4e90-9386-248dd9765dde");
    expect(normalized.status).toBe("completed");
    expect(Array.isArray(normalized.trace)).toBe(true);
    expect(normalized.trace?.length).toBeGreaterThan(0);
  });

  it("synthesizes a named agent row for final_response-only cron snapshots", () => {
    const cronOnly = {
      correlation_id: "cron-exec-1-flow-abc",
      status: "completed",
      sessions: [],
      trace: [
        {
          final_response: {
            session_id: "cron_cron_job_1",
            content: "All onboarded devices healthy in last 15 minutes.",
            created_at: "2026-07-08T10:30:01",
            completed_at: "2026-07-08T10:33:36",
            status: "completed",
          },
        },
      ],
    };

    const trace = buildTraceFromFlowSnapshot(cronOnly);
    const named = trace.filter(
      (row) =>
        row && typeof row === "object" && typeof (row as { name?: string }).name === "string",
    );
    expect(named.length).toBeGreaterThan(0);
    expect((named[0] as { name: string }).name).toBe("operations_manager");
    expect((named[0] as { agent_response: string }).agent_response).toContain("healthy");
  });

  it("synthesizes from session final_response when turns are missing", () => {
    const snapshot = {
      correlation_id: "cron-exec-2-flow-xyz",
      sessions: [
        {
          agent_id: "operations_manager",
          session_id: "cron_job_2",
          initial_query: "Monitor health of onboarded devices",
          final_response: "No issues found.",
          status: "completed",
          created_at: "2026-07-08T11:00:00",
          completed_at: "2026-07-08T11:02:00",
          turns: [],
        },
      ],
      trace: [],
    };
    const trace = buildTraceFromFlowSnapshot(snapshot);
    expect(trace.some((row) => !!(row as { name?: string }).name)).toBe(true);
  });
});
