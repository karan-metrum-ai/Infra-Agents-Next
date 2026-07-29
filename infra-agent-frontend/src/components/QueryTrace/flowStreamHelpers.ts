/**
 * Shared constants, types, and pure helpers for the `useFlowStream`
 * feature module — split out of the Vite app's 1755-LOC
 * `hooks/useFlowStream.ts` so the connection, event-routing, and REST
 * hydration modules share one small, dependency-free helper surface
 * instead of duplicating it.
 */
import type { AppDispatch } from "@/store/store";
import { removeApproval } from "@/features/approvals/approvalsSlice";
import type { PendingApproval } from "@/features/approvals/approvalsSlice";
import { patchPlanBundle, setQueryStatus } from "@/features/queryTrace/flowStreamSlice";
import { FlowStreamApiError } from "./flowStreamApi";
import { isFlowSnapshotCompleted } from "./flowSnapshotAdapter";
import type { PlanBundle } from "./flowPayload.types";
import type { Block, BlockStatus, AgentFrameEvent, AgentFrameInput } from "./blockStream/types";

/** Unique ID for the synthetic plan-level approval shown in the bell icon. */
export const PLAN_APPROVAL_ID = "__plan_approval__";

/** Maximum reconnect attempts before surfacing an error. */
export const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Streaming protocol version.
 *
 * `v2` opts into the PRD `agent_frame` envelope. The server keeps
 * emitting the legacy v1 events (plan_state, flow_state, …) alongside the
 * new agent_frame stream so existing trace UI keeps working. Override at
 * build time with `NEXT_PUBLIC_AGENT_FRAME_PROTOCOL=v1` to roll back to
 * legacy-only streaming (Next's client-bundle equivalent of the Vite
 * app's `VITE_AGENT_FRAME_PROTOCOL`).
 */
export const SSE_PROTOCOL: "v1" | "v2" =
  process.env.NEXT_PUBLIC_AGENT_FRAME_PROTOCOL === "v1" ? "v1" : "v2";

/** Result of a plan approve/reject REST call. */
export type DecisionSubmitResult = { ok: true } | { ok: false; message: string };

/** Extract a user-facing message from a flow API error. */
export function formatFlowApiError(err: unknown): string {
  if (err instanceof FlowStreamApiError) {
    const details = err.details;
    if (details && typeof details === "object" && "detail" in details) {
      const detail = (details as { detail: unknown }).detail;
      if (typeof detail === "string") {
        return detail;
      }
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Request failed";
}

/** Create a synthetic PendingApproval entry for plan-level decisions. */
export function makePlanApprovalEntry(plan: PlanBundle): PendingApproval {
  return {
    approval_id: PLAN_APPROVAL_ID,
    tool_name: "Execution Plan",
    tool_args: { query: plan.query ?? "" },
    agent_name: "operations_manager",
    status: "pending",
    created_at: plan.created_at ?? new Date().toISOString(),
    message: `Plan requires approval: ${plan.query ?? "Execution plan"}`,
  };
}

/** Clear stale HITL UI once a flow snapshot is already terminal. */
export function applyCompletedFlowUiState(
  dispatch: AppDispatch,
  snapshot: Record<string, unknown>,
): void {
  if (!isFlowSnapshotCompleted(snapshot)) {
    return;
  }
  dispatch(setQueryStatus("completed"));
  dispatch(patchPlanBundle({ status: "completed" }));
  dispatch(removeApproval(PLAN_APPROVAL_ID));
}

/** Derive a plan status from thread-state session metadata. */
export function resolveExtractedPlanStatus(session: Record<string, unknown>): string {
  const sessionStatus = String(session.status || "").toLowerCase();
  if (sessionStatus === "completed" || sessionStatus === "done") {
    return "completed";
  }
  if (sessionStatus === "failed" || sessionStatus === "error") {
    return "failed";
  }
  return "pending";
}

/** Server message envelope as it arrives in `event.data` (v1 protocol). */
export interface FlowEvent {
  event_type?: string;
  correlation_id?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  seq?: string;
}

/** Build block-store hydrate events from a persisted snapshot. */
export function buildBlockHydrateEvents(
  snapshot: Record<string, unknown>,
  blocks: Block[],
): AgentFrameInput[] {
  const correlationId =
    typeof snapshot.correlation_id === "string" ? snapshot.correlation_id : undefined;
  const hydrateEvents: AgentFrameInput[] = [];
  hydrateEvents.push({
    event: "agent_frame",
    data: {
      correlation_id: correlationId,
      phase: (snapshot.phase ?? "completed") as AgentFrameEvent["data"]["phase"],
      todo_list:
        (snapshot.todo_list as Array<{ id: string; title: string; status: string }> | undefined) ??
        [],
      active_block_id: null,
    },
  } as AgentFrameEvent);
  for (const block of blocks) {
    hydrateEvents.push({ type: "block_created", block });
    hydrateEvents.push({
      type: "block_complete",
      block_id: block.id,
      status: block.status as BlockStatus | undefined,
    });
  }
  return hydrateEvents;
}
