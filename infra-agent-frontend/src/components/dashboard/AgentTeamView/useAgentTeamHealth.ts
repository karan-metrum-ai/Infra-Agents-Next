"use client";

import { useCallback, useEffect, useState } from "react";
import type { Node } from "@xyflow/react";
import type { AgentsStatus, TeamHealth, TeamNodeData } from "./AgentTeamView.types";

const REFRESH_INTERVAL_MS = 30_000;

interface RawAgentsResponse {
  total_count?: number;
  agents?: Array<{
    name?: string;
    display_name?: string;
    advertised_host?: string;
    default_port?: number;
    description?: string;
  }>;
}

/** Polls team health + the global agents catalog every 30s, syncing each ReactFlow node's `status`. */
export function useAgentTeamHealth(
  clusterId: string | null,
  setNodes: (updater: (nodes: Node<TeamNodeData>[]) => Node<TeamNodeData>[]) => void,
) {
  const [teamHealth, setTeamHealth] = useState<TeamHealth | null>(null);
  const [agentsStatus, setAgentsStatus] = useState<AgentsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamHealth = useCallback(async () => {
    if (!clusterId) return;
    try {
      const response = await fetch(`/clusterid-${clusterId}/health`);
      if (!response.ok) throw new Error("Failed to fetch team health");
      setTeamHealth(await response.json());
      setError(null);
    } catch {
      setError("Failed to connect to team services");
    }
  }, [clusterId]);

  const fetchAgentsStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/agents");
      if (!response.ok) throw new Error("Failed to fetch agents status");
      const data: RawAgentsResponse = await response.json();

      const status: AgentsStatus = {
        agents_count: data.total_count ?? data.agents?.length ?? 0,
        agents: (data.agents ?? []).map((agent) => ({
          name: agent.name ?? agent.display_name ?? "",
          base_url: agent.advertised_host
            ? `http://${agent.advertised_host}:${agent.default_port}`
            : "",
          description: agent.description ?? "",
        })),
        agent_names: (data.agents ?? []).map((agent) => agent.name ?? agent.display_name ?? ""),
        status: (data.agents?.length ?? 0) > 0 ? "ready" : "no_agents",
      };
      setAgentsStatus(status);
      setError(null);

      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const match = status.agents.find((agent) => {
            const nodeLabel = node.data.label.toLowerCase();
            const agentName = agent.name.toLowerCase();
            return agentName.includes(nodeLabel) || nodeLabel.includes(agentName);
          });
          const nextStatus = status.status === "ready" ? "running" : "idle";
          // Phase 15: skip the rebuild when nothing actually changed. Every
          // poll otherwise produced a brand-new node object for every
          // matched agent (even when its status was already correct),
          // which — combined with `TeamNodePlaceholder` needing its own
          // `memo` fix for this same reason — re-rendered the entire org
          // chart every 30s regardless of whether any agent's status
          // actually flipped.
          if (!match || node.data.status === nextStatus) return node;
          return { ...node, data: { ...node.data, status: nextStatus } };
        }),
      );
    } catch {
      setError("Failed to fetch agents status");
    }
  }, [setNodes]);

  useEffect(() => {
    fetchTeamHealth();
    fetchAgentsStatus();
    const id = setInterval(() => {
      fetchTeamHealth();
      fetchAgentsStatus();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchTeamHealth, fetchAgentsStatus]);

  return { teamHealth, agentsStatus, error, clearError: () => setError(null) };
}
