/**
 * Minimal onboarding/bulk-upload API shapes needed by `rackLayout.ts`'s
 * `onboardingResponseToLocations` converter.
 *
 * The Vite source imports these from `store/slices/bulkUploadApiSlice.ts` —
 * a 1483-line RTK Query slice that is real Phase 11 scope (Teams &
 * Onboarding), not yet ported here. Rather than build that whole slice
 * early or invent a different shape, this file carries forward just the
 * response/record types `rackLayout.ts` needs to compile and stay faithful
 * to the real onboarding-devices API payload. When Phase 11 ports the real
 * `bulkUploadApi.ts` (RTK Query), reconcile these with its generated types
 * instead of keeping two definitions.
 */

interface OnboardingDeviceBmc {
  ip_address: string | null;
  type: string | null;
  username: string | null;
  port: number | null;
  vault_secret_path: string | null;
  reachable: boolean | null;
}

export interface OnboardingInterface {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  mtu: number | null;
  mac_address: string | null;
  description: string;
  connected_endpoints: unknown[];
  speed_display?: string;
}

export interface OnboardingDevice {
  id: number;
  name: string;
  status: string;
  role: string | null;
  device_type: string;
  manufacturer: string;
  model: string;
  serial: string | null;
  asset_tag: string | null;
  sku: string | null;
  service_tag: string | null;
  site: string;
  site_id: number;
  location: string | null;
  location_id: number | null;
  rack: string | null;
  rack_id: number | null;
  position: number | null;
  face: string | null;
  primary_ip: string | null;
  primary_ip6: string | null;
  accelerators: string | null;
  gpu_count: number;
  u_height: number | null;
  is_full_depth: boolean | null;
  interconnect_type: string | null;
  cluster_id: string | null;
  tenant: string | null;
  tenant_id: number | null;
  tenant_slug: string | null;
  connected_devices: string[];
  bmc: OnboardingDeviceBmc | null;
  interfaces: OnboardingInterface[];
  interface_count: number;
  connection_count: number;
  tags: string[];
  custom_fields: Record<string, unknown>;
  created: string;
  last_updated: string;
}

export interface OnboardingRack {
  id: number;
  name: string;
  status: string;
  role: string | null;
  u_height: number;
  serial: string | null;
  site_id: number;
  location_id: number | null;
  cabinet_index?: number | null;
  tenant: string | null;
  tenant_id: number | null;
  tenant_slug: string | null;
  devices: OnboardingDevice[];
  device_count?: number;
  total_u_used?: number;
}

export interface OnboardingLocation {
  id: number;
  name: string;
  status: string;
  site_id: number;
  parent_id: number | null;
  row_sort_key?: number | null;
  racks: OnboardingRack[];
  devices: OnboardingDevice[];
  children: OnboardingLocation[];
  rack_count?: number;
  device_count?: number;
}

export interface OnboardingSite {
  id: number;
  name: string;
  slug: string;
  status: string;
  region_id: number | null;
  latitude: number | null;
  longitude: number | null;
  physical_address: string | null;
  locations: OnboardingLocation[];
  racks: OnboardingRack[];
  devices: OnboardingDevice[];
  location_count?: number;
  rack_count?: number;
  device_count?: number;
}

export interface OnboardingRegion {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  sites: OnboardingSite[];
  children: OnboardingRegion[];
  site_count?: number;
  device_count?: number;
}

export interface OnboardingCluster {
  cluster_id: string;
  name: string | null;
  device_count: number;
  total_gpus: number;
  interconnect_type: string | null;
  devices: string[];
  internal_connections: number;
  primary_site: string;
  device_details: OnboardingDevice[];
}

export interface OnboardingConnection {
  id: number;
  termination_a_type: string;
  termination_a_id: number;
  termination_b_type: string;
  termination_b_id: number;
  status: string;
  label: string;
}

export interface OnboardingDevicesSummary {
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

export interface OnboardingMetadata {
  generated_at: string;
  netbox_url: string;
  netbox_version: string | null;
  api_version: string | null;
  include_interfaces: boolean;
  include_connections: boolean;
  include_clusters: boolean;
  include_bmc: boolean;
  cluster_filter: string | null;
  validation: unknown | null;
}

export interface OnboardingDevicesResponse {
  summary: OnboardingDevicesSummary;
  regions: OnboardingRegion[];
  unassigned_devices: OnboardingDevice[];
  clusters: OnboardingCluster[];
  connections: OnboardingConnection[];
  metadata: OnboardingMetadata;
}
