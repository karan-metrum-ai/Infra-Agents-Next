/**
 * Live device/switch telemetry types (Redfish/iDRAC + SONiC-backed).
 * Field names mirror the backend contract 1:1 (snake_case wire fields).
 */

import type { DeviceTelemetryProbes } from "@/schemas/telemetryProbe.schema";
import type {
  OnboardingCluster,
  OnboardingConnection,
  OnboardingDevice,
} from "@/components/DigitalTwin/rackLayout.types";

export type DeviceHealthStatus = "healthy" | "unhealthy" | "warning" | "unknown";
export type DeviceStatus = "active" | "degraded" | "offline" | "unknown";
export type ComponentHealth = "OK" | "Warning" | "Critical" | "Unknown";

export interface LiveDeviceBMC {
  ip_address: string;
  type: string;
  username: string;
  port: number;
  vault_secret_path: string;
}

export interface LiveDeviceSystem {
  service_tag: string;
  express_service_code: string;
  asset_tag: string | null;
  hostname: string;
  model: string;
  manufacturer: string;
  sku: string | null;
  serial_number: string;
  part_number: string | null;
  uuid: string;
  bios_version: string;
  bios_release_date: string;
  firmware_version: string;
  idrac_version: string;
  lifecycle_controller_version: string;
  os_name: string | null;
  os_version: string | null;
  power_state: string;
  indicator_led: string;
}

export interface LiveDeviceHardware {
  cpu_model: string;
  cpu_count: number;
  cpu_cores_total: number;
  cpu_threads_total: number;
  memory_total_gb: number;
  memory_dimm_count: number;
  memory_speed_mhz: number;
  memory_type: string;
  storage_total_tb: number;
  storage_drives: number;
  storage_controllers: number;
  gpu_model: string | null;
  gpu_count: number;
  gpu_memory_gb: number | null;
  nic_count: number;
  psu_count: number;
  psu_total_capacity_watts: number;
  fan_count: number;
}

export interface LiveDeviceProcessor {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  socket: string;
  cores: number;
  threads: number;
  max_speed_mhz: number;
  current_speed_mhz: number;
  l1_cache_kb: number;
  l2_cache_kb: number;
  l3_cache_mb: number;
  status: ComponentHealth;
  health: ComponentHealth;
}

export interface LiveDeviceMemory {
  id: string;
  name: string;
  slot: string;
  manufacturer: string;
  part_number: string;
  serial_number: string;
  capacity_gb: number;
  speed_mhz: number;
  type: string;
  rank: number;
  data_width_bits: number;
  ecc: boolean;
  status: ComponentHealth;
  health: ComponentHealth;
}

export interface LiveDeviceStorageDrive {
  id: string;
  name: string;
  slot: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  firmware_version: string;
  capacity_gb: number;
  media_type: string;
  protocol: string;
  interface_speed_gbps: number;
  rotation_speed_rpm: number | null;
  predicted_life_remaining_percent: number | null;
  power_on_hours: number | null;
  status: ComponentHealth;
  health: ComponentHealth;
  hotspare_type: string | null;
  has_live_metrics?: boolean;
  wear_used_percent?: number | null;
  temperature_celsius?: number | null;
  available_spare_percent?: number | null;
  media_errors?: number | null;
  read_iops?: number | null;
  write_iops?: number | null;
  read_throughput_mbps?: number | null;
  write_throughput_mbps?: number | null;
  wear_level?: number | null;
  spare_percent?: number | null;
  power_cycles?: number | null;
  critical_warning?: number | null;
  data_units_read?: number | null;
  data_units_written?: number | null;
  host_reads?: number | null;
  host_writes?: number | null;
  unsafe_shutdowns?: number | null;
  integrity_errors?: number | null;
  spare_threshold?: number | null;
  controller_busy?: number | null;
  controller_state?: string | null;
  pcie_aer_correctable?: number | null;
  pcie_aer_uncorrectable?: number | null;
  io_timeouts?: number | null;
  io_errors?: number | null;
  diskstats_reads?: number | null;
  diskstats_writes?: number | null;
  diskstats_read_bytes?: number | null;
  diskstats_write_bytes?: number | null;
  hwmon_temp?: number | null;
}

export interface LiveDeviceStorageController {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  firmware_version: string;
  cache_size_mb: number;
  supported_raid_levels: string[];
  drives_attached: number;
  status: ComponentHealth;
  health: ComponentHealth;
}

