import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * Team composition, agent catalog, and deployment lifecycle. Endpoints land
 * with TeamsDashboard/TeamBuilder (Phase 5, Phase 11) — consolidating the
 * Teams/Agents/Deployment groups previously split across the Vite app's
 * apiSlice.ts (990 LOC).
 */
export const teamsApi = createApi({
  reducerPath: "teamsApi",
  baseQuery: createBaseQuery("/api"),
  tagTypes: ["Teams", "Agents", "Deployment"],
  endpoints: () => ({}),
});
