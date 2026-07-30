"use client";

import { useCallback, useMemo, useState, type RefObject } from "react";
import { capitalizeQueryText, parseTraceData } from "./traceDataParser";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { setError as setStreamError } from "@/features/queryTrace/flowStreamSlice";
import type { PendingApproval } from "@/features/approvals/approvalsSlice";
import TraceHeader from "./TraceHeader";
import FinalResponseCard from "./FinalResponseCard";
import AgentTraceView from "./agentTrace/AgentTraceView";
import ApprovalRequestCard from "./ApprovalRequestCard";
import TracePanelStateSkeleton from "./skeletons/TracePanelStateSkeleton";
import ReconnectBanner from "./skeletons/ReconnectBanner";
import TracePanelStateView, { type TracePanelStateVariant } from "./TracePanelStateView";
import LiveBlockStream from "./blocks/LiveBlockStream";
import InterruptionOverlay from "./blocks/InterruptionOverlay";
import { useBlockStream } from "./blockStream/useBlockStream";
import {
  areAllBlocksTerminal,
  deriveTracePanelStatus,
  hasFailedBlocks,
  hasStreamingBlocks,
} from "./deriveTraceStatus";
import {
  isAwaitingPlanApproval,
  isFinalResponsePlaceholder,
  isPlanExecuting,
} from "./planTransitionMessages";
import { isFlowSnapshotCompleted } from "./flowSnapshotAdapter";
import { getSupplementalAgents } from "./flowTraceMerge";
import { computeShowV2Stream } from "./queryTraceV2Gating";
import { resolveFlowDisplayQuery } from "@/utils/resolveFlowDisplayQuery";
import { useTracePanelHydration } from "./useTracePanelHydration";
import { useEmptyTraceFallback } from "./useEmptyTraceFallback";
import { derivePanelStatus, parseTimestampMs } from "./queryTracePanelHelpers";
import styles from "./QueryTracePanel.module.css";

