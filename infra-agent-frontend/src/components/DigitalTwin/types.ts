/**
 * Data Center Digital Twin Type Definitions
 *
 * These types support the multi-level data center visualization:
 * Globe -> Site -> Building -> Floor -> Rack -> Device
 */

import type { DeviceTelemetryProbes } from "@/schemas/telemetryProbe.schema";

// BMC (Baseboard Management Controller) information
export interface BMC {
  ip_address: string;
  type: string;
  username: string;
  port: number;
  vault_secret_path: string;
  reachable: boolean | null;
}

// Device interface (network ports)
export interface DeviceInterface {
  id: number;
  name: string;
  type: string;
  mac_address?: string;
  enabled: boolean;
}

// Full device from API
export interface Device {
  id: number;
  name: string;
  status: string;
  role: string | null;
  device_type: string;
  manufacturer: string;
  model: string;
  serial: string;
  asset_tag: string;
  sku: string | null;
  service_tag: string | null;
  site: string;
  site_id: number;
  location: string;
  location_id: number;
  rack: string;
  rack_id: number;
  position: number;
  face: string | null;
  primary_ip: string | null;
  primary_ip6: string | null;
  accelerators: string;
  gpu_count: number;
  u_height: number | null;
  is_full_depth: boolean | null;
  interconnect_type: string | null;
  cluster_id: string;
  tenant: string;
  tenant_id: number;
  tenant_slug: string;
  connected_devices: string[];
  bmc: BMC;
  interfaces: DeviceInterface[];
  interface_count: number;
  connection_count: number;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
}

// Rack from API
export interface Rack {
  id: number;
  name: string;
  status: string;
  role: string;
  u_height: number;
  serial: string;
  site_id: number;
  location_id: number;
  /** Parent location display name from API. */
  location_name?: string;
  /** Breadcrumb path from site root to parent location. */
  location_path?: string[];
  tenant: string | null;
  tenant_id: number | null;
  tenant_slug: string | null;
  devices: Device[];
  device_count: number;
  total_u_used: number;
  /** Cabinet position within row (from NetBox custom_fields). */
  cabinet_index?: number | null;
}

// Location (hierarchical - can contain child locations)
export interface Location {
  id: number;
  name: string;
  status: string;
  site_id: number;
  parent_id: number | null;
  racks: Rack[];
  devices: Device[];
  children: Location[];
  rack_count: number;
  device_count: number;
  /** Row aisle sort order (from NetBox custom_fields). */
  row_sort_key?: number | null;
}

/** Backend-reported layout metadata gaps for this site response. */
export type LayoutWarnings = string[];

// Site (data center building)
export interface Site {
  id: number;
  name: string;
  slug: string;
  status: string;
  region_id: number;
  latitude: number;
  longitude: number;
  physical_address: string;
  locations: Location[];
  racks: Rack[];
  devices: Device[];
  location_count: number;
  rack_count: number;
  device_count: number;
}

// Region (geographical grouping)
export interface Region {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  sites: Site[];
  children: Region[];
  site_count: number;
  device_count: number;
}

// Summary statistics
export interface DataCenterSummary {
  regions: number;
  sites: number;
  locations: number;
  racks: number;
  devices: number;
  interfaces: number;
  connections: number;
  clusters: number;
  total_gpus: number;
  devices_by_role: Record<string, number>;
  devices_by_manufacturer: Record<string, number>;
  devices_by_accelerator: Record<string, number>;
  connections_by_type: Record<string, number>;
}

// Full API response
export interface DataCenterAPIResponse {
  summary: DataCenterSummary;
  regions: Region[];
}

// Health status for sites (from live cluster data)
export type SiteHealthStatus = "healthy" | "unhealthy" | "warning" | "unknown";

/**
 * Role utilization from GET /command-center/sites (0–100).
 * null = no live sample / error / not present; 0 = real zero. (Fixed to be
 * nullable in Phase 13 — matches the Vite source and the real backend
 * contract; every consumer already null-guards via `?? 0`.)
 */