export interface LiveDeviceNetworkInterface {
  id: string;
  name: string;
  description: string;
  manufacturer: string;
  model: string;
  mac_address: string;
  permanent_mac_address: string | null;
  speed_mbps: number;
  full_duplex: boolean;
  auto_negotiate: boolean;
  link_status: "Up" | "Down";
  mtu: number;
  vlan_id: number | null;
  ipv4_address: string | null;
  ipv4_subnet: string | null;
  ipv4_gateway: string | null;
  ipv6_address: string | null;
  firmware_version: string;
  status: ComponentHealth;
  health: ComponentHealth;
}

export interface LiveDeviceGPU {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  firmware_version: string;
  pci_slot: string;
  memory_gb: number;
  memory_type: string;
  bus_width_bits: number;
  cuda_cores: number;
  tensor_cores: number;
  power_limit_watts: number;
  current_power_watts: number;
  temperature_celsius: number;
  utilization_percent: number;
  memory_utilization_percent: number;
  status: ComponentHealth;
  health: ComponentHealth;
}

export interface LiveDevicePowerSupply {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  firmware_version: string;
  part_number: string | null;
  spare_part_number: string | null;
  capacity_watts: number;
  current_output_watts: number;
  input_voltage: number;
  input_voltage_type: string;
  efficiency_percent: number;
  line_input_status: string;
  status: ComponentHealth;
  health: ComponentHealth;
  hot_pluggable: boolean;
  redundancy_status: string;
}

export interface LiveDeviceFan {
  id: string;
  name: string;
  location: string;
  current_rpm: number;
  min_rpm: number;
  max_rpm: number;
  speed_percent: number;
  status: ComponentHealth;
  health: ComponentHealth;
  hot_pluggable: boolean;
  redundancy_status: string;
}

export interface LiveDevicePower {
  current_watts: number;
  peak_watts: number;
  avg_watts: number | null;
  min_watts: number | null;
  power_cap_watts: number | null;
  power_cap_enabled: boolean;
  input_voltage: number | null;
  psu_count: number;
  psu_redundancy: string;
  psu_status: ComponentHealth[];
  power_state: string;
}

export interface LiveDeviceThermal {
  inlet_temp_celsius: number;
  exhaust_temp_celsius: number;
  cpu_temp_celsius: number[];
  gpu_temp_celsius: number[];
  memory_temp_celsius: number | null;
  storage_temp_celsius: number | null;
  ambient_temp_celsius: number;
  fan_count: number;
  fan_speeds_rpm: number[];
  fan_speeds_percent: number[];
  fan_status: ComponentHealth[];
  cooling_redundancy: string;
}

export interface LiveDeviceSensor {
  name: string;
  value: number;
  unit: string;
  status: string;
  location: string;
}

export interface LiveDeviceEvent {
  id: string;
  timestamp: string;
  event_ts?: string;
  severity: string;
  category: string;
  message: string;
  message_id: string;
  component: string;
  action: string | null;
  resolved: boolean;
  log_type?: string;
  is_routine?: boolean;
}

export interface LiveDeviceEventsSummary {
  total_events: number;
  critical_count: number;
  warning_count: number;
  informational_count: number;
  last_critical_event: string | null;
  last_warning_event: string | null;
  last_event_timestamp: string;
}

/** OS-level metrics (node_exporter) — only populated for hosts with a scrape configured. */
export interface LiveDeviceOsMetrics {
  cpu_usage_percent: number | null;
  cpu_count: number | null;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  mem_total_bytes: number | null;
  mem_available_bytes: number | null;
  mem_used_percent: number | null;
  swap_total_bytes: number | null;
  swap_used_bytes: number | null;
  root_fs_total_bytes: number | null;
  root_fs_used_bytes: number | null;
  root_fs_used_percent: number | null;
  boot_time: string | null;
  uptime_seconds: number | null;
  network_rx_bytes_per_sec: number | null;
  network_tx_bytes_per_sec: number | null;
  last_update: string | null;
}

/** Per-GPU runtime telemetry (amd-smi-exporter today, NVIDIA equivalent later). */
export interface LiveDeviceGpuTelemetry {
  gpu_index: number;
  gpu_uuid: string | null;
  bdf: string | null;
  model: string | null;
  vendor: string;
  utilization_percent: number | null;
  memory_utilization_percent: number | null;
  hotspot_temp_celsius: number | null;
  edge_temp_celsius: number | null;
  memory_temp_celsius: number | null;
  power_watts: number | null;
  power_cap_watts: number | null;
  fan_speed_percent: number | null;
  vram_total_bytes: number | null;
  vram_used_bytes: number | null;
  vram_used_percent: number | null;
  pcie_link_speed_gbps: number | null;
  pcie_link_width: number | null;
  ecc_uncorrectable_total: number | null;
  ecc_correctable_total: number | null;
  last_update: string | null;
}

