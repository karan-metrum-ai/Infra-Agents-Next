"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorOverlay } from "./ErrorOverlay";
import { StatsHeader } from "./StatsHeader";
import { TeamNodePlaceholder } from "./TeamNodePlaceholder";
import { useAgentTeamHealth } from "./useAgentTeamHealth";
import { useClusterTeamGraph } from "./useClusterTeamGraph";
import styles from "./AgentTeamView.module.css";
import type { AgentTeamViewProps } from "./AgentTeamView.types";

const NODE_TYPES = { agent: TeamNodePlaceholder };

/**
 * Live view of a cluster's deployed agent team: read-only org-chart canvas
 * plus health/agent-catalog stats, polled every 30s. This is the interim
 * Teams-tab implementation for Phase 5 — the fuller experience (chat, query
 * history, SSE trace streaming) lives in TeamsDashboard, which depends on
 * Phase 6 (digital-twin panel), Phase 7 (the real AgentNode), and Phase 8
 * (useFlowStream + QueryTrace) all landing first.
 */
export function AgentTeamView({ className, showControls = true, clusterId }: AgentTeamViewProps) {
  const { nodes, edges, setNodes, onNodesChange, onEdgesChange, isLoading } =
    useClusterTeamGraph(clusterId);
  const { teamHealth, agentsStatus, error, clearError } = useAgentTeamHealth(clusterId, setNodes);

  const stats = useMemo(() => {
    const agentNodes = nodes.filter((node) => node.type === "agent");
    const activeAgents = agentNodes.filter(
      (node) => node.data.status === "running" || node.data.status === "active",
    );
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
            {clusterId
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
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              type: "smoothstep",
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "var(--primary)", strokeWidth: 2 },
            }}
            className={styles.reactFlow}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="rgba(148, 163, 184, 0.2)"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {error && <ErrorOverlay message={error} onDismiss={clearError} />}
    </div>
  );
}

export default AgentTeamView;