interface QueryTracePanelProps {
  correlationId: string;
  teamId: string;
  apiBase?: string;
  score?: number | null | undefined;
  /**
   * Persisted display status of the flow from the sidebar list (e.g.
   * ``completed``/``failed``/``executing``). When it maps to a terminal
   * state, the panel renders the final styling immediately on reopen
   * instead of flashing the loading skeleton or the reconnect/empty view.
   */
  knownStatus?: string | null;
  /** Handler for approving pending HITL requests */
  onApprove?: (approvalId: string, reason?: string) => Promise<void>;
  /** Handler for denying pending HITL requests */
  onDeny?: (approvalId: string, reason?: string) => Promise<void>;
  /** Handler for the v2 interruption overlay's "Approve" button. */
  onInterruptionApprove?: () => void;
  /** Handler for the v2 interruption overlay's "Reject" button. */
  onInterruptionReject?: () => void;
  /** Whether the current user has permission to approve/deny. */
  canApprove?: boolean;
  /** Re-fetch flow snapshot from REST (owned by useFlowStream). */
  onRefreshSnapshot?: (correlationId: string) => void;
  /** Scroll container ref for auto-scroll from the parent dashboard. */
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Main panel for displaying query execution trace.
 *
 * Trace data is merged from REST snapshots (baseline), SSE flow_state,
 * and the v2 block store. v2 shows live orchestrator blocks; v1 fills
 * in delegated agents missing from the block stream.
 *
 * `.cursor/skills/sans-effect` note: the Vite original had 5 `useEffect`
 * calls in this component. One (`wsFlowDataRef.current = wsFlowData`)
 * was dead code — the ref was written but never read anywhere in the
 * file — so it is dropped entirely rather than ported. The remaining
 * four are covered by `useTracePanelHydration` (the SSE-latch +
 * cross-slice approvals dispatch, plus the correlationId reset done
 * via render-time state adjustment instead of an effect, plus the
 * v2-blocks-ready flip folded into a derived boolean) and
 * `useEmptyTraceFallback` (the timeout-based empty-state fallback) —
 * see those two files' doc comments for the per-effect classification.
 */
function QueryTracePanel({
  correlationId,
  score,
  onApprove,
  onDeny,
  onInterruptionApprove,
  onInterruptionReject,
  canApprove: canApproveProp = true,
  onRefreshSnapshot,
  scrollContainerRef,
  knownStatus,
}: QueryTracePanelProps) {
  const dispatch = useAppDispatch();
  const [isRetrying, setIsRetrying] = useState(false);
  // KYAI evaluation opens as a modal on /workflows. Legacy
  // /kyai/sessions/:correlationId links redirect there automatically.
  // Opening in a new tab keeps the trace page open for reference.

  // Read flow data from the SSE flow-stream Redux slice (real-time, no polling)
  const wsFlowData = useAppSelector((s) => s.flowStream.flowData) as Record<string, unknown> | null;
  const wsConnected = useAppSelector((s) => s.flowStream.connected);
  const streamError = useAppSelector((s) => s.flowStream.error);
  // `activeConversationQuery` was a confirmed-dead field in the Vite
  // source (its only write call site is block-commented out — "reserved
  // for future multi-turn UI") and was intentionally not pulled forward
  // into `flowStreamSlice.ts`; always empty here, kept as `null` so
  // `resolveFlowDisplayQuery`'s resolution order still matches.
  const activeQuery: string | null = null;
  const planBundle = useAppSelector((s) => s.flowStream.planBundle);
  const queryStatus = useAppSelector((s) => s.flowStream.queryStatus);
  const planQuery = planBundle?.query ?? null;

  // Subscribe to the PRD v2 block store so we can pick the right
  // renderer. We only mount the LiveBlockStream (v2) once actual
  // execution blocks exist — a bare phase-change agent_frame event
  // (e.g. phase: 'planning', no blocks) must NOT suppress the v1
  // AgentTraceView, otherwise the Operations Manager's reasoning,
  // tool calls, and plan details are hidden behind an empty canvas.
  //
  // Exception: legacy plan approvals (submit_for_approval) are
  // handled by PlanApprovalCard in the v1 layout, so we also skip
  // v2 when the interruption is for that tool.
  const blockSnapshot = useBlockStream();
  const isLegacyPlanInterruption =
    blockSnapshot.phase === "interruption_awaited" &&
    blockSnapshot.interruption?.tool_name === "submit_for_approval" &&
    blockSnapshot.order.length === 0;

  // V2 (LiveBlockStream) is the SSE-driven renderer for any flow that
  // produced blocks — live, completed, or replayed via block_snapshot.
  // The block store accumulates every agent (orchestrator + sub-agents
  // forwarded over SSE), so it shows the full hierarchy without any
  // REST re-fetch. The V1 AgentTraceView below is only the fallback for
  // flows that produced zero blocks (legacy flows with no persisted
  // block stream), driven by the single flow_state snapshot.
  const v2CorrelationMatch = blockSnapshot.correlation_id === correlationId;
  const v2HasRenderableBlocks = blockSnapshot.order.length > 0;

  const showV2Stream = computeShowV2Stream({
    isLegacyPlanInterruption,
    blockOrderLength: blockSnapshot.order.length,
    blockCorrelationId: blockSnapshot.correlation_id,
    flowCorrelationId: correlationId,
  });

  const {
    traceData,
    loading,
    setLoading,
    snapshotHydrated,
    error,
    setError,
    pendingApprovals,
    setPendingApprovals,
  } = useTracePanelHydration({
    correlationId,
    wsFlowData,
    dispatch,
    v2Ready: v2HasRenderableBlocks && v2CorrelationMatch,
  });

  const v1Agents = useMemo(() => {
    if (traceData?.agents.length) {
      return traceData.agents;
    }
    if (!wsFlowData) {
      return [];
    }
    const flowCorrelationId = (wsFlowData as { correlation_id?: string }).correlation_id;
    if (flowCorrelationId !== correlationId) {
      return [];
    }
    return parseTraceData(wsFlowData).agents;
  }, [traceData, wsFlowData, correlationId]);

  const supplementalAgents = useMemo(
    () => getSupplementalAgents(v1Agents, blockSnapshot),
    [v1Agents, blockSnapshot],
  );

  const showSupplementalV1 = showV2Stream && supplementalAgents.length > 0;

  const handleRetry = useCallback(() => {
    if (!correlationId) return;

    setIsRetrying(true);
    setError(null);
    dispatch(setStreamError(null));
    setLoading(true);

    onRefreshSnapshot?.(correlationId);
    setIsRetrying(false);
    setLoading(false);
  }, [correlationId, dispatch, onRefreshSnapshot, setError, setLoading]);

  const resolveTraceStateVariant = useCallback((): TracePanelStateVariant => {
    if (error || streamError) return "failed";
    if (!wsConnected) return "disconnected";
    return "empty";
  }, [error, streamError, wsConnected]);

  // Derived values for the v2 TraceHeader — kept outside the
  // conditional so hooks always run in the same order.
  const v2FirstBlock =
    blockSnapshot.order.length > 0 ? blockSnapshot.byId[blockSnapshot.order[0]] : null;

  const v2Status = useMemo(() => {
    return deriveTracePanelStatus({
      planStatus: planBundle?.status,
      phase: blockSnapshot.phase,
      queryStatus,
      hasStreamingBlocks: hasStreamingBlocks(blockSnapshot),
      hasFailedBlocks: hasFailedBlocks(blockSnapshot),
      hasBlocks: blockSnapshot.order.length > 0,
      allBlocksTerminal: areAllBlocksTerminal(blockSnapshot),
      finalResponseStatus: traceData?.final_response?.status,
    });
  }, [blockSnapshot, planBundle, queryStatus, traceData]);
  const v2IsInProgress =
    v2Status !== "completed" && v2Status !== "failed" && v2Status !== "rejected";
  const v2StartTimeMs = v2FirstBlock?.created_at ?? null;
  const v2ElapsedMs = useMemo(() => {
    if (!v2StartTimeMs) {
      return 0;
    }
    return Date.now() - v2StartTimeMs;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- blockSnapshot.version bumps on every flush; that's the real "recompute now" trigger, not a value the expression reads directly.
  }, [v2StartTimeMs, blockSnapshot.version]);
  const v2Timestamp = useMemo(() => {
    if (v2StartTimeMs) {
      return new Date(v2StartTimeMs).toISOString();
    }
    const flowCreated = (wsFlowData as { created_at?: string } | null)?.created_at;
    if (flowCreated) {
      return flowCreated;
    }
    return new Date().toISOString();
  }, [v2StartTimeMs, wsFlowData]);
  const v2QueryText = capitalizeQueryText(
    resolveFlowDisplayQuery(planQuery ? { query: planQuery } : null, {
      activeConversationQuery: activeQuery,
      planBundle,
      flowData: wsFlowData,
      traceAgents: traceData?.agents,
    }) || "Query",
  );
  const v2PlanExecuting = isPlanExecuting(queryStatus, planBundle?.status, blockSnapshot.phase);

  // Extract the final orchestrator text block when the flow is done
  // so it renders as a dedicated FinalResponseCard below the stream.
  const v2FinalResponse = useMemo(() => {
    const candidates = blockSnapshot.order
      .map((id) => blockSnapshot.byId[id])
      .filter(
        (b) => b && b.kind === "text" && !b.parent_id && (b.locked || b.status === "complete"),
      );
    const last = candidates[candidates.length - 1];
    if (last && last.kind === "text") {
      const content = last.content?.trim();
      if (content && !isFinalResponsePlaceholder(content)) {
        return { id: last.id, content };
      }
    }

    const fallbackContent = traceData?.final_response?.content?.trim();
    if (fallbackContent && !isFinalResponsePlaceholder(fallbackContent)) {
      return { id: "rest-final-response", content: fallbackContent };
    }

    return null;
  }, [blockSnapshot, traceData]);

  const hasRenderableContent =
    showV2Stream ||
    Boolean(traceData?.agents.length) ||
    (v2HasRenderableBlocks && v2CorrelationMatch);

  // Map the persisted flow status into a terminal trace-panel status.
  // A terminal flow is already finished, so on reopen the panel must show
  // the final styling deterministically rather than racing the retained
  // block store / REST re-hydration and flashing the loading skeleton.
  const knownTerminalStatus = useMemo(() => {
    const s = knownStatus?.trim().toLowerCase();
    if (!s) return null;
    if (s === "completed" || s === "complete" || s === "done" || s === "success") {
      return "completed";
    }
    if (s === "failed" || s === "error") return "failed";
    if (s === "rejected" || s === "reject") return "rejected";
    return null;
  }, [knownStatus]);

  // A terminal persisted status is authoritative for a replayed flow: it
  // pins the header to the final state so a late SSE re-emit of already
  // completed blocks cannot briefly flip it back to in-progress.
  const displayV2Status = knownTerminalStatus ?? v2Status;
  const displayV2InProgress = knownTerminalStatus ? false : v2IsInProgress;

  const hydrationSettled = snapshotHydrated || wsConnected || hasRenderableContent;

  const isPanelLoading =
    !hasRenderableContent && loading && !error && !streamError && !knownTerminalStatus;

  // After SSE connect or REST hydration via useFlowStream, stop showing
  // the skeleton when the flow truly has no persisted trace data.
  useEmptyTraceFallback({
    hydrationSettled,
    loading,
    hasRenderableContent,
    wsConnected,
    setLoading,
  });

  const renderTraceShell = (body: React.ReactNode, overlay?: React.ReactNode) => (
    <div className={styles.tracePanel}>
      <div className={styles.tracePanelBody} ref={scrollContainerRef}>
        {body}
      </div>
      {overlay}
    </div>
  );

  if (isPanelLoading) {
    return <TracePanelStateSkeleton correlationId={correlationId} />;
  }

  // Hybrid v2 layout: live block stream for the orchestrator plus v1
  // trace sections for delegated agents missing from the block store.
  if (showV2Stream) {
    return renderTraceShell(
      <>
        {!wsConnected && <ReconnectBanner state="connecting" />}
        <TraceHeader
          query={v2QueryText || "Query"}
          queryId={correlationId}
          timestamp={v2Timestamp}
          status={displayV2Status}
          totalDuration={v2ElapsedMs}
          isInProgress={displayV2InProgress}
          startTimeMs={v2StartTimeMs}
          onKyaiClick={
            score != null
              ? () =>
                  window.open(
                    `/kyai/sessions/${encodeURIComponent(correlationId)}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
              : undefined
          }
          score={score}
        />
        <div className={styles.blockStreamWrap}>
          <LiveBlockStream
            excludeBlockId={v2FinalResponse?.id ?? null}
            isLive={displayV2InProgress}
            planExecuting={v2PlanExecuting}
            supplementalAgents={showSupplementalV1 ? supplementalAgents : []}
          />
        </div>
        {v2FinalResponse && <FinalResponseCard content={v2FinalResponse.content} />}
      </>,
      <InterruptionOverlay onApprove={onInterruptionApprove} onReject={onInterruptionReject} />,
    );
  }

  if (!traceData || traceData.agents.length === 0) {
    const finalOnly = traceData?.final_response;
    if (finalOnly?.content?.trim()) {
      const query = capitalizeQueryText(
        resolveFlowDisplayQuery(null, {
          activeConversationQuery: activeQuery,
          planBundle,
          flowData: wsFlowData,
          traceAgents: [],
        }) || "Cron execution",
      );
      const timestamp = finalOnly.created_at || new Date().toISOString();
      const status = derivePanelStatus(
        planBundle?.status,
        queryStatus,
        false,
        false,
        finalOnly.status,
      );
      return renderTraceShell(
        <>
          <TraceHeader
            query={query}
            queryId={correlationId}
            timestamp={timestamp}
            status={status}
            totalDuration={traceData?.total_duration_ms || 0}
            score={score}
          />
          <FinalResponseCard content={finalOnly.content} />
        </>,
      );
    }

    // Terminal flow being reopened while its blocks/trace re-hydrate:
    // show the final-styled header immediately instead of the reconnect
    // or empty view. The full v2/v1 layout takes over once content lands.
    if (knownTerminalStatus && !error && !streamError) {
      return renderTraceShell(
        <TraceHeader
          query={v2QueryText || "Query"}
          queryId={correlationId}
          timestamp={v2Timestamp}
          status={knownTerminalStatus}
          totalDuration={v2ElapsedMs}
          isInProgress={false}
          score={score}
        />,
      );
    }

    const stateVariant = resolveTraceStateVariant();
    const stateError = error || streamError;

    return renderTraceShell(
      <>
        {!wsConnected && stateVariant !== "failed" && (
          <ReconnectBanner state="connecting" onRetry={handleRetry} />
        )}
        <TracePanelStateView
          variant={stateVariant}
          correlationId={correlationId}
          error={stateError}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />
      </>,
    );
  }

  const firstAgent = traceData.agents[0];
  const query = capitalizeQueryText(
    resolveFlowDisplayQuery(firstAgent?.query ? { query: firstAgent.query } : null, {
      activeConversationQuery: activeQuery,
      planBundle,
      flowData: wsFlowData,
      traceAgents: traceData.agents,
    }) || "Unknown query",
  );
  const timestamp = firstAgent?.created_at || new Date().toISOString();
  const v1StartTimeMs = parseTimestampMs(firstAgent?.created_at);

  // Determine overall status: if any agent is processing, show processing
  const hasProcessing = traceData.agents.some(
    (agent) => agent.status === "processing" || !agent.completed_at,
  );
  const hasFailed = traceData.agents.some(
    (agent) => agent.status === "failed" || agent.status === "error",
  );

  const status = derivePanelStatus(
    planBundle?.status,
    queryStatus,
    hasProcessing,
    hasFailed,
    traceData.final_response?.status,
  );

  const displayQueryId = correlationId;
  const flowSnapshotCompleted = wsFlowData ? isFlowSnapshotCompleted(wsFlowData) : false;
  const awaitingPlanApproval =
    !flowSnapshotCompleted &&
    isAwaitingPlanApproval(
      queryStatus,
      planBundle?.status,
      traceData.final_response?.status,
      blockSnapshot.phase,
    );
  const planExecuting = isPlanExecuting(queryStatus, planBundle?.status, blockSnapshot.phase);

  // Default handlers for approval actions if not provided
  const handleApprove = async (approvalId: string, reason?: string) => {
    if (onApprove) {
      await onApprove(approvalId, reason);
      // Remove from local state after successful approval
      setPendingApprovals((prev) => prev.filter((a) => a.approval_id !== approvalId));
    }
  };

  const handleDeny = async (approvalId: string, reason?: string) => {
    if (onDeny) {
      await onDeny(approvalId, reason);
      // Remove from local state after successful denial
      setPendingApprovals((prev) => prev.filter((a) => a.approval_id !== approvalId));
    }
  };

  return renderTraceShell(
    <>
      <TraceHeader
        query={query}
        queryId={displayQueryId}
        timestamp={timestamp}
        status={status}
        totalDuration={traceData.total_duration_ms}
        isInProgress={status !== "completed" && status !== "failed" && status !== "rejected"}
        startTimeMs={v1StartTimeMs}
        onKyaiClick={() =>
          window.open(
            `/kyai/sessions/${encodeURIComponent(correlationId)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
        score={score}
      />

      {/*
        Show a reconnect banner while the live SSE stream is down but the
        flow is still in progress. The banner is layout-stable — its
        height is fixed so the trace panel does not jump.
      */}
      {!wsConnected && hasProcessing && <ReconnectBanner state="connecting" />}

      {/* Pending Approval Requests — hidden once the plan has a
          definitive decision so stale cards don't linger after
          plan_decision SSE arrives. */}
      {pendingApprovals.length > 0 &&
        !flowSnapshotCompleted &&
        planBundle?.status?.toLowerCase() !== "approved" &&
        planBundle?.status?.toLowerCase() !== "rejected" &&
        planBundle?.status?.toLowerCase() !== "executing" &&
        planBundle?.status?.toLowerCase() !== "completed" &&
        planBundle?.status?.toLowerCase() !== "failed" && (
          <div className={styles.approvalsSection}>
            {pendingApprovals.map((approval: PendingApproval) => (
              <ApprovalRequestCard
                key={approval.approval_id}
                approval={approval}
                onApprove={handleApprove}
                onDeny={handleDeny}
                disabled={!canApproveProp || !onApprove || !onDeny}
              />
            ))}
          </div>
        )}

      {/* v1 legacy renderer — v2 path already returned above. */}
      <AgentTraceView
        agents={traceData.agents}
        awaitingPlanApproval={awaitingPlanApproval}
        planExecuting={planExecuting}
      />

      {!awaitingPlanApproval &&
        !planExecuting &&
        (() => {
          const finalContent = traceData.final_response?.content?.trim() || "";

          if (traceData.final_response && !isFinalResponsePlaceholder(finalContent)) {
            return <FinalResponseCard content={traceData.final_response.content} />;
          }

          return null;
        })()}
    </>,
  );
}

export default QueryTracePanel;
