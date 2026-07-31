import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";
import type {
  BulkLiveDevicesResponse,
  CommandCenterSitesResponse,
  DigitalTwinApiResponse,
  DigitalTwinQueryParams,
  LiveClustersResponse,
  LiveDeviceDetailResponse,
  LiveSwitchDetailResponse,
  TimeSeriesResult,
} from "./digitalTwinApi.types";

/**
 * 3D digital twin, live cluster/device/switch telemetry, and Command Center
 * globe sites. The device/switch/timeseries telemetry endpoints below were
 * pulled forward for Phase 5 (DeviceHealthPanel, ServerDetailsCard,
 * SwitchDetailsCard, TimeSeriesChart are plain data cards, not 3D — they
 * don't need the rest of the digital twin scene to exist).
 *
 * Topology/globe endpoints landed in Phase 6: `getDigitalTwinData` (globe +
 * rack layout source of truth), `getLiveClusters` (cluster health polling),
 * `getLiveBulkDevices` (per-cluster telemetry freshness for the 3D rack
 * view). `getDeviceAgentActivity` (ghost-technician-only, dead feature) is
 * explicitly out of scope here. The `/topology` route itself was dropped
 * from this migration per explicit direction (superseded/outdated) — only
 * `/digital-twin` (`DigitalTwinRoute`) consumes the topology endpoints today.
 *
 * `getCommandCenterSites` (Live Dashboard globe enrichment) landed in
 * Phase 13 — same `/digital-twin-api` base as the topology endpoints above
 * (confirmed against the Vite source's `digitalTwinApiSlice.ts`: despite the
 * "digital twin" name, this base rewrites to the `/onboarding` backend
 * service in production, which is genuinely where `/command-center/sites`
 * lives too — it is not a copy-paste mistake). It feeds
 * `LiveDashboardOverview`'s globe via `commandCenterSiteToGlobeSite`
 * (`src/utils/commandCenterSites.ts`); the deeper "merge in digital-twin
 * hierarchy for split-view" behavior (`mergeTwinIntoCommandCenterSite`) is
 * ported too but deliberately unused by that call site today — see the doc
 * comment on `mergeTwinIntoCommandCenterSite` itself.
 *
 * `getDigitalTwinData` returns the RAW `/devices/digital-twin` response
 * (region/site/location/rack/device tree, NetBox-shaped wire fields)
 * instead of baking a `GlobeSite[]` transform into the endpoint, so any
 * future caller needing the untransformed tree (e.g. Phase 11's real
 * onboarding-devices port, which hits this identical backend path as
 * `getOnboardingDevices` in the Vite app's `bulkUploadApiSlice.ts`) can
 * reuse this one cached query instead of duplicating the GET. The globe
 * view derives its `GlobeSite[]` via `transformApiToGlobeSites`
 * (`digitalTwinDataTransform.ts`) on top of the raw result.
 */
export const digitalTwinApi = createApi({
  reducerPath: "digitalTwinApi",
  baseQuery: createBaseQuery("/digital-twin-api"),
  tagTypes: [
    "DigitalTwin",
    "LiveClusters",
    "LiveDeviceDetail",
    "LiveSwitchDetail",
    "DeviceAgentActivity",
    "CommandCenterSites",
  ],
  endpoints: (builder) => ({
    /**
     * Raw digital twin infrastructure topology (region/site/location/rack/
     * device tree). Callers transform this into whatever shape they need —
     * see the file-level doc comment above.
     */
    getDigitalTwinData: builder.query<DigitalTwinApiResponse, DigitalTwinQueryParams | void>({
      query: (params) => {
        const queryParams: Record<string, string | boolean> = {
          include_interfaces: params?.includeInterfaces ?? true,
          include_connections: params?.includeConnections ?? true,
          include_clusters: params?.includeClusters ?? true,
          include_bmc: params?.includeBmc ?? true,
          validate: params?.validate ?? false,
        };
        if (params?.clusterId) {
          queryParams.cluster = params.clusterId;
        }
        return { url: "/devices/digital-twin", params: queryParams };
      },
      providesTags: (_result, _error, params) => [
        { type: "DigitalTwin", id: params?.clusterId || "ALL" },
      ],
      // 5 minutes — data is invalidated explicitly when onboarding uploads occur.
      keepUnusedDataFor: 300,
    }),

    /** Live cluster health status, used for real-time health-badge polling. */
    getLiveClusters: builder.query<LiveClustersResponse, void>({
      query: () => "/bulk-upload/live/clusters/health",
      providesTags: ["LiveClusters"],
      // Slightly longer than the typical polling interval.
      keepUnusedDataFor: 15,
    }),

    /** Bulk live devices with telemetry timestamps for a cluster (3D rack freshness). */
    getLiveBulkDevices: builder.query<BulkLiveDevicesResponse, number>({
      query: (clusterId) => `/bulk-upload/live/devices/${clusterId}`,
      providesTags: (_result, _error, clusterId) => [{ type: "LiveClusters", id: clusterId }],
      keepUnusedDataFor: 30,
    }),

    /**
     * Command Center sites (globe + DATACENTERS sidebar). Live-or-zero
     * utilization/power — never simulated.
     */
    getCommandCenterSites: builder.query<CommandCenterSitesResponse, void>({
      query: () => "/command-center/sites",
      providesTags: ["CommandCenterSites"],
      keepUnusedDataFor: 15,
    }),

    /** Comprehensive live device detail (system/BIOS/BMC, hardware inventory, thermal/power, events). */
    getLiveDeviceDetail: builder.query<LiveDeviceDetailResponse, number>({
      query: (deviceId) => `/bulk-upload/live/device/${deviceId}/detail`,
      providesTags: (_result, _error, deviceId) => [{ type: "LiveDeviceDetail", id: deviceId }],
      keepUnusedDataFor: 30,
    }),

    /** Live SONiC switch detail: ports, BGP, fans/PSUs, alarms, events, LLDP neighbors. */
    getLiveSwitchDetail: builder.query<LiveSwitchDetailResponse, number>({
      query: (deviceId) => `/bulk-upload/live/switch/${deviceId}/detail`,
      providesTags: (_result, _error, deviceId) => [{ type: "LiveSwitchDetail", id: deviceId }],
      keepUnusedDataFor: 30,
    }),

    /** GreptimeDB device metric time-series (sparkline trend charts). */
    getDeviceTimeseries: builder.query<
      TimeSeriesResult,
      {
        deviceId: number;
        clusterId: number;
        metric: string;
        fromMs?: number;
        toMs?: number;
        step?: number;
        aggregation?: string;
      }
    >({
      query: ({ deviceId, clusterId, metric, fromMs, toMs, step, aggregation }) => {
        const params = new URLSearchParams({ cluster_id: String(clusterId), metric });
        if (fromMs !== undefined) params.set("from_ts", String(fromMs));
        if (toMs !== undefined) params.set("to_ts", String(toMs));
        if (step !== undefined) params.set("step", String(step));
        if (aggregation !== undefined) params.set("aggregation", aggregation);
        return `/metrics/${deviceId}/timeseries?${params.toString()}`;
      },
      providesTags: (_result, _error, { deviceId }) => [{ type: "LiveDeviceDetail", id: deviceId }],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetDigitalTwinDataQuery,
  useGetLiveClustersQuery,
  useGetLiveBulkDevicesQuery,
  useGetCommandCenterSitesQuery,
  useGetLiveDeviceDetailQuery,
  useGetLiveSwitchDetailQuery,
  useGetDeviceTimeseriesQuery,
} = digitalTwinApi;