export interface LiveDeviceDetailResponse {
  success: boolean;
  timestamp: string;
  device_id: number;
  name: string;
  status: DeviceStatus;
  health_status: DeviceHealthStatus;
  cluster_id: number | null;
  site: string;
  rack: string;
  position: number;
  device_type: string;
  manufacturer: string;
  model: string;
  serial: string;
  asset_tag: string;
  primary_ip: string | null;
  bmc: LiveDeviceBMC;
  system: LiveDeviceSystem;
  hardware: LiveDeviceHardware;
  processors: LiveDeviceProcessor[];
  memory: LiveDeviceMemory[];
  storage_drives: LiveDeviceStorageDrive[];
  storage_controllers: LiveDeviceStorageController[];
  network_interfaces: LiveDeviceNetworkInterface[];
  gpus: LiveDeviceGPU[];
  power_supplies: LiveDevicePowerSupply[];
  fans: LiveDeviceFan[];
  power: LiveDevicePower;
  thermal: LiveDeviceThermal;
  sensors: LiveDeviceSensor[];
  events_summary: LiveDeviceEventsSummary;
  events: LiveDeviceEvent[];
  events_alerts?: LiveDeviceEvent[];
  events_sel?: LiveDeviceEvent[];
  events_lifecycle?: LiveDeviceEvent[];
  recent_logs: string[];
  data_freshness: string;
  last_telemetry_timestamp: string | null;
  is_simulated: boolean;
  telemetry_probes?: DeviceTelemetryProbes | null;
  /** Stable composite identifier: "{device_name}.{netbox_id}". Survives re-IP events. */
  device_key: string | null;
  /** NetBox primary key (integer). Use to query across device renames. */
  netbox_id: number | null;
  os?: LiveDeviceOsMetrics | null;
  gpus_telemetry?: LiveDeviceGpuTelemetry[];
}

export interface SwitchSystemInfo {
  hostname: string;
  platform: string | null;
  hwsku: string | null;
  sw_version: string | null;
  serial: string | null;
  mac: string | null;
  management_ip: string | null;
  model: string | null;
  site: string | null;
  rack: string | null;
  position: number | null;
}

export interface SwitchPortInfo {
  ifname: string;
  alias: string;
  speed: string;
  reason: string;
  oper_status: number;
}

export interface SwitchBgpSession {
  neighbor_address: string;
  peer_as: string;
  local_as: string;
  established: boolean;
}

export interface SwitchFan {
  fan_name: string;
  serial: string;
  active: boolean;
}

export interface SwitchPsu {
  psu_name: string;
  serial: string;
  active: boolean;
}

export interface SwitchTransceiver {
  ifname: string;
  vendor: string;
  model: string;
  serial: string;
  temp_celsius: number | null;
}

export interface SwitchAlarm {
  alarm_id: string;
  severity: string;
  type_id: string;
  resource: string;
  text: string;
}

export interface SwitchEvent {
  event_id: string;
  severity: string;
  type_id: string;
  resource: string;
  action: string;
  text: string;
  time_created: string;
}

export interface SwitchLldpNeighbor {
  local_port: string;
  neighbor_name: string;
  neighbor_port: string;
}

export interface LiveSwitchDetailResponse {
  success: boolean;
  device_id: number;
  name: string;
  health_status: string;
  data_freshness: string;
  system: SwitchSystemInfo;
  cpu: Record<string, number> | null;
  memory: {
    physical_bytes: number | null;
    unused_bytes: number | null;
    used_bytes: number | null;
    usage_percent: number | null;
  };
  process_count: number | null;
  ports: {
    total: number;
    up: number;
    down: number;
    interfaces: SwitchPortInfo[];
  };
  bgp_sessions: SwitchBgpSession[];
  fans: SwitchFan[];
  psus: SwitchPsu[];
  transceivers: SwitchTransceiver[];
  alarms: SwitchAlarm[];
  alarm_stats: Record<string, number> | null;
  events: SwitchEvent[];
  lldp_neighbors: SwitchLldpNeighbor[];
  mclag: unknown[];
}

export interface TimeSeriesPoint {
  ts: number;
  val: number;
}

