/**
 * Top-level SSE event dispatch — parses one raw event payload and routes
 * it to either the legacy v1 handler (`flowStreamPlanEvents.ts`) or the
 * PRD v2 block-stream handler (`flowStreamBlockEvents.ts`). Split out of
 * the Vite app's `hooks/useFlowStream.ts` (`handleFlowEvent` +
 * `attachListeners`).
 */
import { setLastSeq } from "@/features/queryTrace/flowStreamSlice";
import { handleBlockEvent, isBlockEventType } from "./flowStreamBlockEvents";
import { handlePlanEvent, type FlowStreamPlanEventContext } from "./flowStreamPlanEvents";
import type { FlowEvent } from "./flowStreamHelpers";

/** SSE event names this feature subscribes to, in listener-registration order. */
export const FLOW_STREAM_EVENT_NAMES = [
  "connected",
  "query_accepted",
  "flow_state",
  "flow_delta",
  "telemetry_update",
  "plan_state",
  "plan_ready",
  "phase_update",
  "task_update",
  "plan_decision",
  "execution_started",
  "execution_completed",
  "execution_failed",
  "decision_accepted",
  "execution_acknowledged",
  "session_start",
  "session_complete",
  "session_error",
  "flow_created",
  "error",
  // PRD v2 envelope + block lifecycle events.
  "agent_frame",
  "block_created",
  "block_updated",
  "block_complete",
  "block_locked",
  "block_snapshot",
] as const;

export type FlowStreamEventContext = FlowStreamPlanEventContext;

/** Parse a single SSE event body and route it into Redux / the block store. */
export function handleFlowEvent(
  raw: string,
  eventType: string,
  seq: string | undefined,
  ctx: FlowStreamEventContext,
): void {
  let event: FlowEvent;
  try {
    event = JSON.parse(raw) as FlowEvent;
  } catch {
    return;
  }

  if (seq) {
    ctx.dispatch(setLastSeq(seq));
  } else if (event.seq) {
    ctx.dispatch(setLastSeq(event.seq));
  }

  const messageType = event.event_type ?? eventType;
  // SSE payloads arrive flat (no nested .data wrapper). Fall back to the
  // full event object when .data is absent.
  const data = (event.data ?? (event as unknown as Record<string, unknown>)) as Record<
    string,
    unknown
  >;

  // Stale-correlation guard: drop events for a correlation we have
  // already moved on from. Connection-level events (no correlation)
  // always pass through.
  const isStale =
    !!event.correlation_id &&
    ctx.correlationIdRef.current !== null &&
    event.correlation_id !== ctx.correlationIdRef.current;

  if (isBlockEventType(messageType)) {
    handleBlockEvent(messageType, data, event as unknown as Record<string, unknown>, isStale, ctx);
    return;
  }

  handlePlanEvent(messageType, data, event, isStale, ctx);
}
