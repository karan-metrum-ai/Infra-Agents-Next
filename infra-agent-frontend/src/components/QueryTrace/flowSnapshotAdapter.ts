/**
 * Adapts REST flow snapshots for the QueryTrace UI.
 *
 * Completed flows are loaded from GET /actions/flows/{correlationId}/snapshot
 * (legacy fallback: GET /flows/{correlationId}). The payload
 * may report status "unknown" while sessions are completed, omit tool
 * calls on trace rows, or only expose rich turn data under sessions.
 */

import type { FlowPayload, PlanBundle, QueryStatus } from "./flowPayload.types";

interface FlowSessionTurn {
  user_message?: string;
  agent_response?: string;
  reasoning_content?: string | null;
  tool_invocations?: Array<{
    tool_name?: string;
    status?: string;
  }>;
  created_at?: string;
  completed_at?: string;
  status?: string;
}

interface FlowSessionRecord {
  agent_id?: string;
  session_id?: string;
  initial_query?: string;
  final_response?: string;
  status?: string;
  created_at?: string;
  completed_at?: string;
  turns?: FlowSessionTurn[];
}

interface TraceAgentRow {
  name?: string;
  session_id?: string;
  query?: string;
  agent_response?: string;
  reasoning_content?: string | null;
  created_at?: string;
  completed_at?: string;
  status?: string;
  tool_calls?: Array<{ tool_name?: string; status?: string }>;
  final_response?: {
    content?: string;
    created_at?: string;
    completed_at?: string;
    status?: string;
    session_id?: string;
  };
}

function normalizeAgentKey(value: string): string {
  return value.toLowerCase().replace(/-/g, "_").trim();
}

function agentKeysMatch(left: string, right: string): boolean {
  const a = normalizeAgentKey(left);
  const b = normalizeAgentKey(right);
  return a === b || a.includes(b) || b.includes(a);
}

function mapToolInvocations(
  invocations: FlowSessionTurn["tool_invocations"],
): Array<{ tool_name: string; status: string }> {
  if (!Array.isArray(invocations)) {
    return [];
  }
  return invocations
    .filter((item) => item && typeof item.tool_name === "string")
    .map((item) => ({
      tool_name: item.tool_name as string,
      status: item.status || "completed",
    }));
}

function primaryTurn(session: FlowSessionRecord): FlowSessionTurn | null {
  if (!Array.isArray(session.turns) || session.turns.length === 0) {
    return null;
  }
  return session.turns[session.turns.length - 1] ?? null;
}

function buildTraceRowFromSession(session: FlowSessionRecord): TraceAgentRow | null {
  const agentName = session.agent_id?.trim();
  if (!agentName) {
    return null;
  }
  const turn = primaryTurn(session);
  return {
    name: agentName,
    session_id: session.session_id,
    query: turn?.user_message || session.initial_query || "",
    agent_response: turn?.agent_response || session.final_response || "",
    reasoning_content: turn?.reasoning_content ?? "",
    created_at: session.created_at || turn?.created_at,
    completed_at: session.completed_at || turn?.completed_at,
    status: session.status || turn?.status || "unknown",
    tool_calls: mapToolInvocations(turn?.tool_invocations),
  };
}

function countNamedTraceRows(trace: unknown): number {
  if (!Array.isArray(trace)) {
    return 0;
  }
  return trace.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      typeof (row as TraceAgentRow).name === "string" &&
      ((row as TraceAgentRow).name?.length ?? 0) > 0,
  ).length;
}

