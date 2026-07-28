export interface AgentTeamViewProps {
  className?: string;
  showControls?: boolean;
  /** Cluster to load the deployed team for. No team renders until this is set. */
  clusterId: string | null;
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

export interface TeamNodeData extends Record<string, unknown> {
  label: string;
  agentType: string;
  description: string;
  tools: string[];
  capabilities: string[];
  status: string;
  isOrchestrator: boolean;
  avatar: string | undefined;
}
