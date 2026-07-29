/**
 * Partial pull-forward of Vite's `store/flowStream/types.ts`.
 *
 * That file combines two unrelated concerns: (1) the original,
 * genuinely-used flow/plan types that back `TeamsDashboard` and
 * QueryTrace's v1 REST snapshot rendering, and (2) a second, dead
 * duplicate of the `Block`/`AgentFrame` block-streaming types (with
 * their own unused reducer in `flowStreamSlice.ts`) — confirmed to
 * have zero real consumers anywhere in the Vite app outside that
 * slice file. The canonical, actually-used `Block`/`AgentFrame` types
 * for this migration live in `./blockStream/types.ts`.
 *
 * This file pulls forward ONLY the flow/plan types (group 1) that
 * `flowTraceMerge.ts`, `flowListMerge.ts`, and `flowSnapshotAdapter.ts`
 * (this Phase 8 slice) need as a hard dependency — same convention as
 * Phase 6's `DigitalTwin/rackLayout.types.ts`. Reconcile with the real
 * flow/plan feature slice (Redux `src/features/flowStream/`) when that
 * later phase lands instead of keeping two definitions.
 */

/** Query status lifecycle. */
export type QueryStatus =
  | "idle"
  | "submitting"
  | "processing"
  | "pending_approval"
  | "approved"
  | "executing"
  | "completed"
  | "error";

/** A single task node in a DAG. */
export interface TaskNode {
  task_id: string;
  goal: string;
  target_agent: string;
  status: string;
  result?: string;
  error?: string;
  tools_used?: string[];
  verification_score?: number;
  duration_ms?: number;
  tools_planned?: string[];
  delegation_instructions?: string;
}

/** DAG (Directed Acyclic Graph) export structure. */
export interface DAGExport {
  dag_id: string;
  nodes: TaskNode[];
  edges: Array<{ source: string; target: string }>;
  statistics?: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

/** Per-node verification result. */
export interface NodeVerification {
  task_id: string;
  agent_name: string;
  can_execute: boolean;
  tools_planned: string[];
  tool_params: Record<string, Record<string, unknown>>;
  execution_order: string[];
  score: number;
  feedback: string;
}

/** Overall plan verification. */
export interface VerificationResult {
  is_valid: boolean;
  overall_score: number;
  rejection_reason?: string;
  node_scores: Record<string, number>;
  node_verifications?: NodeVerification[];
}

/** Plan bundle containing the full execution plan. */
export interface PlanBundle {
  correlation_id: string;
  session_id: string;
  query: string;
  dag_export: DAGExport;
  verification_result: VerificationResult;
  status: string;
  created_at: string;
  decision?: string;
  decision_reason?: string;
  decision_at?: string;
}

/** A session within a flow. */
export interface FlowSession {
  session_id: string;
  agent_id: string;
  status: string;
  initial_query?: string;
  final_response?: string;
  created_at?: string;
  completed_at?: string;
}

/** Flow data with sessions and timeline. */
export interface FlowData {
  correlation_id: string;
  sessions: FlowSession[];
  timeline: Array<{
    timestamp: string;
    type: string;
    agent?: string;
    details?: Record<string, unknown>;
  }>;
}

/**
 * Runtime flow payload from SSE `flow_state` or REST snapshot.
 * May omit strict FlowData fields and include v1 trace rows.
 */
export type FlowPayload = Partial<FlowData> & {
  trace?: Array<Record<string, unknown>>;
  pending_approvals?: unknown[];
  original_query?: string;
  status?: string;
};

/** One flow row from list responses or `flow_created` events. */
export interface FlowListItem {
  session_id: string;
  correlation_id: string;
  query: string;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  evaluation_status?: string;
  score?: number | null;
  /** Origin of the flow (e.g. ``cron_job``). */
  source?: string | null;
  /** Parent cron job id when ``source`` is ``cron_job``. */
  cron_job_id?: string | null;
}
