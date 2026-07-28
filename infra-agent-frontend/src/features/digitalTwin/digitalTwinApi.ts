import { createApi } from "@reduxjs/toolkit/query/react";
import { createBaseQuery } from "@/features/api/baseQuery";

/**
 * 3D digital twin, live cluster/device/switch telemetry, and Command Center
 * globe sites. Endpoints land in Phase 6 (Infrastructure Topology & Digital
 * Twin) — this is the largest single API surface in the Vite app
 * (digitalTwinApiSlice.ts, 1483 LOC), split out here as its own feature.
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
  endpoints: () => ({}),
});
