"use client";

/**
 * SSE (Server-Sent Events) hook for the Agentic Team dashboard.
 *
 * Transport split:
 * - v1 (Redux `flowStream` slice): plan bundle, trace metadata,
 *   queryStatus, HITL.
 * - v2 (`blockStore`): live rendering via `agent_frame` + `block_*` events.
 *
 * REST hydration is centralized here; consumers read Redux + `blockStore`
 * only. Decomposed from the Vite app's 1755-LOC `hooks/useFlowStream.ts`
 * into: `flowStreamHelpers.ts` (shared constants/pure helpers),
 * `flowStreamRestHydration.ts` (REST baseline hydration),
 * `flowStreamPlanEvents.ts` / `flowStreamBlockEvents.ts` (the v1/v2 event
 * switch, split further), `flowStreamEventRouter.ts` (top-level dispatch),
 * `useFlowStreamConnection.ts` (EventSource lifecycle — owns the one
 * sanctioned `useEffect`), and `useFlowsListPagination.ts` (Query History
 * pagination). This file is the slim orchestrator composing all of them.
 *
 * Zero-`useEffect` discipline: the five ref-mirror effects in the Vite
 * source (`teamIdRef`, `historyModeRef`, `correlationIdRef`, `lastSeqRef`,
 * `flowDataRef`) are replaced by `useLatestRef` (mirrors during render,
 * no effect — see that hook's doc comment). The history-mode-toggle
 * effect became the explicit `setHistoryMode` callback returned by
 * `useFlowsListPagination`. The one remaining effect (team-switch
 * SSE connect/disconnect + flows-list poll) is the sanctioned exception,
 * isolated in `useFlowStreamConnection.ts`.
 */
import { useCallback, useMemo, useRef } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useLatestRef } from "@/hooks/useLatestRef";
import {
  addFlowToList,
  patchPlanBundle,
  setConnected as setConnectedAction,
  setCorrelationId,
  setError,
  setFlowData,
  setPlanBundle,
  setQueryStatus,
  setSessionId,
} from "@/features/queryTrace/flowStreamSlice";
import { addApprovals, removeApproval } from "@/features/approvals/approvalsSlice";
import {
  resumeFlow as resumeFlowRequest,
  submitDecision as submitDecisionRequest,
  submitQuery as submitQueryRequest,
  type SubmitQueryResponse,
} from "./flowStreamApi";
import { hydrateBlocksFromRest, hydrateFlowFromRest } from "./flowStreamRestHydration";
import { useFlowStreamConnection } from "./useFlowStreamConnection";
import { useFlowsListPagination, type FlowHistoryMode } from "./useFlowsListPagination";
import type { FlowStreamEventContext } from "./flowStreamEventRouter";
import {
  formatFlowApiError,
  PLAN_APPROVAL_ID,
  type DecisionSubmitResult,
} from "./flowStreamHelpers";
import type { FlowPayload } from "./flowPayload.types";

export { PLAN_APPROVAL_ID };
export type { DecisionSubmitResult };

export interface UseFlowStreamResult {
  /** True once the EventSource has reached OPEN. */
  connected: boolean;
  /** Submit a new query via REST; auto-opens the SSE stream. */
  submitQuery: (
    query: string,
    sessionId?: string,
    correlationId?: string,
  ) => Promise<SubmitQueryResponse | null>;
  /** Subscribe to an existing flow by correlation_id (opens SSE). */
  subscribeToFlow: (correlationId: string) => void;
  /** Re-fetch flow snapshot (and blocks when completed) from REST. */
  refreshFlowSnapshot: (correlationId: string) => void;
  /** Refresh recent flows via REST. */
  refreshFlowsList: (
    limit?: number,
    status?: string | null,
    replace?: boolean,
    cursor?: string | null,
    sourceFilter?: { source?: string | null; excludeSource?: string | null },
  ) => Promise<void>;
  /** Load the next page of Query History (when a next cursor is set). */
  loadMoreFlows: () => Promise<void>;
  /** Cursor for pagination; null when no more pages. */
  flowsListNextCursor: string | null;
  /** True while the first page of flows is loading. */
  flowsListLoading: boolean;
  /** Switch between Queries / Cron Jobs history and refresh immediately. */
  setHistoryMode: (mode: FlowHistoryMode) => void;
  /** Submit plan approve/reject decision via REST. */
  submitDecision: (
    decision: "approve" | "reject",
    reason?: string,
  ) => Promise<DecisionSubmitResult>;
  /** Resume a halted flow (interruption protocol). */
  resumeFlow: (decision?: "approve" | "reject") => Promise<boolean>;
  /** Close the EventSource and clear connected state. */
  disconnect: () => void;
}

