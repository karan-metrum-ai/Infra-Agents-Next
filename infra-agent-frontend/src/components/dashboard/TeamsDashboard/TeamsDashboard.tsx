"use client";

/**
 * The real "Agentic Team" experience: a 3-panel split (digital twin / org
 * chart + chat / query history & trace), replacing `AgentTeamView`'s
 * standalone use as the Teams-tab's top-level view (it's still reused here
 * as the middle panel's canvas). Ported from the Vite source's
 * `TeamsDashboard.tsx` split layout — see that file's own doc comments in
 * this app's `AgentTeamView.tsx`/`useFlowStream.ts`/`QueryTracePanel.tsx`
 * for the multi-phase dependency chain this was waiting on.
 *
 * The Vite source's `InvestigationActionFlow` (meant to replace the org
 * chart during a live query) never actually existed there — confirmed via
 * full git history search — so the org chart panel stays mounted
 * throughout and instead lights up the active agent's pulsing aura via
 * `AgentTeamView`'s `activeAgentName` prop.
 */

import { useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { selectMostRecentDeployedClusterId } from "@/features/workflows/workflowCanvasSelectors";
import { useGetDigitalTwinDataQuery } from "@/features/digitalTwin/digitalTwinApi";
import { transformApiToGlobeSites } from "@/features/digitalTwin/digitalTwinDataTransform";
import { resolveTelemetryClusterId } from "@/components/DigitalTwin/rackUtils";
import { AgentTeamView } from "@/components/dashboard/AgentTeamView/AgentTeamView";
import { SiteRoomView } from "@/components/dashboard/SiteRoomView/SiteRoomView";
import { QueryHistoryPanel } from "@/components/dashboard/QueryHistoryPanel/QueryHistoryPanel";
import { ChatPanel } from "@/components/ChatPanel/ChatPanel";
import QueryTracePanel from "@/components/QueryTrace/QueryTracePanel";
import { useActiveBlockId, useBlock } from "@/components/QueryTrace/blockStream/useBlockStream";
import { useFlowStream } from "@/components/QueryTrace/useFlowStream";
import { flowStatusCategory } from "@/components/QueryTrace/flowStreamApi";
import {
  selectFlowStreamCorrelationId,
  selectFlowStreamQueryStatus,
  selectFlowsList,
  selectFlowsListLoading,
} from "@/features/queryTrace/flowStreamSelectors";
import type { FlowListItem } from "@/components/QueryTrace/flowPayload.types";
import styles from "./TeamsDashboard.module.css";
import type { TeamsDashboardProps } from "./TeamsDashboard.types";

const MIN_TRACE_PANEL_WIDTH = 24;
const MAX_TRACE_PANEL_WIDTH = 55;
const DEFAULT_TRACE_PANEL_WIDTH = 34;

export function TeamsDashboard({ clusterId }: TeamsDashboardProps) {
  const mostRecentDeployedClusterId = useAppSelector(selectMostRecentDeployedClusterId);
  const effectiveClusterId = clusterId ?? mostRecentDeployedClusterId;

  const { data: rawDigitalTwinData } = useGetDigitalTwinDataQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const sites = useMemo(
    () => (rawDigitalTwinData ? transformApiToGlobeSites(rawDigitalTwinData) : []),
    [rawDigitalTwinData],
  );
  const selectedSite = useMemo(() => {
    if (!effectiveClusterId) return null;
    return (
      sites.find((site) => resolveTelemetryClusterId(null, site) === effectiveClusterId) ?? null
    );
  }, [sites, effectiveClusterId]);

  const flowStream = useFlowStream(effectiveClusterId ?? "");
  const flowsList = useAppSelector(selectFlowsList);
  const flowsListLoading = useAppSelector(selectFlowsListLoading);
  const activeCorrelationId = useAppSelector(selectFlowStreamCorrelationId);
  const queryStatus = useAppSelector(selectFlowStreamQueryStatus);

  const activeBlockId = useActiveBlockId();
  const activeBlock = useBlock(activeBlockId);
  const activeAgentName = activeBlock?.kind === "subagent" ? activeBlock.agent_name : null;

  const [query, setQuery] = useState("");
  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [tracePanelWidth, setTracePanelWidth] = useState(DEFAULT_TRACE_PANEL_WIDTH);

  const isQueryLive = queryStatus
    ? flowStatusCategory({ status: queryStatus, completed_at: null }) === "active"
    : false;

  const handleSelectFlow = (flow: FlowListItem) => {
    setSelectedCorrelationId(flow.correlation_id);
    flowStream.subscribeToFlow(flow.correlation_id);
  };

  const handleSubmit = async (queryText: string) => {
    setQuery("");
    const result = await flowStream.submitQuery(queryText);
    if (result) setSelectedCorrelationId(result.correlation_id);
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await flowStream.loadMoreFlows();
    setIsLoadingMore(false);
  };

  /** Drag-to-resize divider between panels 2 and 3 — purely event-driven, no effect needed. */
  const handleResizeStart = (event: React.MouseEvent) => {
    event.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextWidth = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      setTracePanelWidth(
        Math.max(MIN_TRACE_PANEL_WIDTH, Math.min(MAX_TRACE_PANEL_WIDTH, nextWidth)),
      );
    };
    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  if (!effectiveClusterId) {
    return (
      <div className={styles.emptyState}>
        <p>Select a cluster with an active deployed team.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.splitLayout}
      style={{ "--trace-panel-width": `${tracePanelWidth}%` } as React.CSSProperties}
    >
      <div className={styles.digitalTwinPanel}>
        {selectedSite ? (
          <SiteRoomView site={selectedSite} clusterId={effectiveClusterId} />
        ) : (
          <div className={styles.emptyState}>
            <p>No digital twin data for this cluster yet.</p>
          </div>
        )}
      </div>

      <div className={styles.teamCompositionPanel}>
        <div className={styles.flowCanvasContainer}>
          <AgentTeamView
            clusterId={effectiveClusterId}
            activeAgentName={activeAgentName}
            className={styles.agentTeamViewFill}
          />
        </div>
        <div className={styles.chatBar}>
          <ChatPanel
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            disabled={queryStatus === "submitting"}
            embedded
          />
        </div>
      </div>

      <div className={styles.tracePanelColumn}>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- mouse-drag resize handle; the panel remains fully usable at its default width via keyboard/no drag. */}
        <div
          className={styles.resizeHandle}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
        <div className={styles.tracePanelInner}>
          {selectedCorrelationId ? (
            <div className={styles.tracePanelMain}>
              <div className={styles.tracePanelHeader}>
                <button
                  type="button"
                  className={styles.traceBackButton}
                  onClick={() => setSelectedCorrelationId(null)}
                  aria-label="Back to query history"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <span className={styles.tracePanelTitle}>
                  {isQueryLive ? "Live Query Trace" : "Query Execution Trace"}
                </span>
              </div>
              <QueryTracePanel
                correlationId={selectedCorrelationId}
                teamId={effectiveClusterId}
                onRefreshSnapshot={flowStream.refreshFlowSnapshot}
              />
            </div>
          ) : (
            <QueryHistoryPanel
              flows={flowsList}
              loading={flowsListLoading}
              loadingMore={isLoadingMore}
              hasMore={Boolean(flowStream.flowsListNextCursor)}
              onLoadMore={handleLoadMore}
              activeCorrelationId={isQueryLive ? activeCorrelationId : null}
              onSelectFlow={handleSelectFlow}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamsDashboard;
