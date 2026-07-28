import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import {
  COMMON_METRIC_TABLES,
  type DeviceHealthMetrics,
  type MetricRecord,
} from "./deviceMetricsApi.types";

const HEALTH_TABLES = [
  ["powerSupplyHealth", COMMON_METRIC_TABLES.POWER_SUPPLY_HEALTH],
  ["systemHealth", COMMON_METRIC_TABLES.SYSTEM_HEALTH],
  ["temperature", COMMON_METRIC_TABLES.SENSORS_TEMPERATURE],
  ["events", COMMON_METRIC_TABLES.EVENTS_LOG_ENTRY],
  ["voltage", COMMON_METRIC_TABLES.SENSORS_VOLTAGE],
  ["current", COMMON_METRIC_TABLES.SENSORS_CURRENT],
  ["fan", COMMON_METRIC_TABLES.SENSORS_FAN],
  ["memory", COMMON_METRIC_TABLES.MEMORY_HEALTH],
  ["storage", COMMON_METRIC_TABLES.STORAGE_HEALTH],
  ["processor", COMMON_METRIC_TABLES.PROCESSOR_HEALTH],
] as const;

export interface GetDeviceHealthMetricsArgs {
  deviceIp: string;
  days?: number;
  hours?: number;
  minutes?: number;
}

/**
 * Device metrics client for GreptimeDB-backed telemetry (proxied via
 * `/onboarding-api` — named to avoid colliding with the app's own
 * `/onboarding` route).
 */
export const deviceMetricsApi = createApi({
  reducerPath: "deviceMetricsApi",
  baseQuery: createBaseQuery("/onboarding-api"),
  tagTypes: ["DeviceHealthMetrics"],
  endpoints: (builder) => ({
    /**
     * Fans out to the 10 canned GreptimeDB health tables in parallel; an
     * individual table 404ing (not yet populated for a device) degrades to
     * an empty array for that table rather than failing the whole query.
     */
    getDeviceHealthMetrics: builder.query<DeviceHealthMetrics, GetDeviceHealthMetricsArgs>({
      queryFn: async (
        { deviceIp, days = 0, hours = 0, minutes = 1 },
        _api,
        _extraOptions,
        baseQuery,
      ) => {
        const results = await Promise.all(
          HEALTH_TABLES.map(async ([key, tableName]) => {
            const params = new URLSearchParams({
              table_name: tableName,
              days: String(days),
              hours: String(hours),
              minutes: String(minutes),
            });
            const result = await baseQuery(`/devices/${deviceIp}/metrics?${params.toString()}`);
            return [key, (result.data as MetricRecord[] | undefined) ?? []] as const;
          }),
        );

        const data = Object.fromEntries(results) as unknown as DeviceHealthMetrics;
        return { data };
      },
      providesTags: (_result, _error, { deviceIp }) => [
        { type: "DeviceHealthMetrics", id: deviceIp },
      ],
      keepUnusedDataFor: 15,
    }),
  }),
});

export const { useGetDeviceHealthMetricsQuery } = deviceMetricsApi;
