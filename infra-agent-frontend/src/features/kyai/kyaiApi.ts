import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type { RawTrajectoryPayload } from "./kyaiApi.types";

/**
 * KyAI Playground session creation/replay. The Vite app's lib/kyaiApi.ts is
 * raw `fetch`, not RTK Query — Phase 12 (KyAI Playground) converts it to
 * endpoints here per the "RTK Query for all API calls" rule.
 *
 * The three endpoints below were added for Phase 7's `EvaluationModal`
 * (KYAI trajectory/evaluation viewer): the Vite source called
 * `/kyai/evaluations/{id}`, `/kyai/trajectory/parser`, and
 * `/kyai/trajectory/mermaid` with raw `fetch`, not RTK Query. All three are
 * one-shot request/response reads (no server-side mutation), so they move
 * here as RTK Query endpoints — `getTrajectoryMermaid` is modeled as a
 * `query` (not a `mutation`) despite being a POST under the hood, since it
 * only *computes* a diagram from the trajectory data it's given and has no
 * side effects; that lets `EvaluationModal` chain it after
 * `getKyaiEvaluation` as a plain dependent query (RTK Query's `skipToken`
 * pattern) instead of a `useEffect` watching for the first query's result.
 * The live SSE evaluation stream (`POST /kyai/evaluate`) is deliberately
 * NOT here — like `useFlowStream.ts` in Phase 8, a streaming
 * `ReadableStream` read doesn't fit RTK Query's request/response model, so
 * it stays a dedicated hook (`useKyaiEvaluationStream`, co-located with
 * `EvaluationModal`).
 */
export const kyaiApi = createApi({
  reducerPath: "kyaiApi",
  baseQuery: createBaseQuery("/kyai"),
  tagTypes: ["KyaiSession", "KyaiEvaluation"],
  endpoints: (builder) => ({
    /** Previously-run evaluation, by KYAI session correlation id. */
    getKyaiEvaluation: builder.query<RawTrajectoryPayload, string>({
      query: (correlationId) => `/evaluations/${correlationId}`,
      providesTags: (_result, _error, correlationId) => [
        { type: "KyaiEvaluation", id: correlationId },
      ],
      keepUnusedDataFor: 300,
    }),

    /** Parsed step-by-step trajectory for a live/completed session. */
    getTrajectoryParser: builder.query<RawTrajectoryPayload, string>({
      query: (sessionId) => `/trajectory/parser?session_id=${encodeURIComponent(sessionId)}`,
    }),

    /** Renders a trajectory payload into a Mermaid diagram source string. */
    getTrajectoryMermaid: builder.query<string, RawTrajectoryPayload>({
      query: (trajectoryData) => ({
        url: "/trajectory/mermaid",
        method: "POST",
        body: trajectoryData,
        responseHandler: "text",
      }),
      transformResponse: (response: string) => {
        try {
          return atob(response.replace(/^"|"$/g, ""));
        } catch {
          return "graph TD\n  A[KYAI Evaluation Started] --> B[Processing Request]\n  B --> C[Agents Coordinating]\n  C --> D[Task Execution]\n  D --> E[Analysis Complete]\n  style A fill:#6366f1,stroke:#4f46e5,color:#fff\n  style E fill:#10b981,stroke:#059669,color:#fff";
        }
      },
    }),
  }),
});

export const {
  useGetKyaiEvaluationQuery,
  useGetTrajectoryMermaidQuery,
  useLazyGetTrajectoryParserQuery,
  useLazyGetTrajectoryMermaidQuery,
} = kyaiApi;
