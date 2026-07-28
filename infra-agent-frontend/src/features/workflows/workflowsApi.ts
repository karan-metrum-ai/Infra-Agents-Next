import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * Tool/agent catalog for the Workflow Designer canvas. Endpoints land in
 * Phase 7 (Workflow Designer).
 */
export const workflowsApi = createApi({
  reducerPath: "workflowsApi",
  baseQuery: createBaseQuery("/api"),
  tagTypes: ["ToolCatalog"],
  endpoints: () => ({}),
});