export interface GlobeSiteUtilization {
  compute: number | null;
  storage: number | null;
  network: number | null;
  cpu: number | null;
  gpu: number | null;
  ram: number | null;
  disk: number | null;
}

export interface GlobeSiteIncidentCounts {
  critical: number;
  warning: number;
  unknown: number;
}

export interface GlobeSiteInventory {
  compute: number;
  storage: number;
  network: number;
  other: number;
}

// Flattened site for globe markers
export interface GlobeSite {
  id: number;
  name: string;
  slug: string;
  status: string;
  regionName: string;
  regionSlug: string;
  latitude: number;
  longitude: number;
  address: string;
  rackCount: number;
  deviceCount: number;
  gpuCount: number;
  locations: Location[];
  healthStatus?: SiteHealthStatus;
  issueSummary?: string | null;
  affectedDevice?: string | null;
  affectedDevices?: string[];
  warningDevices?: string[];
  /** Layout metadata gaps from GET /devices/digital-twin metadata. */
  layoutWarnings?: string[];
  /** Command Center enrichment (GET /command-center/sites). */
  clusterId?: number | null;
  healthPercent?: number;
  incidentCounts?: GlobeSiteIncidentCounts;
  inventory?: GlobeSiteInventory;
  utilization?: GlobeSiteUtilization;
  powerWattsAvg?: number | null;
  powerWattsTotal?: number | null;
}

// 3D Device representation (for Three.js scene)
export interface Device3D {
  device_id: string;
  hostname: string;
  ip_address: string;
  device_type: string;
  status: "online" | "offline" | "degraded";
  temperature?: number;
  power_consumption?: number;
  rack_position: string;
  u_position: number;
  height_u?: number;
  is_full_depth?: boolean;
  health_status?: "ok" | "warning" | "critical" | "unknown";
  manufacturer?: string;
  model?: string;
  firmware_version?: string;
  management_interface?: string;
  protocols_found?: string[];
  ports_count?: number;
  bmc_ip?: string;
  bmc_type?: string;
  bmc_username?: string;
  accelerators?: string;
  gpu_count?: number;
  cluster_id?: string;
  tenant?: string;
  tags?: string[];
  serial?: string;
  asset_tag?: string;
  service_tag?: string;
  last_telemetry_timestamp?: string | null;
  data_freshness?: "real-time" | "stale" | "unknown" | "partial" | "missing";
  telemetry_probes?: DeviceTelemetryProbes | null;
  /** Index of embedded NVMe drive within a storage host (0-based). */
  sub_slot_index?: number;
  /** Total embedded drives in the parent host. */
  drives_in_host?: number;
  /** Parent storage host hostname for embedded drives. */
  embedded_in_host?: string;
  /** Embedded NVMe drives for storage hosts (preserved for detail panels). */
  ssd_drives?: {
    controller: string;
    serial: string;
    asset_tag: string;
    name: string;
  }[];
}

// 3D Rack representation (for Three.js scene)
export interface Rack3D {
  rack_id: string;
  rack_name: string;
  rack_color?: string;
  row_name: string;
  devices: Device3D[];
  position: [number, number, number];
  rotation?: [number, number, number];
  u_height?: number;
}

// Device data for info card display
export interface DeviceData {
  device_id: string;
  hostname: string;
  ip_address: string;
  device_type: string;
  status: "online" | "offline" | "degraded";
  manufacturer: string;
  model: string;
  firmware_version?: string;
  location?: string;
  rack_position: string;
  power_consumption?: number;
  temperature?: number;
  health_status?: "ok" | "warning" | "critical" | "unknown";
  management_interface?: string;
  protocols_found?: string[];
  ports_count?: number;
  bmc_ip?: string;
  bmc_type?: string;
  bmc_username?: string;
  accelerators?: string;
  gpu_count?: number;
  cluster_id?: string;
  tenant?: string;
  tags?: string[];
  serial?: string;
  asset_tag?: string;
  service_tag?: string;
}

// View modes for the digital twin
export type ViewMode = "globe" | "interior" | "exterior";

// Transition states for view changes
export type TransitionState = "idle" | "zooming-in" | "zooming-out" | "loading";