export interface TimeSeriesResult {
  cluster_id: number;
  metric: string;
  from_ts: number;
  to_ts: number;
  step: string;
  aggregation: string;
  points: TimeSeriesPoint[];
  downsampled: boolean;
  cache_hit: boolean;
}

/* =============================================================================
 * Digital twin topology (GET /devices/digital-twin) — raw NetBox-shaped wire
 * response. Transformed into GlobeSite[] by digitalTwinDataTransform.ts;
 * these interfaces exist only to type that transform, not for direct
 * component consumption (components use GlobeSite/Location/Rack/Device from
 * @/components/DigitalTwin/types).
 * ========================================================================== */

export interface ApiSummary {
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

export interface ApiBmc {
  ip_address: string;
  type: string;
  username: string;
  port: number;
  vault_secret_path: string;
  reachable: boolean | null;
}

export interface ApiConnectedEndpoint {
  device_id: number;
  device_name: string;
  interface_id: number;
  interface_name: string;
  site: string;
  rack: string;
  rack_position: number;
}

export interface ApiInterface {
  id: number;
  name: string;
  type: string | null;
  description: string;
  mac_address: string | null;
  mtu: number | null;
  speed: string | null;
  speed_display: string | null;
  mode: string | null;
  enabled: boolean;
  mgmt_only: boolean;
  cable_id: number | null;
  cable_type: string | null;
  connected_to: ApiConnectedEndpoint | null;
}

export interface ApiDevice {
  id: number;
  name: string;
  status: string;
  role: string;
  device_type: string;
  manufacturer: string;
  model: string;
  serial: string;
  asset_tag: string;
  sku: string | null;
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
  interconnect_type: string | null;
  cluster_id: string;
  tenant: string;
  tenant_id: number;
  tenant_slug: string;
  connected_devices: string[];
  bmc: ApiBmc;
  interfaces: ApiInterface[];
  interface_count: number;
  connection_count: number;
  service_tag: string | null;
  u_height: number | null;
  is_full_depth: boolean | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
}

export interface ApiRack {
  id: number;
  name: string;
  status: string;
  role: string;
  u_height: number;
  serial: string;
  site_id: number;
  location_id: number;
  site_name: string;
  location_name: string;
  region_slug: string;
  path: string[];
  tenant: string | null;
  tenant_id: number | null;
  tenant_slug: string | null;
  devices: ApiDevice[];
  device_count: number;
  total_u_used: number;
  cabinet_index?: number | null;
}

export interface ApiLocation {
  id: number;
  name: string;
  status: string;
  site_id: number;
  parent_id: number | null;
  path?: string[];
  racks: ApiRack[];
  devices: ApiDevice[];
  children: ApiLocation[];
  rack_count: number;
  device_count: number;
  row_sort_key?: number | null;
}

export interface ApiSite {
  id: number;
  name: string;
  slug: string;
  status: string;
  region_id: number;
  region_name: string;
  region_slug: string;
  latitude: number;
  longitude: number;
  physical_address: string;
  locations: ApiLocation[];
  racks: ApiRack[];
  devices: ApiDevice[];
  location_count: number;
  rack_count: number;
  device_count: number;
}

export interface ApiRegion {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  sites: ApiSite[];
  children: ApiRegion[];
  site_count: number;
  device_count: number;
}

export interface ApiMetadata {
  generated_at: string;
  netbox_url: string;
  netbox_version: string;
  api_version: string | null;
  include_interfaces: boolean;
  include_connections: boolean;
  include_clusters: boolean;
  include_bmc: boolean;
  cluster_filter: string | null;
  validation: unknown;
  layout_warnings?: string[];
}

export interface DigitalTwinApiResponse {
  summary: ApiSummary;
  regions: ApiRegion[];
  /**
   * Same wire shape as the parallel `getOnboardingDevices` (Phase 11)
   * response for this identical backend path — reusing `Onboarding*` from
   * `rackLayout.types.ts` here instead of redeclaring a third copy.
   */
  clusters?: OnboardingCluster[];
  connections?: OnboardingConnection[];
  unassigned_devices?: OnboardingDevice[];
  metadata: ApiMetadata;
}

/**
 * Query params for GET /devices/digital-twin (getDigitalTwinData).
 *
 * The Vite app hit this same endpoint from two separate RTK Query
 * definitions with identical `include_*`/`validate` defaults —
 * `getDigitalTwinData` and `getOnboardingDevices` (`bulkUploadApiSlice.ts`).
 * This port keeps a single endpoint instead. The flags below exist so a
 * future caller CAN diverge from those defaults without adding a second
 * endpoint; nothing in this migration actually needs a non-default value
 * today.
 */
export interface DigitalTwinQueryParams {
  clusterId?: string;
  /** Default true. */
  includeInterfaces?: boolean;
  /** Default true. */
  includeConnections?: boolean;
  /** Default true. */
  includeClusters?: boolean;
  /** Default true. */
  includeBmc?: boolean;
  /** Default false. */
  validate?: boolean;
}

/** Request/response shapes for the `onboardDevices` mutation (pulled forward — see digitalTwinApi.ts doc comment). */
/* =============================================================================
 * Live clusters (GET /bulk-upload/live/clusters/health) — cluster-level
 * health polling for the globe/topology views.
 * ========================================================================== */

export type ClusterHealthStatus = "healthy" | "unhealthy" | "warning";

export interface LiveClusterInfo {
  cluster_id: string;
  cluster_name: string;
  primary_site: string;
  health_status: ClusterHealthStatus;
  total_devices: number;
  healthy_devices: number;
  unhealthy_devices: number;
  warning_devices: number;
  offline_devices: number;
  total_gpus: number;
  power_consumption_watts: number;
  avg_temperature_celsius: number;
  data_freshness: string;
  active_scenario: string | null;
  affected_device: string | null;
  issue_summary: string | null;
  /** Device names with active critical events (red rack highlight). */
  affected_devices?: string[];
  /** Device names with active warning events (amber highlight only). */
  warning_device_names?: string[];
}

export interface LiveClustersRotationInfo {
  current_rotation_index: number;
  warning_rotation_index: number;
  unhealthy_cluster_index: number;
  unhealthy_scenario: string;
  warning_cluster_index: number;
  warning_scenario: string;
  rotation_interval_seconds: number;
  seconds_until_next_rotation: number;
  next_rotation_at: string;
}

export interface LiveClustersResponse {
  success: boolean;
  timestamp: string;
  total_clusters: number;
  healthy_clusters: number;
  unhealthy_clusters: number;
  warning_clusters: number;
  clusters: LiveClusterInfo[];
  data_freshness: string;
  rotation_info: LiveClustersRotationInfo;
  // Node-level health aggregation
  total_nodes: number;
  healthy_nodes: number;
  warning_nodes: number;
  critical_nodes: number;
  unknown_nodes: number;
  healthy_percent: number;
  warning_percent: number;
  critical_percent: number;
  unknown_percent: number;
}

/* =============================================================================
 * Bulk live devices (GET /bulk-upload/live/devices/{clusterId}) — freshness
 * data for the 3D rack visualization.
 * ========================================================================== */

/** Bulk live device info for freshness display. */
export interface BulkLiveDevice {
  device_id: string;
  hostname: string;
  bmc_ip: string | null;
  health_status: string;
  last_telemetry_timestamp: string | null;
  data_freshness: string | null;
  telemetry_probes?: DeviceTelemetryProbes | null;
}

export interface BulkLiveDevicesResponse {
  success: boolean;
  cluster_id: number;
  device_count: number;
  devices: BulkLiveDevice[];
  data_freshness: string;
  message: string;
}

/* =============================================================================
 * Command Center sites (GET /command-center/sites) — flat per-site rollup
 * used to enrich the Live Dashboard overview globe. Live-or-zero
 * utilization/power — never simulated; missing telemetry stays `null`.
 * ========================================================================== */

export interface CommandCenterSiteInventory {
  compute: number;
  storage: number;
  network: number;
  other: number;
}

export interface CommandCenterSiteIncidentCounts {
  critical: number;
  warning: number;
  unknown: number;
}

/** Utilization pct; null when no live samples (not the same as 0%). */
export type UtilPercent = number | null;

export interface CommandCenterSiteUtilization {
  compute: UtilPercent;
  storage: UtilPercent;
  network: UtilPercent;
  cpu: UtilPercent;
  gpu: UtilPercent;
  ram: UtilPercent;
  disk: UtilPercent;
}

export interface CommandCenterSite {
  id: number;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  cluster_id: number | null;
  status: "healthy" | "warning" | "unhealthy" | "unknown" | string;
  health_percent: number;
  assets: number;
  rack_count: number;
  inventory: CommandCenterSiteInventory;
  incident_counts: CommandCenterSiteIncidentCounts;
  utilization: CommandCenterSiteUtilization;
  power_watts_avg: number | null;
  power_watts_total: number | null;
  issue_summary: string | null;
}

export interface CommandCenterSitesResponse {
  success: boolean;
  timestamp: string;
  sites: CommandCenterSite[];
}
