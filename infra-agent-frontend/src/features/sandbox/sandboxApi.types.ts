/**
 * Sandbox Evaluator (V2) domain types.
 *
 * Ported from the Vite app's `types/sandbox.ts` (the canonical, richer
 * type set — aligned with the backend schemas at `sandbox/schemas.py`) plus
 * the request/response wire shapes that only existed inline in
 * `lib/sandboxApi.ts` (`SimulatorRequest`, `DatasetRequest`, `AgentsRequest`,
 * `SandboxRunRequest`, `KBUploadResponse`, `ReportListItem`,
 * `ListReportsResponse`, `SandboxRunActionResponse`, `SandboxSseEvent`,
 * `defaultRunRequest`). This is the one canonical type home for the
 * Sandbox/Eval feature — `sandboxApi.ts` and every SandboxPanel hook/
 * component import from here, never redeclare.
 *
 * Resolved duplicate (do not re-litigate): `lib/sandboxApi.ts` declared its
 * own shallower `PhaseStatus` (an object shape — phase name/status/timing),
 * `SandboxRunStatusResponse`, `VerdictResult`, and `QueryScore`/
 * `SandboxReport` that all overlapped with richer versions already in
 * `types/sandbox.ts` (`SandboxPhase`, `SandboxRun`, `Verdict`, `QueryScore`,
 * `SandboxReport`). The richer `types/sandbox.ts` versions are kept as the
 * sole canonical definitions; note `PhaseStatus` here is the STRING UNION
 * from `types/sandbox.ts` (`'pending' | 'running' | ...`), not the object
 * shape `lib/sandboxApi.ts` gave the same name — that object shape is
 * `SandboxPhase` here.
 */

export type RunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "deleted"
  | "cancelling"
  | "cancelled";

export type PhaseStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type VerdictDirection = "min" | "max";

export interface SandboxPhase {
  name: string;
  status: PhaseStatus;
  started_at: number | null;
  completed_at: number | null;
  duration_s: number | null;
  error: string | null;
}

export const PHASE_ORDER = ["starter", "runner", "reporter"] as const;

export type PhaseKey = (typeof PHASE_ORDER)[number];

export const PHASE_LABELS: Record<string, string> = {
  starter: "Starter",
  runner: "Runner",
  reporter: "Reporter",
};

export const STARTER_STEPS = [
  "namespace_ready",
  "devices_generated",
  "team_ready",
  "dataset_ready",
] as const;

export const STARTER_STEP_LABELS: Record<string, string> = {
  namespace_ready: "Namespace Created",
  devices_generated: "Devices Generated",
  team_ready: "Team Deployed",
  dataset_ready: "Dataset Prepared",
};

export const RUNNER_STEPS = [
  "team_discovered",
  "dataset_loaded",
  "eval_started",
  "optimization_started",
  "optimization_completed",
  "metrics_exported",
] as const;

export const RUNNER_STEP_LABELS: Record<string, string> = {
  team_discovered: "Team Discovered",
  dataset_loaded: "Dataset Loaded",
  eval_started: "Evaluation Running",
  optimization_started: "Optimizing",
  optimization_completed: "Optimization Done",
  metrics_exported: "Metrics Exported",
};

export const REPORTER_STEPS = [
  "aggregating_metrics",
  "computing_verdicts",
  "saving_artifacts",
] as const;

export const REPORTER_STEP_LABELS: Record<string, string> = {
  aggregating_metrics: "Aggregating Metrics",
  computing_verdicts: "Computing Verdicts",
  saving_artifacts: "Saving Report",
};

export interface Verdict {
  name: string;
  target: number;
  actual: number;
  passed: boolean;
  unit: string;
  direction?: VerdictDirection;
}

