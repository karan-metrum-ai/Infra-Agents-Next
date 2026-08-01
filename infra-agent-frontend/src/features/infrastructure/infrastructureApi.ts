import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type {
  CommandCenterAgentActivityResponse,
  CommandCenterIncidentsResponse,
  CommandCenterInfrastructureHealthResponse,
  CommandCenterTicketsResponse,
} from "./infrastructureApi.types";

/**
 * Command Center infrastructure health, ITSM/ServiceNow tickets and
 * incidents, and agent activity summary — feeds BottomStatsRow on the Live
 * Dashboard overview (Phase 5).
 */
export const infrastructureApi = createApi({
  reducerPath: "infrastructureApi",
  baseQuery: createBaseQuery("/digital-twin-api"),
  tagTypes: ["CommandCenterHealth", "Tickets", "Incidents", "AgentActivity"],
  endpoints: (builder) => ({
    getCommandCenterAgentActivity: builder.query<CommandCenterAgentActivityResponse, void>({
      query: () => "/command-center/agent-activity",
      providesTags: ["AgentActivity"],
      keepUnusedDataFor: 15,
    }),

    getCommandCenterInfrastructureHealth: builder.query<
      CommandCenterInfrastructureHealthResponse,
      void
    >({
      query: () => "/command-center/infrastructure-health",
      providesTags: ["CommandCenterHealth"],
      keepUnusedDataFor: 15,
    }),

    /** Closed split; blocked tickets are excluded from `total`. */
    getCommandCenterTickets: builder.query<CommandCenterTicketsResponse, void>({
      query: () => "/command-center/tickets",
      providesTags: ["Tickets"],
      keepUnusedDataFor: 60,
    }),

    getCommandCenterIncidents: builder.query<
      CommandCenterIncidentsResponse,
      { limit?: number; includeResolved?: boolean } | void
    >({
      query: (params) => ({
        url: "/command-center/incidents",
        params: {
          limit: params?.limit ?? 10,
          include_resolved: params?.includeResolved ?? false,
        },
      }),
      providesTags: ["Incidents"],
      keepUnusedDataFor: 30,
    }),
  }),
});

export const {
  useGetCommandCenterAgentActivityQuery,
  useGetCommandCenterInfrastructureHealthQuery,
  useGetCommandCenterTicketsQuery,
  useGetCommandCenterIncidentsQuery,
} = infrastructureApi;
