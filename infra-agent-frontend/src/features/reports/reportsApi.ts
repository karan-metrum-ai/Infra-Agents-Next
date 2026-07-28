import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * Report Builder templates, SSE generation, and export preview. Endpoints
 * land in Phase 10 (Reports & Report Builder).
 */
export const reportsApi = createApi({
  reducerPath: "reportApi",
  baseQuery: createBaseQuery("/report-api"),
  tagTypes: ["Reports"],
  endpoints: () => ({}),
});
