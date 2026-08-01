"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/hooks/useAppSelector";
import { selectMostRecentDeployedClusterId } from "@/features/workflows/workflowCanvasSelectors";
import { ErrorOverlay } from "./ErrorOverlay";
import { StatsHeader } from "./StatsHeader";
import { useAgentTeamHealth } from "./useAgentTeamHealth";
import { useClusterTeamGraph } from "./useClusterTeamGraph";
import styles from "./AgentTeamView.module.css";
import type { AgentTeamViewProps } from "./AgentTeamView.types";

/** `@xyflow/react` canvas, dynamically imported per Phase 15 (see `AgentTeamGraphCanvas.tsx`). */
const AgentTeamGraphCanvas = dynamic(
  () => import("./AgentTeamGraphCanvas").then((mod) => mod.AgentTeamGraphCanvas),
  { ssr: false },
);

/**
 * Live view of a cluster's deployed agent team: read-only org-chart canvas
 * plus health/agent-catalog stats, polled every 30s. Embedded as the middle
 * panel of `TeamsDashboard`'s 3-panel split, which drives `activeAgentName`
 * from the live query stream to light up the currently-working agent's
 * pulsing aura (`AgentNode`'s `isLiveAgent`) — the stand-in for the Vite
 * source's `InvestigationActionFlow`, which never actually existed there.
 */
export function AgentTeamView({
  className,
  showControls = true,
  clusterId,
  activeAgentName,
}: AgentTeamViewProps) {
  // Phase 11: when no `cluster` query param is present, fall back to the
  // most-recently-deployed team's cluster id (mirrors the Vite source's
  // `getMostRecentDeployedTeamId()` usage in `TeamsDashboard`/
  // `AgentTeamView`) instead of leaving the view permanently empty.
  // Derived inline (sans-effect Pattern 1) — no effect needed.
  const mostRecentDeployedClusterId = useAppSelector(selectMostRecentDeployedClusterId);
  const effectiveClusterId = clusterId ?? mostRecentDeployedClusterId;

  const { nodes, edges, setNodes, onNodesChange, onEdgesChange, isLoading } =
    useClusterTeamGraph(effectiveClusterId);
  const { teamHealth, agentsStatus, error, clearError } = useAgentTeamHealth(
    effectiveClusterId,
    setNodes,
  );

  const displayNodes = useMemo(() => {
    if (!activeAgentName) return nodes;
    return nodes.map((node) => {
      const isLiveAgent = node.id === activeAgentName;
      if (node.data.isLiveAgent === isLiveAgent) return node;
      return { ...node, data: { ...node.data, isLiveAgent } };
    });
  }, [nodes, activeAgentName]);

  const stats = useMemo(() => {
    const agentNodes = nodes.filter((node) => node.type === "agent");
    const activeAgents = agentNodes.filter((node) => node.data.status === "running");
    return {
      totalAgents: agentNodes.length,
      activeAgents: activeAgents.length,
      teamHealth: teamHealth?.status ?? "unknown",
      apiAgents: agentsStatus?.agents_count ?? 0,
      systemStatus: agentsStatus?.status ?? "unknown",
    };
  }, [nodes, teamHealth, agentsStatus]);

  if (!isLoading && nodes.length === 0) {
    return (
      <div className={cn(styles.agentTeamView, className)}>
        <div className={styles.noDataState}>
          <Users className={styles.noDataIcon} aria-hidden="true" />
          <h3 className={styles.noDataTitle}>No Agent Team</h3>
          <p className={styles.noDataMessage}>
            {effectiveClusterId
              ? "This cluster has no actively deployed team."
              : "Select a cluster with an active deployed team."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.agentTeamView, className)}>
      {showControls && (
        <StatsHeader
          teamHealthStatus={stats.teamHealth}
          systemStatus={stats.systemStatus}
          activeAgents={stats.activeAgents}
          totalAgents={stats.totalAgents}
          apiAgents={stats.apiAgents}
          isPolling={isLoading}
        />
      )}

      <div className={styles.flowContainer}>
        <AgentTeamGraphCanvas
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
        />
      </div>

      {error && <ErrorOverlay message={error} onDismiss={clearError} />}
    </div>
  );
}

export default AgentTeamView;
