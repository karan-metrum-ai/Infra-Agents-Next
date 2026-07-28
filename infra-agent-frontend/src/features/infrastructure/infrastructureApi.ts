import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * Command Center infrastructure health, ITSM/ServiceNow tickets and
 * incidents. Endpoints land with Phase 5 (Command Center / Live Dashboard).
 */
export const infrastructureApi = createApi({
  reducerPath: "infrastructureApi",
  baseQuery: createBaseQuery("/api"),
  tagTypes: ["CommandCenterHealth", "Tickets", "Incidents", "AgentActivity"],
  endpoints: () => ({}),
});
