import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type { ClusterIdsResponse, ClusterTeamResponse } from "./teamsApi.types";

/**
 * Team composition, agent catalog, and deployment lifecycle. The two
 * cluster-team read endpoints below land in Phase 5 (live monitoring —
 * ClusterTeamSelector, AgentTeamView, SiteTeamPanel, TeamsDashboard all read
 * an already-deployed team's composition). Team CRUD/save/deploy/recommend
 * endpoints land in Phase 7/11 (team building).
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
  }),
});

export const { useGetClusterIdsQuery, useGetClusterTeamQuery } = teamsApi;
