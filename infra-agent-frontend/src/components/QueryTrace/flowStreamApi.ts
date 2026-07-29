/**
 * REST client for the ops-manager flow API.
 *
 * Wraps the SSE companion endpoints (`/actions/*`) that replace the
 * bidirectional WebSocket actions. SSE streaming is handled separately by
 * this feature's `useFlowStream` hook family — this module is pure fetch
 * with no React or Redux coupling, mirroring the "SSE streaming doesn't
 * fit RTK Query's request/response model" reasoning documented in
 * `src/features/kyai/kyaiApi.ts`.
 *
 * Placement: co-located under `src/components/QueryTrace/` (not
 * `src/features/queryTrace/`) — `002-structure.mdc`'s placement table
 * only has homes for RTK Query APIs (`features/<name>/<name>Api.ts`),
 * hooks, generic utils, and 3rd-party client init, none of which fit a
 * hand-rolled REST client that a streaming hook composes with. This
 * subtree already established its own flat, co-located convention for
 * exactly this shape of file (`traceDataParser.ts`, `flowSnapshotAdapter.ts`,
 * `flowTraceMerge.ts`, etc. all live here despite being plain `.ts`, not
 * components) — same "Earned Complexity" reasoning `002-structure.mdc`
 * principle 5 endorses: QueryTrace is a self-contained, deeply
 * stream-stateful feature, and splitting its REST client out to a
 * different directory than the hooks/types that consume it would add
 * indirection without a real architectural boundary.
 *
 * All endpoints are proxied through `/clusterid-{clusterId}/...` so the
 * dev proxy and the production nginx config add the required identity
 * headers. The K8s Istio VirtualService routes this prefix to the
 * correct ops-manager pod.
 */

import type { PendingApproval } from "@/features/approvals/approvalsSlice";

/** Path-prefix helper. Centralized so the format only lives in one place. */
function teamBase(teamId: string): string {
  return `/clusterid-${teamId}`;
}

/** Network/transport errors raised by this module. */
export class FlowStreamApiError extends Error {
  status: number;
  endpoint: string;
  details?: unknown;

  constructor(message: string, status: number, endpoint: string, details?: unknown) {
    super(message);
    this.name = "FlowStreamApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
  }
}

async function readJsonOrThrow<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let details: unknown = null;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => null);
    }
    throw new FlowStreamApiError(
      `Request failed: ${response.status} ${response.statusText}`,
      response.status,
      endpoint,
      details,
    );
  }
  return response.json() as Promise<T>;
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Submit query                                                        */
/* ──────────────────────────────────────────────────────────────────── */

export interface SubmitQueryRequest {
  query: string;
  session_id?: string;
  correlation_id?: string;
}

export interface SubmitQueryResponse {
  correlation_id: string;
  session_id: string;
  status: string;
  history_indexed?: boolean;
  query?: string;
  events_url?: string;
  pending_approvals?: PendingApproval[];
}

/**
 * POST /clusterid-{clusterId}/actions/submit
 *
 * Submits a query and returns the `correlation_id`. The caller should
 * immediately open an EventSource on the SSE stream URL built via
 * `buildFlowEventsUrl`.
 */
