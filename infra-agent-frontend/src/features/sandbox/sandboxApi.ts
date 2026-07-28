import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * Sandbox/eval run configuration, execution, and artifacts. The Vite app's
 * lib/sandboxApi.ts is raw `fetch`, not RTK Query — Phase 9 (Sandbox / Eval
 * Panel) converts it to endpoints here per the "RTK Query for all API
 * calls" rule.
 */
export const sandboxApi = createApi({
  reducerPath: "sandboxApi",
  baseQuery: createBaseQuery("/sandbox-api"),
  tagTypes: ["SandboxRun"],
  endpoints: () => ({}),
});
