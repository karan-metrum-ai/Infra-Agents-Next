import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type {
  ArtifactListResponse,
  KBUploadResponse,
  ListReportsResponse,
  QueryScore,
  SandboxLogsResponse,
  SandboxReport,
  SandboxRun,
  SandboxRunActionResponse,
  SandboxRunListItem,
  SandboxRunRequest,
} from "./sandboxApi.types";

/**
 * Sandbox/eval run configuration, execution, and artifacts. Converts the
 * Vite app's `lib/sandboxApi.ts` (raw `fetch` over a shared `request()`
 * wrapper) into RTK Query endpoints per the "RTK Query for all API calls"
 * rule. `subscribeToRun` (SSE) is NOT here — see `sandboxStream.ts`.
 *
 * Tag strategy: `SandboxRun` is keyed per `run_id` (`getRun`) plus a
 * shared `"LIST"` id (`listRuns`) so `startRun`/`cancelRun` invalidate the
 * list without over-invalidating unrelated runs' detail queries.
 * `SandboxReport` is keyed per `run_id` (`getReport`, `getArtifact`,
 * `getQueryRecords` — the latter two both resolve through the report
 * endpoint, see their comments below). `SandboxArtifacts` is keyed per
 * `run_id` (`listArtifacts`).
 */
export const sandboxApi = createApi({
  reducerPath: "sandboxApi",
  baseQuery: createBaseQuery("/sandbox-api"),
  tagTypes: ["SandboxRun", "SandboxReport", "SandboxArtifacts"],
  endpoints: (builder) => ({
    /** `GET /health` — sandbox evaluator service liveness. */
    getSandboxHealth: builder.query<{ status: string }, void>({
      query: () => "/health",
    }),

    /** `POST /v1/sandbox/runs` — kicks off a new sandbox evaluation run. */
    startRun: builder.mutation<SandboxRunActionResponse, SandboxRunRequest>({
      query: (body) => ({
        url: "/v1/sandbox/runs",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "SandboxRun", id: "LIST" }],
    }),

    /** `GET /v1/sandbox/runs/:runId` — current run status/phases. */
    getRun: builder.query<SandboxRun, string>({
      query: (runId) => `/v1/sandbox/runs/${runId}`,
      providesTags: (_result, _error, runId) => [{ type: "SandboxRun", id: runId }],
    }),

    /** `GET /v1/sandbox/runs?limit=` — recent run list. */
    listRuns: builder.query<SandboxRunListItem[], number | void>({
      query: (limit = 20) => `/v1/sandbox/runs?limit=${limit}`,
      providesTags: (result) => [
        ...(result?.map((run) => ({ type: "SandboxRun" as const, id: run.run_id })) ?? []),
        { type: "SandboxRun" as const, id: "LIST" },
      ],
    }),

    /** `GET /v1/sandbox/runs/:runId/report` — full metrics/verdicts report. */
    getReport: builder.query<SandboxReport, string>({
      query: (runId) => `/v1/sandbox/runs/${runId}/report`,
      providesTags: (_result, _error, runId) => [{ type: "SandboxReport", id: runId }],
    }),

    /** `DELETE /v1/sandbox/runs/:runId` — cancels an in-flight run or deletes a finished one. */
    cancelRun: builder.mutation<SandboxRunActionResponse, string>({
      query: (runId) => ({
        url: `/v1/sandbox/runs/${runId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, runId) => [
        { type: "SandboxRun", id: runId },
        { type: "SandboxRun", id: "LIST" },
      ],
    }),

    /** `GET /v1/sandbox/reports` — cross-run report summaries. */
    listReports: builder.query<ListReportsResponse, void>({
      query: () => "/v1/sandbox/reports",
    }),

    /**
     * `GET /v1/sandbox/runs/:runId/artifacts`. Ported behavior: the Vite
     * source swallows a fetch failure (the artifact directory may not
     * exist yet for an in-progress run) and resolves to `{ artifacts: [] }`
     * instead of surfacing an error — `queryFn` is used here (instead of
     * a plain `query`) so that same graceful fallback can be expressed.
     */
    listArtifacts: builder.query<ArtifactListResponse, string>({
      async queryFn(runId, _api, _extraOptions, baseQuery) {
        const result = await baseQuery(`/v1/sandbox/runs/${runId}/artifacts`);
        if (result.error) {
          return { data: { run_id: runId, artifacts: [] } };
        }
        return { data: result.data as ArtifactListResponse };
      },
      providesTags: (_result, _error, runId) => [{ type: "SandboxArtifacts", id: runId }],
    }),

    /**
     * `GET /v1/sandbox/runs/:runId/report` — the Vite source's
     * `getArtifact(runId, name)` hits this same report endpoint
     * regardless of `name` (only `report.json` is documented as a
     * short-circuit to `getReport`, but the fallback branch for every
     * other artifact name calls the identical URL too). Ported verbatim,
     * not "fixed" — `name` is kept as part of the cache key only so
     * distinct artifact names don't fight over one cache entry.
     */
    getArtifact: builder.query<unknown, { runId: string; name: string }>({
      query: ({ runId }) => `/v1/sandbox/runs/${runId}/report`,
      providesTags: (_result, _error, { runId }) => [{ type: "SandboxReport", id: runId }],
    }),

    /**
     * Derived from `getReport` — the Vite source's `getQueryRecords<T>`
     * fetches the full report and returns its `query_scores` field.
     * `queryFn` re-hits the same `/report` URL directly (not
     * `getReport.initiate`) to avoid a nested-dispatch endpoint chain for
     * what is otherwise a one-line field projection.
     */
    getQueryRecords: builder.query<QueryScore[], string>({
      async queryFn(runId, _api, _extraOptions, baseQuery) {
        const result = await baseQuery(`/v1/sandbox/runs/${runId}/report`);
        if (result.error) {
          return { error: result.error };
        }
        return { data: (result.data as SandboxReport).query_scores };
      },
      providesTags: (_result, _error, runId) => [{ type: "SandboxReport", id: runId }],
    }),

    /**
     * Stub — the Vite source has no backend proxy for `kubectl logs`, it
     * returns a canned instruction string. Ported as-is via `queryFn` with
     * no network call; do not invent a real backend call here.
     */
    getLogs: builder.query<SandboxLogsResponse, string>({
      queryFn: () => ({
        data: {
          "sandbox-evaluator":
            "Live log streaming is not available via the API. To follow logs: kubectl logs -n sandbox-system deploy/sandbox-evaluator -f",
        },
      }),
    }),

    /** `POST /v1/sandbox/upload-kb` (multipart) — uploads a knowledge-base source file. */
    uploadKB: builder.mutation<KBUploadResponse, File>({
      query: (file) => {
        const form = new FormData();
        form.append("file", file);
        return {
          url: "/v1/sandbox/upload-kb",
          method: "POST",
          body: form,
        };
      },
    }),
  }),
});

export const {
  useGetSandboxHealthQuery,
  useStartRunMutation,
  useGetRunQuery,
  useLazyGetRunQuery,
  useListRunsQuery,
  useGetReportQuery,
  useLazyGetReportQuery,
  useCancelRunMutation,
  useListReportsQuery,
  useListArtifactsQuery,
  useGetArtifactQuery,
  useGetQueryRecordsQuery,
  useGetLogsQuery,
  useUploadKBMutation,
} = sandboxApi;