export interface QueryScore {
  query_idx: number;
  query_text: string;
  status: string;
  duration_ms: number;
  score: number;
  tool_match: number;
  param_match: number;
  order_valid: number;
  reasoning: number;
  tools_called: string[];
  error: string | null;
  invalid_tools?: string[];
  missing_params?: Record<string, string[]>;
  extra_tools?: string[];
  scored_nodes?: number;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OptimizationResult {
  enabled?: boolean;
  baseline_mean?: number;
  optimized_mean?: number;
  lift?: Record<string, number>;
  before?: Record<string, number | string | null>;
  after?: Record<string, number | string | null>;
}

export interface SandboxReport {
  run_id: string;
  team: string[];
  model_id: string;
  dataset_size: number;
  simulated_machines: number;
  overall_verdict: string;
  verdicts_passed: number;
  verdicts_total: number;
  verdicts: Verdict[];
  query_scores: QueryScore[];
  metrics: Record<string, unknown>;
  optimization: OptimizationResult | null;
  duration_s: number;
  created_at: number;
}

export interface SandboxRun {
  run_id: string;
  status: RunStatus;
  current_phase: string | null;
  phases: SandboxPhase[];
  created_at: number;
  completed_at: number | null;
  error: string | null;
  report_url: string | null;
}

export interface SandboxRunListItem {
  run_id: string;
  status: RunStatus;
  current_phase: string | null;
  phases: SandboxPhase[];
  created_at: number;
  completed_at: number | null;
  error: string | null;
}

export interface ArtifactInfo {
  name: string;
  size_bytes?: number | null;
  modified_at?: string | null;
  type?: string | null;
}

export const TERMINAL_RUN_STATUSES: ReadonlySet<RunStatus> = new Set([
  "completed",
  "failed",
  "deleted",
  "cancelled",
]);

export function isTerminal(status: RunStatus | string): boolean {
  return TERMINAL_RUN_STATUSES.has(status as RunStatus);
}

export interface ThroughputMetrics {
  total_queries: number;
  overall_qps: number;
  queries_by_status: Record<string, number>;
  successful_qps: number;
  [k: string]: unknown;
}

export interface LatencyMetrics {
  e2e_min_ms: number;
  e2e_max_ms: number;
  e2e_mean_ms: number;
  e2e_p75_ms: number;
  e2e_p90_ms: number;
  e2e_p95_ms: number;
  planning_p50_ms: number;
  planning_p95_ms: number;
  execution_p50_ms: number;
  execution_p95_ms: number;
  aggregation_p50_ms: number;
  aggregation_p95_ms: number;
  [k: string]: unknown;
}

export interface AccuracyMetrics {
  atomizer_accuracy: number;
  atomizer_precision_plan: number;
  atomizer_recall_plan: number;
  atomizer_f1_plan: number;
  confusion_matrix: Record<string, number>;
  planner_agent_match_rate: number;
  planner_avg_task_count_diff: number;
  planner_dependency_accuracy: number;
  task_completion_rate: number;
  query_success_rate: number;
  [k: string]: unknown;
}

export interface ErrorMetrics {
  total_errors: number;
  error_rate: number;
  errors_by_type: Record<string, number>;
  errors_by_agent: Record<string, number>;
  errors_by_phase: Record<string, number>;
  first_error_at_query: number | null;
  error_burst_max: number;
  timeout_count: number;
  timeout_rate: number;
  rejection_count: number;
  cascade_failure_count: number;
  [k: string]: unknown;
}

export interface TokenMetrics {
  total_input_tokens: number;
  total_output_tokens: number;
  total_reasoning_tokens: number;
  total_tokens: number;
  avg_tokens_per_query: number;
  avg_input_tokens_per_query: number;
  avg_output_tokens_per_query: number;
  atomizer_tokens_est: number;
  planner_tokens_est: number;
  aggregation_tokens_est: number;
  execution_tokens_est: number;
  token_efficiency: number;
  tokens_per_task: number;
  peak_tokens_per_query: number;
  [k: string]: unknown;
}

export interface DagTaskMetrics {
  total_dags_created: number;
  avg_nodes_per_dag: number;
  max_nodes_per_dag: number;
  avg_edges_per_dag: number;
  total_tasks_dispatched: number;
  total_tasks_completed: number;
  total_tasks_failed: number;
  task_completion_rate: number;
  avg_tasks_per_query: number;
  queries_by_agent: Record<string, number>;
  agent_success_rate: Record<string, number>;
  agent_avg_duration_ms: Record<string, number>;
  node_type_distribution: Record<string, number>;
  single_agent_queries: number;
  multi_agent_queries: number;
  max_dag_depth: number;
  [k: string]: unknown;
}

export type NodeMetrics = Record<string, number | number[] | null>;
export type GpuMetrics = Record<string, Record<string, number | null>>;
export interface InfraMetrics {
  node?: NodeMetrics | null;
  gpu?: GpuMetrics | null;
  [k: string]: unknown;
}

export interface GpuHardwareMetrics {
  vendor: string;
  model: string;
  gpu_count: number;
  memory_total_gb: number;
  utilization_pct_mean: number;
  utilization_pct_peak: number;
  memory_used_gb_mean: number;
  memory_used_gb_peak: number;
  temperature_c_peak: number;
  power_draw_w_mean?: number | null;
  snapshots: number;
}

export interface GpuInferenceMetrics {
  kv_cache_usage_pct_mean: number;
  kv_cache_usage_pct_peak: number;
  requests_running_peak: number;
  requests_waiting_peak: number;
  ttft_mean_s?: number | null;
  tpot_mean_s?: number | null;
  prefix_cache_hit_rate_pct?: number | null;
  prefix_cache_hits_delta?: number | null;
  snapshots: number;
}

export interface GpuMetricsReport {
  hardware?: GpuHardwareMetrics | null;
  inference?: GpuInferenceMetrics | null;
  snapshot_count?: number;
  duration_s?: number;
}

export interface IdracResult {
  scenario: string;
  device_ip: string;
  status: string;
  detail?: Record<string, unknown> | null;
  [k: string]: unknown;
}

export interface MetricsSnapshot {
  throughput?: ThroughputMetrics;
  latency?: LatencyMetrics;
  accuracy?: AccuracyMetrics;
  errors?: ErrorMetrics;
  tokens?: TokenMetrics;
  dag_task?: DagTaskMetrics;
  gpu?: GpuMetricsReport | null;
  [k: string]: unknown;
}

export interface KyaiQueryScore {
  query_id?: string;
  query?: string;
  tool_match: number;
  param_match: number;
  order_valid: number;
  reasoning: number;
  confidence: number;
  [k: string]: unknown;
}

export interface KyaiEvaluation {
  url?: string;
  overall_confidence?: number;
  tool_match_weight?: number;
  param_match_weight?: number;
  order_valid_weight?: number;
  reasoning_weight?: number;
  per_query?: KyaiQueryScore[];
  [k: string]: unknown;
}

export interface QueryRecord {
  query_id?: string;
  query?: string;
  status?: string;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  expected_node_type?: string;
  predicted_node_type?: string;
  expected_agents?: string[];
  predicted_agents?: string[];
  error?: string | null;
  concurrency_at_start?: number;
  concurrency_at_end?: number;
  [k: string]: unknown;
}

export interface ArtifactListResponse {
  run_id: string;
  artifacts: ArtifactInfo[];
}

export interface SandboxLogsResponse {
  [podName: string]: string;
}

export type SandboxPhases = Record<string, SandboxPhase>;
export type PhaseKeyV1 = string;
export const INFRA_PHASES: string[] = [];
export const PHASE_ORDER_V1 = PHASE_ORDER;

/* ──────────────────────────────────────────────────────────────────── */
/*  Request / wire-response shapes (from the Vite app's lib/sandboxApi.ts) */
/* ──────────────────────────────────────────────────────────────────── */

export interface SimulatorRequest {
  machine_count?: number;
  category_mix?: Record<string, number>;
  scenario?: string;
}

export interface DatasetRequest {
  mode: "generate" | "auto" | "existing" | "inline";
  num_queries?: number;
  existing_path?: string;
  kb_source?: string;
  inline_examples?: unknown[];
  concurrency?: number;
}

export interface AgentsRequest {
  team: string[];
  skip_optimize?: boolean;
}

export interface SandboxRunRequest {
  simulator?: SimulatorRequest;
  dataset?: DatasetRequest;
  agents?: AgentsRequest;
  model_id?: string;
  base_url?: string;
  api_key?: string;
  agent_config_path?: string;
  skip_optimize?: boolean;
  teardown_after?: boolean;
}

/** Shared response shape for `startRun` (`POST /runs`) and `cancelRun`/`deleteRun` (`DELETE /runs/:id`) — both are `{ run_id, status, message }` in the Vite source. */
export interface SandboxRunActionResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface KBUploadResponse {
  kb_path: string;
  filename: string;
  size_bytes: number;
}

export interface ReportListItem {
  run_id: string;
  verdict: string | null;
  dataset_size: number | null;
  duration_s: number | null;
}

export interface ListReportsResponse {
  reports: ReportListItem[];
}

/** SSE event envelope delivered by `GET /v1/sandbox/runs/:runId/stream`. */
export interface SandboxSseEvent {
  event_type: string;
  run_id: string;
  timestamp: number;
  data: Record<string, unknown>;
}

/** Default sandbox run configuration — ported verbatim from `lib/sandboxApi.ts`. */
export function defaultRunRequest(overrides: Partial<SandboxRunRequest> = {}): SandboxRunRequest {
  return {
    simulator: {
      machine_count: 8,
      category_mix: { compute: 5, network: 2, storage: 1 },
      scenario: "auto_rotate",
    },
    dataset: {
      mode: "generate",
      num_queries: 30,
    },
    agents: {
      team: [
        "operations-manager",
        "level1-support",
        "systems-admin-agent-hw",
        "systems-admin-agent-os",
      ],
      skip_optimize: false,
    },
    teardown_after: true,
    ...overrides,
  };
}
