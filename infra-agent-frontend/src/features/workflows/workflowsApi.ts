import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import { normalizeCatalogResponse } from "@/utils/catalogOperationType";
import type { AgentCatalogView, CatalogResponse } from "./workflowsApi.types";

/**
 * Tool/agent catalog for the Workflow Designer canvas (Phase 7).
 *
 * `getToolCatalog` returns the full 3-level catalog hierarchy (categories →
 * providers → features), normalized so every feature has a resolved
 * `operation_type` even when the backend omits it (see
 * `src/utils/catalogOperationType.ts`). `getAgentCatalogView` returns the
 * enabled-tools view for a single agent, grouped by category → provider.
 */
export const workflowsApi = createApi({
  reducerPath: "workflowsApi",
  baseQuery: createBaseQuery("/api"),
  tagTypes: ["ToolCatalog"],
  endpoints: (builder) => ({
    getToolCatalog: builder.query<CatalogResponse, void>({
      query: () => "/tools/catalog",
      transformResponse: (response: CatalogResponse) => normalizeCatalogResponse(response),
      providesTags: ["ToolCatalog"],
      keepUnusedDataFor: 60,
    }),

    getAgentCatalogView: builder.query<AgentCatalogView, string>({
      query: (agentName) => `/tools/catalog/agents/${agentName}`,
      keepUnusedDataFor: 120,
    }),
  }),
});

export const { useGetToolCatalogQuery, useGetAgentCatalogViewQuery } = workflowsApi;