function enrichTraceRow(row: TraceAgentRow, session: FlowSessionRecord): TraceAgentRow {
  const turn = primaryTurn(session);
  const merged: TraceAgentRow = { ...row };

  if (!merged.query?.trim()) {
    merged.query = turn?.user_message || session.initial_query || "";
  }
  if (!merged.agent_response?.trim()) {
    merged.agent_response = turn?.agent_response || session.final_response || "";
  }
  if (!merged.reasoning_content && turn?.reasoning_content) {
    merged.reasoning_content = turn.reasoning_content;
  }
  if (!merged.created_at) {
    merged.created_at = session.created_at || turn?.created_at;
  }
  if (!merged.completed_at) {
    merged.completed_at = session.completed_at || turn?.completed_at;
  }
  if (!merged.status || merged.status === "unknown") {
    merged.status = session.status || turn?.status || merged.status;
  }

  const sessionTools = mapToolInvocations(turn?.tool_invocations);
  if ((!merged.tool_calls || merged.tool_calls.length === 0) && sessionTools.length > 0) {
    merged.tool_calls = sessionTools;
  }

  return merged;
}

function findRootSession(sessions: FlowSessionRecord[]): FlowSessionRecord | null {
  return (
    sessions.find((session) => !session.agent_id?.includes("-")) ??
    sessions.find((session) =>
      normalizeAgentKey(session.agent_id || "").includes("operations_manager"),
    ) ??
    sessions[0] ??
    null
  );
}

function ensureFinalResponseEntry(
  trace: TraceAgentRow[],
  sessions: FlowSessionRecord[],
): TraceAgentRow[] {
  const hasFinal = trace.some((row) => !!row.final_response);
  if (hasFinal) {
    return trace;
  }

  const root = findRootSession(sessions);
  if (!root) {
    return trace;
  }

  const turn = primaryTurn(root);
  const content = turn?.agent_response || root.final_response || "";
  if (!content.trim()) {
    return trace;
  }

  return [
    ...trace,
    {
      final_response: {
        session_id: root.session_id,
        content,
        created_at: root.created_at,
        completed_at: root.completed_at,
        status: root.status || "completed",
      },
    },
  ];
}

/**
 * Build or enrich the trace array from REST sessions + trace rows.
 */
export function buildTraceFromFlowSnapshot(
  raw: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const sessions = (raw.sessions as FlowSessionRecord[] | undefined) ?? [];
  const existingTrace = (raw.trace as TraceAgentRow[] | undefined) ?? [];
  let trace: TraceAgentRow[] = [];

  if (countNamedTraceRows(existingTrace) > 0) {
    trace = existingTrace
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        if (!row.name || row.final_response) {
          return row;
        }
        const session = sessions.find((candidate) =>
          agentKeysMatch(candidate.agent_id || "", row.name || ""),
        );
        return session ? enrichTraceRow(row, session) : row;
      });
  } else if (sessions.length > 0) {
    trace = sessions
      .map(buildTraceRowFromSession)
      .filter((row): row is TraceAgentRow => row !== null);
  }

  // Cron / Redis-expired flows often arrive with only a final_response
  // pseudo-row (no name). Synthesize a named ops-manager agent so
  // QueryTracePanel does not treat the snapshot as empty.
  if (countNamedTraceRows(trace) === 0) {
    const root = findRootSession(sessions);
    const finalOnly = (existingTrace.length ? existingTrace : trace).find(
      (row) => row && typeof row === "object" && !!row.final_response,
    );
    const fr = finalOnly?.final_response as Record<string, unknown> | undefined;
    const content = String(
      fr?.content ||
        root?.final_response ||
        primaryTurn(root ?? { agent_id: "" })?.agent_response ||
        root?.initial_query ||
        "",
    ).trim();
    if (content || root) {
      trace = [
        {
          name: root?.agent_id?.trim() || "operations_manager",
          session_id: root?.session_id || String(fr?.session_id || ""),
          query: primaryTurn(root ?? { agent_id: "" })?.user_message || root?.initial_query || "",
          agent_response: content,
          reasoning_content: "",
          created_at: root?.created_at || String(fr?.created_at || ""),
          completed_at: root?.completed_at || String(fr?.completed_at || ""),
          status: String(root?.status || fr?.status || "completed"),
        },
        ...trace,
      ];
    }
  }

  return ensureFinalResponseEntry(trace, sessions) as Array<Record<string, unknown>>;
}

