import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type {
  GetTeamMetricsArgs,
  PrometheusQueryResponse,
  PrometheusResult,
  TeamMetrics,
} from "./prometheusApi.types";

function extractValue(result: PrometheusResult[] | undefined): number {
  if (!result || result.length === 0) return 0;
  return result.reduce((sum, r) => sum + (r.value?.[1] ? parseFloat(r.value[1]) : 0), 0);
}

function extractDelegationBreakdown(
  result: PrometheusResult[] | undefined,
): Record<string, number> {
  const breakdown: Record<string, number> = {};
  if (!result || result.length === 0) return breakdown;

  for (const r of result) {
    const delegationType =
      r.metric.delegation_type || r.metric.to_agent || r.metric.agent_name || "unknown";
    const numVal = r.value?.[1] ? parseFloat(r.value[1]) : 0;
    breakdown[delegationType] = (breakdown[delegationType] ?? 0) + numVal;
  }
  return breakdown;
}

/** Operations Manager observability metrics, proxied to Prometheus via `/api/metrics`. */
export const prometheusApi = createApi({
  reducerPath: "prometheusApi",
  baseQuery: createBaseQuery("/api/metrics"),
  tagTypes: ["TeamMetrics"],
  endpoints: (builder) => ({
    /** Fans out 4 parallel instant queries (sessions/delegations/tokens/events), filtered by team_id (preferred) or cluster_id. */
    getTeamMetrics: builder.query<TeamMetrics, GetTeamMetricsArgs>({
      queryFn: async ({ teamId, clusterId }, _api, _extraOptions, baseQuery) => {
        const filter = teamId ? `team_id="${teamId}"` : `cluster_id="${clusterId}"`;
        const queries = {
          sessionsActive: `sessions_active{${filter}}`,
          delegationsTotal: `delegations_total{${filter}}`,
          tokensTotal: `tokens_total{${filter}}`,
          eventsProcessed: `events_processed_total{${filter}}`,
        };

        const [sessionsRes, delegationsRes, tokensRes, eventsRes] = await Promise.all(
          Object.values(queries).map((q) =>
            baseQuery(`/api/v1/query?query=${encodeURIComponent(q)}`),
          ),
        );

        const asResult = (r: typeof sessionsRes) => {
          const data = r.data as PrometheusQueryResponse | undefined;
          return data?.status === "success" ? data.data.result : undefined;
        };

        const data: TeamMetrics = {
          sessionsActive: extractValue(asResult(sessionsRes)),
          delegationsTotal: extractDelegationBreakdown(asResult(delegationsRes)),
          tokensTotal: extractValue(asResult(tokensRes)),
          eventsProcessed: extractValue(asResult(eventsRes)),
        };

        return { data };
      },
      providesTags: (_result, _error, { teamId, clusterId }) => [
        { type: "TeamMetrics", id: teamId ?? clusterId ?? "unknown" },
      ],
      keepUnusedDataFor: 15,
    }),
  }),
});

export const { useGetTeamMetricsQuery } = prometheusApi;
