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

/** A single registered agent definition, as returned by `GET /agents`. */
export interface AgentResponse {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  agent_type: string;
  framework: string;
  capabilities?: Record<string, unknown>;
  default_tools?: Record<string, { enabled?: boolean } | undefined>;
  llm_config?: Record<string, unknown>;
  prompt_template?: string;
  is_active: boolean;
  is_public: boolean;
  is_orchestrator: boolean;
  version: string;
  icon_url?: string;
  default_port: number;
  command_path?: string;
  advertised_host?: string;
  health_check_path: string;
  resource_requirements?: Record<string, string>;
  environment_variables?: Record<string, string>;
  created_at: string;
}

export interface ListAgentsParams {
  agent_type?: string;
  framework?: string;
  is_active?: boolean;
  is_public?: boolean;
  is_orchestrator?: boolean;
}

export interface AvailableAgentsResponse {
  agents: AgentResponse[];
  total_count: number;
  criteria?: {
    agent_types?: string[];
    frameworks?: string[];
    capabilities?: string[];
    is_active: boolean;
    is_public: boolean;
  };
}

// ── Team list / detail (Phase 7 — Save/Deploy/Recommend flows) ──────────

/** A single row of `GET /teams`, as summarized for list/grid views. */
export interface TeamListItem {
  team_id: string;
  team_name: string;
  description?: string;
  status: string;
  agent_count: number;
  deploy_endpoint: string;
  organization_id?: string;
  created_at: string;
  is_deployed?: boolean;
  deployment_status?: string;
  agents_ready?: number;
  agents_total?: number;
}

export interface GetTeamsParams {
  status?: string;
  organization_id?: string;
  cluster_id?: string;
  limit?: number;
  offset?: number;
}

export interface GetTeamsResponse {
  teams: TeamListItem[];
  total_count: number;
  limit: number;
  offset: number;
  filters: Record<string, unknown>;
}

export interface TeamAgentDetail {
  agent_id: string;
  agent_name: string;
  display_name: string;
  description: string;
  agent_type: string;
  framework: string;
  is_orchestrator: boolean;
  default_port: number;
  replicas: number;
  environment_variables: Record<string, unknown>;
  version: string;
}

export interface TeamAgentOverride {
  base_url: string;
  model: string;
  api_key: string;
}

/** Full detail response of `GET /teams/{id}`. */
export interface Team {
  team_id: string;
  team_name: string;
  description: string;
  status: "active" | "inactive" | "cancelled";
  organization_id: string;
  orchestrator: TeamAgentDetail;
  specialists: Record<string, TeamAgentDetail>;
  base_url?: string;
  model?: string;
  environment_variables: Record<string, unknown>;
  agent_overrides: Record<string, TeamAgentOverride>;
  agent_count: number;
  deployment_status?: string;
  created_at: string;
  last_deployed_at?: string;
  knowledge_files_count: number;
  deploy_endpoint: string;
  status_endpoint: string;
}

// ── Recommended team (`GET /teams/recommended`) ──────────────────────────

/**
 * One entry of a recommended team's `team_composition` (orchestrator or a
 * specialist). Shape confirmed against how `WorkflowDesigner.tsx`'s
 * `loadRecommendedTeamOnCanvas` actually reads the payload it gets back
 * from this endpoint (`agent_name` + optional `tools`/`environment_variables`),
 * not guessed — the backend may attach additional per-deployment fields we
 * don't render yet, hence `environment_variables` staying a documented
 * `Record<string, unknown>` rather than a fully-closed shape.
 */
export interface RecommendedTeamCompositionAgent {
  agent_name: string;
  replicas?: number;
  base_url?: string | null;
  model?: string;
  api_key?: string;
  tools?: string | string[];
  environment_variables?: Record<string, unknown>;
}

export interface RecommendedTeamComposition {
  orchestrator?: RecommendedTeamCompositionAgent;
  specialists: Record<string, RecommendedTeamCompositionAgent>;
}

/** Pre-built `AdvancedDatabaseTeamCreate`-shaped payload the recommend flow can save as-is. */
export interface RecommendedTeamResponse {
  name?: string;
  description?: string;
  cluster_id?: string;
  team_composition: RecommendedTeamComposition;
  base_url?: string;
  model?: string;
  api_key?: string;
  tools?: string;
  auto_deploy?: boolean;
}

export interface GetRecommendedTeamParams {
  teamName?: string;
  clusterId?: string;
}

// ── Advanced team creation (`POST /teams/advanced`) ──────────────────────

export interface AdvancedTeamCompositionAgent {
  agent_name: string;
  /** 1-3 */
  replicas: number;
  base_url?: string | null;
  model?: string;
  api_key?: string;
  tools?: string;
  environment_variables?: Record<string, string>;
}

export interface AdvancedTeamComposition {
  orchestrator?: AdvancedTeamCompositionAgent;
  specialists: Record<string, AdvancedTeamCompositionAgent>;
}

export interface AdvancedDatabaseTeamCreate {
  name: string;
  description?: string;
  /** Required cluster identifier for deployment target. */
  cluster_id: string;
  team_composition: AdvancedTeamComposition;
  base_url?: string;
  model?: string;
  api_key?: string;
  tools?: string;
  auto_deploy?: boolean;
}

export interface DatabaseTeamResponse {
  /** UUID4 */
  team_id: string;
  team_name: string;
  agent_count: number;
  status: string;
  message: string;
  deploy_endpoint?: string;
  deployment_status?: string;
  /** ISO datetime */
  created_at: string;
}

// ── Deployment lifecycle ─────────────────────────────────────────────────

export interface DeployTeamParams {
  teamId: string;
  clusterId: string;
}

export interface DeploymentStartResponse {
  /** UUID4 */
  team_id: string;
  team_name: string;
  status: string;
  message: string;
  status_endpoint: string;
  /** ISO datetime */
  started_at: string;
}

export interface DeploymentStatusResponse {
  /** UUID4 */
  team_id: string;
  team_name: string;
  status: "pending" | "deploying" | "completed" | "failed" | "cancelled";
  message: string;
  agents_ready: number;
  agents_total: number;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  /** Service endpoints when completed. */
  endpoints?: Record<string, string>;
}

export interface DeleteTeamParams {
  teamId: string;
  deleteDeployment?: boolean;
}

// ── Cluster-teams list (`GET /clusters/teams`) ───────────────────────────

export interface ClusterTeamSummaryInfo {
  cluster_id: number;
  cluster_name: string;
  cluster_slug: string;
  description: string;
  device_count: number;
}

export interface ClusterTeamsItem {
  team_id: string | null;
  team_name: string | null;
  linked_cluster_name: string;
  cluster_info: ClusterTeamSummaryInfo;
}

export interface ClusterTeamsActiveInfo {
  deployed: number;
  total_clusters: number;
}

export interface ClusterTeamsResponse {
  clusters: ClusterTeamsItem[];
  active_teams: ClusterTeamsActiveInfo;
}