/**
 * Hook that manages an SSE flow stream for a specific team/cluster.
 * Auto-resets state on cluster switch; reconnects with exponential
 * backoff on transient failures.
 *
 * @param teamId - The team/cluster identifier used as the URL prefix.
 *   Changing this disconnects from the old team and resets the slice.
 * @param historyMode - Only used for the very first flows-list fetch
 *   (mount / team switch). To change it later, call the returned
 *   `setHistoryMode` — see that function's doc comment for why this is
 *   no longer a reactively-watched prop.
 */
export function useFlowStream(
  teamId: string,
  historyMode: FlowHistoryMode = "queries",
): UseFlowStreamResult {
  const dispatch = useAppDispatch();

  const teamIdRef = useLatestRef(teamId);
  const reduxCorrelationId = useAppSelector((s) => s.flowStream.correlationId);
  const planBundleCorrelationId = useAppSelector((s) => s.flowStream.planBundle?.correlation_id);
  const flowDataCorrelationId = useAppSelector((s) => s.flowStream.flowData?.correlation_id);
  const reduxFlowData = useAppSelector((s) => s.flowStream.flowData);
  const reduxLastSeq = useAppSelector((s) => s.flowStream.lastSeq);
  const connected = useAppSelector((s) => s.flowStream.connected);

  const correlationIdRef = useLatestRef(reduxCorrelationId);
  const flowDataRef = useLatestRef<FlowPayload | null>(reduxFlowData);
  const lastSeqRef = useLatestRef(reduxLastSeq);
  const currentCorrelationRef = useRef<string | null>(null);
  const flowStateReceivedRef = useRef(false);
  const restHydrateAbortRef = useRef<AbortController | null>(null);
  const restFallbackTimerRef = useRef<number | null>(null);

  const {
    refreshFlowsList,
    loadMoreFlows,
    setHistoryMode,
    flowsListNextCursor,
    flowsListLoading,
    listFlowsAbortRef,
    listFlowsGenerationRef,
  } = useFlowsListPagination(teamIdRef, historyMode);

  const hydrateBlocksForFlow = useCallback(
    (correlationId: string) => {
      const abort = restHydrateAbortRef.current;
      void hydrateBlocksFromRest(
        teamIdRef.current,
        correlationId,
        () => currentCorrelationRef.current === correlationId,
        abort?.signal,
      );
    },
    [teamIdRef],
  );

  const startRestHydrate = useCallback(
    (correlationId: string, options: { immediate?: boolean; includeBlocks?: boolean } = {}) => {
      if (restHydrateAbortRef.current) {
        restHydrateAbortRef.current.abort();
      }
      if (restFallbackTimerRef.current !== null) {
        window.clearTimeout(restFallbackTimerRef.current);
        restFallbackTimerRef.current = null;
      }
      const abort = new AbortController();
      restHydrateAbortRef.current = abort;

      const runHydrate = (includeBlocks: boolean) => {
        void hydrateFlowFromRest(
          teamIdRef.current,
          correlationId,
          dispatch,
          () => flowDataRef.current,
          () => currentCorrelationRef.current === correlationId,
          { signal: abort.signal, includeBlocks },
        );
      };

      if (options.immediate) {
        runHydrate(Boolean(options.includeBlocks));
        return;
      }

      restFallbackTimerRef.current = window.setTimeout(() => {
        restFallbackTimerRef.current = null;
        if (!flowStateReceivedRef.current && currentCorrelationRef.current === correlationId) {
          runHydrate(false);
        }
      }, 3000);
    },
    [dispatch, flowDataRef, teamIdRef],
  );

  const resolveCorrelationId = useCallback((): string | null => {
    return (
      correlationIdRef.current ??
      reduxCorrelationId ??
      planBundleCorrelationId ??
      flowDataCorrelationId ??
      null
    );
  }, [correlationIdRef, reduxCorrelationId, planBundleCorrelationId, flowDataCorrelationId]);

  const eventContext: FlowStreamEventContext = useMemo(
    () => ({
      dispatch,
      teamIdRef,
      correlationIdRef,
      flowDataRef,
      flowStateReceivedRef,
      hydrateBlocksForFlow,
    }),
    [dispatch, teamIdRef, correlationIdRef, flowDataRef, hydrateBlocksForFlow],
  );

  const { openStream, disconnect } = useFlowStreamConnection({
    teamId,
    eventContext,
    currentCorrelationRef,
    lastSeqRef,
    refreshFlowsList,
    listFlowsAbortRef,
    listFlowsGenerationRef,
  });

  // Subscribe to an existing flow (Recent Flows click).
  const subscribeToFlow = useCallback(
    (correlationId: string) => {
      // Reset the last-sequence ref so the new flow's SSE connection
      // starts fresh — we must not send the previous flow's seq ID.
      lastSeqRef.current = null;
      correlationIdRef.current = correlationId;
      dispatch(setCorrelationId(correlationId));
      // Signal disconnected immediately so a consumer's loading timeout
      // re-arms and a reconnect banner shows during the gap.
      dispatch(setConnectedAction(false));
      // Clear stale flow data and plan so the previous flow's snapshot
      // never re-renders while the new SSE stream sends its flow_state.
      dispatch(setFlowData(null));
      dispatch(setPlanBundle(null));
      flowStateReceivedRef.current = false;
      openStream(correlationId);
      startRestHydrate(correlationId, { immediate: true, includeBlocks: true });
    },
    [correlationIdRef, dispatch, lastSeqRef, openStream, startRestHydrate],
  );

  // Submit a new query (REST + open SSE).
  const submitQuery = useCallback(
    async (
      query: string,
      sessionId?: string,
      correlationId?: string,
    ): Promise<SubmitQueryResponse | null> => {
      dispatch(setQueryStatus("submitting"));
      try {
        const result = await submitQueryRequest(teamIdRef.current, {
          query,
          session_id: sessionId,
          correlation_id: correlationId,
        });
        dispatch(setSessionId(result.session_id));
        correlationIdRef.current = result.correlation_id;
        dispatch(setCorrelationId(result.correlation_id));
        dispatch(setQueryStatus("processing"));
        // Optimistic row: show the flow in the list immediately rather
        // than waiting for the next refreshFlowsList round-trip.
        dispatch(
          addFlowToList({
            teamId: teamIdRef.current,
            flow: {
              session_id: result.session_id,
              correlation_id: result.correlation_id,
              query: query.slice(0, 100),
              status: "active",
              created_at: new Date().toISOString(),
              completed_at: null,
              evaluation_status: undefined,
              score: null,
            },
          }),
        );
        if (result.pending_approvals && result.pending_approvals.length > 0) {
          dispatch(addApprovals(result.pending_approvals));
        }
        openStream(result.correlation_id);
        startRestHydrate(result.correlation_id);
        return result;
      } catch (err) {
        dispatch(setQueryStatus("error"));
        dispatch(setError(err instanceof Error ? err.message : "Submit failed"));
        return null;
      }
    },
    [correlationIdRef, dispatch, openStream, startRestHydrate, teamIdRef],
  );

  const refreshFlowSnapshot = useCallback(
    (correlationId: string) => {
      startRestHydrate(correlationId, { immediate: true, includeBlocks: true });
    },
    [startRestHydrate],
  );

  const submitDecision = useCallback(
    async (decision: "approve" | "reject", reason?: string): Promise<DecisionSubmitResult> => {
      const cid = resolveCorrelationId();
      if (!cid) {
        return { ok: false, message: "No active flow. Re-open the flow and try again." };
      }
      try {
        await submitDecisionRequest(teamIdRef.current, cid, decision, reason);
        if (decision === "approve") {
          dispatch(removeApproval(PLAN_APPROVAL_ID));
          dispatch(patchPlanBundle({ status: "approved" }));
          dispatch(setQueryStatus("approved"));
        } else {
          dispatch(patchPlanBundle({ status: "rejected" }));
          dispatch(setQueryStatus("completed"));
        }
        return { ok: true };
      } catch (err) {
        const message = formatFlowApiError(err);
        dispatch(setError(message));
        return { ok: false, message };
      }
    },
    [dispatch, resolveCorrelationId, teamIdRef],
  );

  const resumeFlow = useCallback(
    async (decision: "approve" | "reject" = "approve"): Promise<boolean> => {
      const cid = correlationIdRef.current;
      if (!cid) return false;
      try {
        await resumeFlowRequest(teamIdRef.current, cid, decision);
        return true;
      } catch (err) {
        dispatch(setError(err instanceof Error ? err.message : "Resume failed"));
        return false;
      }
    },
    [correlationIdRef, dispatch, teamIdRef],
  );

  return {
    connected,
    submitQuery,
    subscribeToFlow,
    refreshFlowSnapshot,
    refreshFlowsList,
    loadMoreFlows,
    flowsListNextCursor,
    flowsListLoading,
    setHistoryMode,
    submitDecision,
    resumeFlow,
    disconnect,
  };
}
