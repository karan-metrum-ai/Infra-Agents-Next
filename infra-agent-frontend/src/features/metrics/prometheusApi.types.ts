export interface PrometheusResult {
  metric: Record<string, string>;
  /** [timestamp, value] for instant queries. */
  value?: [number, string];
}

export interface PrometheusQueryResponse {
  status: "success" | "error";
  data: {
    resultType: "vector" | "matrix" | "scalar" | "string";
    result: PrometheusResult[];
  };
  errorType?: string;
  error?: string;
}

export interface TeamMetrics {
  sessionsActive: number;
  delegationsTotal: Record<string, number>;
  tokensTotal: number;
  eventsProcessed: number;
}

export interface GetTeamMetricsArgs {
  /** Takes precedence over `clusterId` when both are provided. */
  teamId?: string;
  clusterId?: string;
}
