import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

export interface StackUptimePeriodMetrics {
  period_start: string;
  period_end: string;
  total_seconds: number;
  uptime_percentage: number;
  services_count: number;
}

export interface StackUptimeResponse {
  timestamp: string;
  stack: {
    total_services: number;
    services_up: number;
    services_down: number;
    uptime_percentage: number;
    uptime_since: string;
    current_uptime_seconds: number;
    current_uptime_formatted: string;
    total_restarts: number;
    metrics?: Record<string, StackUptimePeriodMetrics>;
  };
}

/**
 * Stack uptime history, from the uptime-monitor service (`/uptime-api`,
 * proxied to port 8030). `getStackUptime` has zero consumers in the Vite
 * app either (confirmed: only ever registered in its store, never called
 * from a component) -- ported for parity since it's a trivial single
 * endpoint, not because a real page needs it yet.
 */
export const uptimeApi = createApi({
  reducerPath: "uptimeApi",
  baseQuery: createBaseQuery("/uptime-api"),
  tagTypes: ["StackUptime"],
  endpoints: (builder) => ({
    getStackUptime: builder.query<StackUptimeResponse, void>({
      query: () => "/stack/uptime",
      providesTags: ["StackUptime"],
      keepUnusedDataFor: 30,
    }),
  }),
});

export const { useGetStackUptimeQuery } = uptimeApi;
