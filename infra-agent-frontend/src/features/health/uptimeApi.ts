import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * Stack uptime history. Endpoints land alongside the Command Center work
 * in Phase 5, which is the first real consumer.
 */
export const uptimeApi = createApi({
  reducerPath: "uptimeApi",
  baseQuery: createBaseQuery("/uptime-api"),
  tagTypes: ["StackUptime"],
  endpoints: () => ({}),
});