export async function submitQuery(
  teamId: string,
  body: SubmitQueryRequest,
  signal?: AbortSignal,
): Promise<SubmitQueryResponse> {
  const endpoint = `${teamBase(teamId)}/actions/submit`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  return readJsonOrThrow<SubmitQueryResponse>(response, endpoint);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  List flows                                                          */
/* ──────────────────────────────────────────────────────────────────── */

export interface ListFlowsOptions {
  limit?: number;
  status?: string | null;
  /** Pagination cursor — `created_at` of the oldest item from prior page. */
  cursor?: string | null;
  /** Only return flows with this source (e.g. ``cron_job``). */
  source?: string | null;
  /** Omit flows with this source (e.g. ``cron_job`` for Queries panel). */
  excludeSource?: string | null;
}

export interface FlowListEntry {
  session_id: string;
  correlation_id: string | null;
  query: string;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  evaluation_status?: string;
  score?: number | null;
  source?: string | null;
  cron_job_id?: string | null;
}

export interface ListFlowsResponse {
  flows: FlowListEntry[];
  total?: number;
  next_cursor?: string | null;
}

/** True when a flow was produced by a cron tick (not a manual chat submit). */
export function isCronFlow(flow: {
  source?: string | null;
  correlation_id?: string | null;
  session_id?: string | null;
}): boolean {
  return (
    flow.source === "cron_job" ||
    (flow.correlation_id?.startsWith("cron-exec-") ?? false) ||
    (flow.session_id?.startsWith("cron_") ?? false)
  );
}

/** Inverse of {@link isCronFlow}. */
export function isManualFlow(flow: {
  source?: string | null;
  correlation_id?: string | null;
  session_id?: string | null;
}): boolean {
  return !isCronFlow(flow);
}

/**
 * Status label for the query history sidebar.
 *
 * Prefer flow execution status over KYAI evaluation status so completed
 * queries are not shown as "pending" when no evaluation exists yet.
 */
export function flowListDisplayStatus(
  flow: Pick<FlowListEntry, "status" | "evaluation_status"> & {
    completed_at?: string | null;
  },
): string {
  if (flow.completed_at) {
    const executionStatus = flow.status?.trim().toLowerCase();
    if (executionStatus === "error" || executionStatus === "failed") {
      return flow.status?.trim() || "error";
    }
    return "completed";
  }
  const executionStatus = flow.status?.trim();
  if (executionStatus) {
    return executionStatus;
  }
  return flow.evaluation_status?.trim() || "";
}

export type FlowStatusCategory = "active" | "completed" | "others";

const ACTIVE_FLOW_STATUSES = new Set([
  "accepted",
  "active",
  "executing",
  "in_progress",
  "pending",
  "pending_approval",
  "processing",
  "running",
  "submitting",
]);

/** Buckets a flow into a sidebar filter category. */
export function flowStatusCategory(
  flow: Pick<FlowListEntry, "status" | "evaluation_status"> & {
    completed_at?: string | null;
  },
): FlowStatusCategory {
  const status = flowListDisplayStatus(flow).toLowerCase();
  if (status === "completed" || status === "healthy" || status === "ready") {
    return "completed";
  }
  if (ACTIVE_FLOW_STATUSES.has(status)) {
    return "active";
  }
  return "others";
}

/**
 * GET /clusterid-{clusterId}/actions/flows
 *
 * Lists recent flows. Falls back to the legacy `GET /flows` endpoint on a
 * 404 so the dropdown keeps working against older ops-manager builds
 * during rollout.
 */
export async function listFlows(
  teamId: string,
  options: ListFlowsOptions = {},
  signal?: AbortSignal,
): Promise<ListFlowsResponse> {
  const limit = options.limit ?? 50;
  const params = new URLSearchParams({ limit: String(limit) });
  if (options.status) params.set("status", options.status);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.source) params.set("source", options.source);
  if (options.excludeSource) {
    params.set("exclude_source", options.excludeSource);
  }

  const primary = `${teamBase(teamId)}/actions/flows?${params.toString()}`;
  const response = await fetch(primary, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });

  if (response.ok) {
    return readJsonOrThrow<ListFlowsResponse>(response, primary);
  }

  // Legacy fallback: older ops-manager builds expose GET /flows.
  if (response.status === 404) {
    const fallback = `${teamBase(teamId)}/flows?${params.toString()}`;
    const legacy = await fetch(fallback, {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
    });
    return readJsonOrThrow<ListFlowsResponse>(legacy, fallback);
  }

  return readJsonOrThrow<ListFlowsResponse>(response, primary);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Plan decision                                                       */
/* ──────────────────────────────────────────────────────────────────── */

export type PlanDecision = "approve" | "reject";

export interface PlanDecisionResponse {
  correlation_id: string;
  decision: PlanDecision;
  status: string;
  decided_at?: string;
}

/**
 * POST /clusterid-{clusterId}/actions/decision
 *
 * Submits an approve/reject decision for the pending plan. The
 * correlation_id is passed in the request body (not in the URL path). The
 * matching `plan_decision` event arrives back on the open SSE stream --
 * callers should treat this REST call as fire-and-forget for UI state.
 */
export async function submitDecision(
  teamId: string,
  correlationId: string,
  decision: PlanDecision,
  reason?: string,
  signal?: AbortSignal,
): Promise<PlanDecisionResponse> {
  const endpoint = `${teamBase(teamId)}/actions/decision`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      correlation_id: correlationId,
      decision,
      reason,
    }),
    signal,
  });
  return readJsonOrThrow<PlanDecisionResponse>(response, endpoint);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Resume halted flow (interruption protocol)                          */
/* ──────────────────────────────────────────────────────────────────── */

