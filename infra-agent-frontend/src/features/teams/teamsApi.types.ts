export interface ClusterTeamAgent {
  agent_id: string;
  agent_name: string;
  display_name: string;
  description: string;
  agent_type: string;
  framework: string;
  is_orchestrator: boolean;
  default_port: number;
  replicas: number;
  tools: string;
  base_url: string | null;
  model: string | null;
  api_key: string | null;
  environment_variables: Record<string, unknown>;
  version: string;
}

export interface ClusterTeamComposition {
  orchestrator: ClusterTeamAgent | null;
  specialists: Record<string, ClusterTeamAgent>;
}

export interface ClusterTeamDeployment {
  is_deployed: boolean;
  agents_ready: number;
  agents_total: number;
  deployment_status: string;
  namespace: string;
}

export interface ClusterTeamEndpoints {
  operations_manager: string;
  api_docs: string;
  health_check: string;
}

export interface ClusterTeamResponse {
  team_id: string | null;
  name: string | null;
  description: string | null;
  cluster_id: string;
  status: string;
  message?: string;
  team_composition: ClusterTeamComposition;
  base_url: string | null;
  model: string | null;
  api_key: string | null;
  agent_count: number;
  created_at: string | null;
  deployment: ClusterTeamDeployment;
  access_path: string | null;
  team_prefix: string | null;
  endpoints: ClusterTeamEndpoints | null;
}

export interface ClusterIdInfo {
  cluster_id: number;
  cluster_name?: string;
  cluster_slug?: string;
  description?: string;
  device_count: number;
}

export interface ClusterIdsResponse {
  success: boolean;
  total_clusters: number;
  cluster_ids: ClusterIdInfo[];
  message: string;
}
