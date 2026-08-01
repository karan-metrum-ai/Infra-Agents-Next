import type { AgentMeta, AgentStatus } from "@/components/WorkflowDesigner/AgentNode.types";

export interface AgentTeamViewProps {
  className?: string;
  showControls?: boolean;
  /** Cluster to load the deployed team for. No team renders until this is set. */
  clusterId: string | null;
  /** Agent name currently processing a live query — lights up its pulsing aura. */
  activeAgentName?: string | null;
}

export interface AgentDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  capabilities: string[];
  tools: string[];
}

export interface TeamHealth {
  status: string;
  team_id: string;
  team_name: string;
}

export interface AgentInfo {
  name: string;
  base_url: string;
  description: string;
}

export interface AgentsStatus {
  agents_count: number;
  agents: AgentInfo[];
  agent_names: string[];
  status: string;
}

/** Node `data` payload for the "agent" node type — renders via the real `AgentNode`. */
export interface TeamNodeData extends Record<string, unknown> {
  label: string;
  agentType: string;
  description: string;
  tagline: string;
  tools: string[];
  capabilities: string[];
  status: AgentStatus;
  isOrchestrator: boolean;
  agentMeta: AgentMeta;
  apiConnected?: boolean;
}