/**
 * Derive the query lifecycle status from a REST snapshot.
 */
export function deriveQueryStatusFromSnapshot(raw: Record<string, unknown>): QueryStatus {
  const trace = buildTraceFromFlowSnapshot(raw) as TraceAgentRow[];

  const hasPendingApproval = trace.some(
    (row) => row.status === "pending_approval" || row.final_response?.status === "pending_approval",
  );
  if (hasPendingApproval) {
    return "pending_approval";
  }

  const finalEntry = trace.find((row) => !!row.final_response);
  const finalStatus = finalEntry?.final_response?.status?.toLowerCase();
  if (finalStatus === "completed" || finalStatus === "done") {
    return "completed";
  }
  if (finalStatus === "failed" || finalStatus === "error") {
    return "error";
  }

  const sessions = (raw.sessions as FlowSessionRecord[] | undefined) ?? [];
  if (sessions.length > 0) {
    const allCompleted = sessions.every((session) => session.status === "completed");
    const anyFailed = sessions.some(
      (session) => session.status === "failed" || session.status === "error",
    );
    if (anyFailed) {
      return "error";
    }
    if (allCompleted) {
      return "completed";
    }
  }

  const namedAgents = trace.filter((row) => !!row.name && !row.final_response);
  if (namedAgents.length > 0 && namedAgents.every((row) => row.status === "completed")) {
    return "completed";
  }

  const topLevel = String(raw.status || "").toLowerCase();
  if (topLevel === "completed" || topLevel === "done") {
    return "completed";
  }
  if (topLevel === "failed" || topLevel === "error") {
    return "error";
  }
  if (topLevel === "processing" || topLevel === "active") {
    return "processing";
  }

  return "processing";
}

/**
 * Normalize a REST flow snapshot for Redux + QueryTrace rendering.
 */
/** True when a REST snapshot represents a finished flow. */
export function isFlowSnapshotCompleted(raw: Record<string, unknown>): boolean {
  return deriveQueryStatusFromSnapshot(raw) === "completed";
}

/**
 * Upgrade a plan bundle when the surrounding flow is already done.
 *
 * Completed flows often keep a stale plan row at ``pending`` in GreptimeDB
 * even though execution finished long ago.
 */
export function reconcilePlanBundleForCompletedFlow(
  plan: PlanBundle | null | undefined,
  flowCompleted: boolean,
): PlanBundle | null {
  if (!plan) {
    return null;
  }
  if (!flowCompleted) {
    return plan;
  }
  const nodes = (plan.dag_export?.nodes ?? []).map((node) => {
    const status = (node.status || "").toLowerCase();
    if (status === "failed" || status === "error") {
      return node;
    }
    return { ...node, status: "completed" };
  });
  const completed = nodes.filter((n) => (n.status || "").toLowerCase() === "completed").length;
  const failed = nodes.filter((n) => {
    const st = (n.status || "").toLowerCase();
    return st === "failed" || st === "error";
  }).length;
  return {
    ...plan,
    status: "completed",
    dag_export: plan.dag_export
      ? {
          ...plan.dag_export,
          nodes,
          statistics: {
            total: nodes.length,
            completed,
            failed,
            pending: Math.max(0, nodes.length - completed - failed),
            ...plan.dag_export.statistics,
          },
        }
      : plan.dag_export,
  };
}

export function normalizeFlowSnapshot(raw: Record<string, unknown>): FlowPayload {
  const trace = buildTraceFromFlowSnapshot(raw);
  const status = deriveQueryStatusFromSnapshot({
    ...raw,
    trace,
  });

  return {
    ...(raw as FlowPayload),
    trace,
    status,
    correlation_id:
      (raw.correlation_id as string | undefined) ?? (raw.correlationId as string | undefined),
  };
}
