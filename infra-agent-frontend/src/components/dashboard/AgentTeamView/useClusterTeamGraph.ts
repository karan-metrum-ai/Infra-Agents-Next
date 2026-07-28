"use client";

import { useEffect } from "react";
import { MarkerType, useEdgesState, useNodesState, type Edge, type Node } from "@xyflow/react";
import { useGetClusterTeamQuery } from "@/features/teams/teamsApi";
import type { ClusterTeamAgent } from "@/features/teams/teamsApi.types";
import { getAvatar } from "@/lib/avatars";
import type { TeamNodeData } from "./AgentTeamView.types";

const LABEL_MAPPING: Record<string, string> = {
  "Operations Manager Agent": "Operations Manager",
  "Level 1 Support Agent": "Level 1 Support",
  "Systems Admin Hardware Agent": "Hardware Operations",
  "Systems Admin OS Agent": "OS Operations",
  "WLAN Network Agent": "WLAN Network Specialist",
  "Vast.ai Agent": "NeoCloud Provisioning Agent",
  "MetrumAI Insights Agent": "MetrumAI Insights Agent",
  "Virtualization Agent": "Virtualization Agent",
  storage_agent: "storage_agent",
};

function getMappedLabel(displayName: string): string {
  return LABEL_MAPPING[displayName] || displayName;
}

function extractTools(agent: ClusterTeamAgent): string[] {
  const raw = agent.environment_variables?.TOOLS;
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

const CAPABILITY_MAP: Record<string, string[]> = {
  monitoring: ["log_analysis", "alert_management", "system_monitoring"],
  hardware: ["hardware_management", "bios_configuration", "server_maintenance"],
  operating_system: ["system_configuration", "package_management", "service_management"],
  ai_workload: [
    "ai_workload_management",
    "insights_deployment",
    "hardware_catalog",
    "project_management",
  ],
  machine_setup: ["machine_setup", "vastai_configuration", "automated_deployment"],
  coordinator: ["orchestration", "team_coordination", "api_gateway", "request_routing"],
};

function extractCapabilities(agent: ClusterTeamAgent): string[] {
  return CAPABILITY_MAP[agent.agent_type] ?? [];
}

function isLevel1Support(agent: ClusterTeamAgent): boolean {
  const name = agent.agent_name.toLowerCase();
  const display = agent.display_name.toLowerCase();
  return (
    ["noc", "level1", "level-1", "level_1"].some((k) => name.includes(k)) ||
    display.includes("noc") ||
    display.includes("level 1") ||
    display.includes("level1")
  );
}

function buildAgentNode(
  agent: ClusterTeamAgent,
  x: number,
  y: number,
  isOrchestrator: boolean,
): Node<TeamNodeData> {
  const label = getMappedLabel(agent.display_name);
  return {
    id: agent.agent_name,
    type: "agent",
    position: { x, y },
    data: {
      label,
      agentType: agent.agent_name,
      description: agent.description,
      tools: extractTools(agent),
      capabilities: extractCapabilities(agent),
      status: "idle",
      isOrchestrator,
      avatar: getAvatar(label),
    },
  };
}

function buildEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "var(--primary)", strokeWidth: 2 },
  };
}

/** Builds the ReactFlow graph for a cluster's deployed team: orchestrator -> Level 1 Support -> specialists. */
export function useClusterTeamGraph(clusterId: string | null) {
  const {
    data: clusterTeamData,
    isLoading,
    isFetching,
  } = useGetClusterTeamQuery(clusterId ?? "", { skip: !clusterId });
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<TeamNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!clusterTeamData || isLoading) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const hasActiveTeam =
      clusterTeamData.deployment?.is_deployed === true &&
      clusterTeamData.status !== "no_active_team" &&
      clusterTeamData.team_composition?.orchestrator != null;

    const orchestrator = clusterTeamData.team_composition.orchestrator;
    if (!hasActiveTeam || !orchestrator) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const viewportWidth = 1800;
    const centerX = viewportWidth / 2;
    const cardWidth = 320;
    const cardHeight = 300;
    const verticalGap = 80;
    const tier1Y = 50;
    const tier2Y = tier1Y + cardHeight + verticalGap;
    const tier3Y = tier2Y + cardHeight + verticalGap;

    const teamNodes: Node<TeamNodeData>[] = [buildAgentNode(orchestrator, centerX, tier1Y, true)];
    const teamEdges: Edge[] = [];

    const allSpecialists = Object.values(clusterTeamData.team_composition.specialists);
    const level1Support = allSpecialists.find(isLevel1Support);
    const otherSpecialists = allSpecialists.filter((agent) => !isLevel1Support(agent));

    if (level1Support) {
      teamNodes.push(buildAgentNode(level1Support, centerX - cardWidth * 0.8, tier2Y, false));
      teamEdges.push(buildEdge(orchestrator.agent_name, level1Support.agent_name));
    }

    const minSpacing = cardWidth + 30;
    const availableWidth = viewportWidth * 0.85;
    const spacing = Math.max(minSpacing, availableWidth / Math.max(otherSpecialists.length, 1));
    const totalWidth = (otherSpecialists.length - 1) * spacing;
    const startX = centerX - totalWidth / 2;

    otherSpecialists.forEach((agent, index) => {
      teamNodes.push(buildAgentNode(agent, startX + index * spacing, tier3Y, false));
      teamEdges.push(buildEdge(orchestrator.agent_name, agent.agent_name));
    });

    setNodes(teamNodes);
    setEdges(teamEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterTeamData, isLoading]);

  return {
    nodes,
    edges,
    setNodes,
    onNodesChange,
    onEdgesChange,
    isLoading: isLoading || isFetching,
  };
}
