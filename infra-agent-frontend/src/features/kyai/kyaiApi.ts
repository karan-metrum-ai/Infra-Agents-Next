import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * KyAI Playground session creation/replay. The Vite app's lib/kyaiApi.ts is
 * raw `fetch`, not RTK Query — Phase 12 (KyAI Playground) converts it to
 * endpoints here per the "RTK Query for all API calls" rule.
 */
export const kyaiApi = createApi({
  reducerPath: "kyaiApi",
  baseQuery: createBaseQuery("/kyai"),
  tagTypes: ["KyaiSession"],
  endpoints: () => ({}),
});