export interface ResumeFlowResponse {
  correlation_id: string;
  status: string;
  decision: string;
}

/**
 * POST /clusterid-{clusterId}/actions/decision
 *
 * Resumes a flow halted at the `interruption_awaited` phase by sending a
 * decision through the unified ApprovalService.
 */
export async function resumeFlow(
  teamId: string,
  correlationId: string,
  decision: "approve" | "reject" = "approve",
  signal?: AbortSignal,
): Promise<ResumeFlowResponse> {
  const endpoint = `${teamBase(teamId)}/actions/decision`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      correlation_id: correlationId,
      decision,
    }),
    signal,
  });
  return readJsonOrThrow<ResumeFlowResponse>(response, endpoint);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Flow snapshot                                                       */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * GET /clusterid-{clusterId}/actions/flows/{correlationId}/snapshot
 *
 * One-shot fetch of the current flow snapshot (trace + plan). Falls back
 * to legacy GET /flows/{correlationId} on 404 for older ops-manager
 * builds.
 */
export async function fetchFlowSnapshot<T = unknown>(
  teamId: string,
  correlationId: string,
  signal?: AbortSignal,
): Promise<T> {
  const encoded = encodeURIComponent(correlationId);
  const primary = `${teamBase(teamId)}/actions/flows/${encoded}/snapshot`;
  const response = await fetch(primary, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });

  if (response.ok) {
    return readJsonOrThrow<T>(response, primary);
  }

  if (response.status === 404) {
    const fallback = `${teamBase(teamId)}/flows/${encoded}`;
    const legacy = await fetch(fallback, {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
    });
    return readJsonOrThrow<T>(legacy, fallback);
  }

  return readJsonOrThrow<T>(response, primary);
}

/**
 * Resolve a plan bundle from a flow snapshot or the plans REST endpoint.
 */
export async function resolvePlanBundle<T = unknown>(
  teamId: string,
  correlationId: string,
  snapshot: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T | null> {
  const embedded = snapshot.plan;
  if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
    return embedded as T;
  }
  return fetchPlanSnapshot<T>(teamId, correlationId, signal);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Plan snapshot                                                       */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * GET /clusterid-{clusterId}/plans/{correlationId}
 *
 * Fetches the plan bundle (DAG, verification score, status) for a given
 * flow. Returns null on 404 (flow has no plan yet).
 */
export async function fetchPlanSnapshot<T = unknown>(
  teamId: string,
  correlationId: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const endpoint = `${teamBase(teamId)}/plans/${encodeURIComponent(correlationId)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });
  if (response.status === 404) return null;
  return readJsonOrThrow<T>(response, endpoint);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Block snapshot (v2 block stream)                                    */
/* ──────────────────────────────────────────────────────────────────── */

/**
 * GET /clusterid-{clusterId}/sse/flows/{correlationId}/blocks
 *
 * One-shot fetch of the persisted v2 block snapshot. Used to hydrate the
 * block store when SSE `block_snapshot` was missed (e.g. idle stream,
 * reconnect gap, or the flow completed before the panel opened).
 */
export async function fetchBlockSnapshot<T = unknown>(
  teamId: string,
  correlationId: string,
  signal?: AbortSignal,
): Promise<T> {
  const endpoint = `${teamBase(teamId)}/sse/flows/${encodeURIComponent(correlationId)}/blocks`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });
  return readJsonOrThrow<T>(response, endpoint);
}

/* ──────────────────────────────────────────────────────────────────── */
/*  SSE URL helpers                                                     */
/* ──────────────────────────────────────────────────────────────────── */

export interface SseUrlOptions {
  /** Protocol version hint (informational; backend ignores unknown params). */
  protocol?: "v1" | "v2";
  /** Optional `Last-Event-ID` value for resume after reconnect. */
  lastEventId?: string | null;
}

/**
 * Build the per-flow SSE URL.
 *
 * Backend endpoint: `GET /sse/flows/{correlation_id}`
 * Supports `?last_event_id=` for resume (EventSource cannot set headers).
 */
export function buildFlowEventsUrl(
  teamId: string,
  correlationId: string,
  options: SseUrlOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.protocol) params.set("protocol", options.protocol);
  if (options.lastEventId) {
    params.set("last_event_id", options.lastEventId);
  }
  const qs = params.toString();
  const base = `${teamBase(teamId)}/sse/flows/${encodeURIComponent(correlationId)}`;
  return qs ? `${base}?${qs}` : base;
}
