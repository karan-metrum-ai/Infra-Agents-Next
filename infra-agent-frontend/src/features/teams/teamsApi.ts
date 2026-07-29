import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type {
  AdvancedDatabaseTeamCreate,
  AvailableAgentsResponse,
  ClusterIdsResponse,
  ClusterTeamResponse,
  ClusterTeamsResponse,
  DatabaseTeamResponse,
  DeleteTeamParams,
  DeploymentStartResponse,
  DeploymentStatusResponse,
  DeployTeamParams,
  GetRecommendedTeamParams,
  GetTeamsParams,
  GetTeamsResponse,
  ListAgentsParams,
  RecommendedTeamResponse,
  Team,
} from "./teamsApi.types";

/**
 * Team composition, agent catalog, and deployment lifecycle. The two
 * cluster-team read endpoints below land in Phase 5 (live monitoring —
 * ClusterTeamSelector, AgentTeamView, SiteTeamPanel, TeamsDashboard all read
 * an already-deployed team's composition). `listAgents` lands in Phase 7
 * (Workflow Designer's `AgentsPanel`/`ToolCatalogPanel` both need the
 * registered-agent catalog to populate the canvas's drag source and the
 * tool catalog's "agents with access" chips). Team CRUD/save/deploy/
 * recommend endpoints land in Phase 7/11 (team building).
 */
export const teamsApi = createApi({
  reducerPath: "teamsApi",
  baseQuery: createBaseQuery("/api"),
  tagTypes: ["Teams", "Agents", "Deployment"],
  endpoints: (builder) => ({
    /** List of cluster ids available for team selection (with device counts). */
    getClusterIds: builder.query<ClusterIdsResponse, void>({
      query: () => "/bulk-upload/cluster-ids",
      providesTags: ["Teams"],
      keepUnusedDataFor: 300,
    }),

    /** Deployed team composition + deployment status for a cluster. */
    getClusterTeam: builder.query<ClusterTeamResponse, string>({
      query: (clusterId) => `/clusters/${clusterId}/team`,
      providesTags: (_result, _error, clusterId) => [
        { type: "Teams", id: `cluster-${clusterId}` },
        { type: "Deployment", id: `cluster-${clusterId}` },
      ],
      keepUnusedDataFor: 300,
    }),

    /** Registered agent catalog (optionally filtered by type/framework/active/public/orchestrator). */
    listAgents: builder.query<AvailableAgentsResponse, ListAgentsParams | void>({
      query: (params) => {
        if (!params) return "/agents";
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.set(key, String(value));
        });
        const qs = searchParams.toString();
        return qs ? `/agents?${qs}` : "/agents";
      },
      providesTags: ["Agents"],
      keepUnusedDataFor: 120,
    }),

    /** Paginated/filterable team list (`GET /teams`) — DeploySavedTeamModal, EvaluationModal. */
    getTeams: builder.query<GetTeamsResponse, GetTeamsParams | void>({
      query: (params) => {
        if (!params) return "/teams";
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.set(key, String(value));
        });
        const qs = searchParams.toString();
        return qs ? `/teams?${qs}` : "/teams";
      },
      providesTags: ["Teams"],
      keepUnusedDataFor: 300,
    }),

    /** Full team detail (`GET /teams/{id}`). */
    getTeamById: builder.query<Team, string>({
      query: (id) => `/teams/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Teams", id }],
    }),

    /** Pre-built advanced-team payload based on all active agents (`GET /teams/recommended`). */
    getRecommendedTeam: builder.query<RecommendedTeamResponse, GetRecommendedTeamParams | void>({
      query: (params) => {
        const teamName = params?.teamName ?? "my-team";
        const clusterId = params?.clusterId ?? "1001";
        return `/teams/recommended?team_name=${encodeURIComponent(teamName)}&cluster_id=${encodeURIComponent(clusterId)}`;
      },
      providesTags: ["Teams"],
    }),

    /** Create a team with per-agent overrides (`POST /teams/advanced`) — SaveTeamModal. */
    createAdvancedTeam: builder.mutation<DatabaseTeamResponse, AdvancedDatabaseTeamCreate>({
      query: (payload) => ({
        url: "/teams/advanced",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Teams"],
    }),

    /** Kick off deployment of a saved team (`POST /teams/{teamId}/deploy`). */
    deployTeam: builder.mutation<DeploymentStartResponse, DeployTeamParams>({
      query: ({ teamId, clusterId }) => ({
        url: `/teams/${teamId}/deploy`,
        method: "POST",
        body: { cluster_id: clusterId },
      }),
      invalidatesTags: ["Teams"],
    }),

    /** Poll deployment progress (`GET /teams/{teamId}/deploy/status`). */
    getDeploymentStatus: builder.query<DeploymentStatusResponse, string>({
      query: (teamId) => `/teams/${teamId}/deploy/status`,
      providesTags: (_result, _error, teamId) => [{ type: "Deployment", id: teamId }],
    }),

    /** Stop an in-flight or running deployment (`POST /teams/{teamId}/deploy/stop`). */
    stopDeployment: builder.mutation<{ message: string }, string>({
      query: (teamId) => ({
        url: `/teams/${teamId}/deploy/stop`,
        method: "POST",
      }),
      invalidatesTags: ["Teams"],
    }),

    /** Delete a team, optionally tearing down its deployment (`DELETE /teams/{teamId}`). */
    deleteTeam: builder.mutation<{ message: string }, DeleteTeamParams>({
      query: ({ teamId, deleteDeployment = true }) => {
        const searchParams = new URLSearchParams();
        searchParams.set("delete_deployment", String(deleteDeployment));
        return {
          url: `/teams/${teamId}?${searchParams.toString()}`,
          method: "DELETE",
        };
      },
      invalidatesTags: ["Teams"],
    }),

    /** Re-copy the ECR pull secret into a team's namespace (`POST /teams/{teamId}/copy-ecr-secret`). */
    copyEcrSecret: builder.mutation<{ message: string }, string>({
      query: (teamId) => ({
        url: `/teams/${teamId}/copy-ecr-secret`,
        method: "POST",
      }),
      invalidatesTags: ["Teams"],
    }),

    /** All clusters with their linked team + deployment status (`GET /clusters/teams`) — DeploySavedTeamModal. */
    getClusterTeams: builder.query<ClusterTeamsResponse, void>({
      query: () => "/clusters/teams",
      providesTags: ["Teams"],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetClusterIdsQuery,
  useGetClusterTeamQuery,
  useLazyGetClusterTeamQuery,
  useListAgentsQuery,
  useGetTeamsQuery,
  useGetTeamByIdQuery,
  useLazyGetTeamByIdQuery,
  useGetRecommendedTeamQuery,
  useLazyGetRecommendedTeamQuery,
  useCreateAdvancedTeamMutation,
  useDeployTeamMutation,
  useGetDeploymentStatusQuery,
  useStopDeploymentMutation,
  useDeleteTeamMutation,
  useCopyEcrSecretMutation,
  useGetClusterTeamsQuery,
} = teamsApi;
