/**
 * Transforms the raw `/devices/digital-twin` API response (nested
 * region -> site -> location -> rack -> device tree, NetBox-shaped wire
 * fields) into the flattened `GlobeSite[]` the globe view consumes. Kept
 * as its own file (rather than inline in `digitalTwinApi.ts`)
 * because the transform is a substantial recursive tree-walk, not a
 * one-liner `transformResponse`.
 */

import type {
  BMC,
  Device,
  DeviceInterface,
  GlobeSite,
  Location,
  Rack,
} from "@/components/DigitalTwin/types";
import type {
  ApiBmc,
  ApiDevice,
  ApiInterface,
  ApiLocation,
  ApiRack,
  ApiRegion,
  ApiSite,
  DigitalTwinApiResponse,
} from "./digitalTwinApi.types";

/** Transform API BMC to frontend BMC type. */
function transformBmc(apiBmc: ApiBmc | null | undefined): BMC {
  if (!apiBmc) {
    return {
      ip_address: "",
      type: "",
      username: "",
      port: 0,
      vault_secret_path: "",
      reachable: false,
    };
  }
  return {
    ip_address: apiBmc.ip_address,
    type: apiBmc.type,
    username: apiBmc.username,
    port: apiBmc.port,
    vault_secret_path: apiBmc.vault_secret_path,
    reachable: apiBmc.reachable,
  };
}

/** Transform API interface to frontend DeviceInterface type. */
function transformInterface(apiInterface: ApiInterface): DeviceInterface {
  return {
    id: apiInterface.id,
    name: apiInterface.name,
    type: apiInterface.type || "unknown",
    mac_address: apiInterface.mac_address || undefined,
    enabled: apiInterface.enabled,
  };
}

/** Transform API device to frontend Device type. */
function transformDevice(apiDevice: ApiDevice): Device {
  return {
    id: apiDevice.id,
    name: apiDevice.name,
    status: apiDevice.status,
    role: apiDevice.role || null,
    device_type: apiDevice.device_type,
    manufacturer: apiDevice.manufacturer,
    model: apiDevice.model,
    serial: apiDevice.serial,
    asset_tag: apiDevice.asset_tag,
    sku: apiDevice.sku,
    service_tag: apiDevice.service_tag ?? null,
    site: apiDevice.site,
    site_id: apiDevice.site_id,
    location: apiDevice.location,
    location_id: apiDevice.location_id,
    rack: apiDevice.rack,
    rack_id: apiDevice.rack_id,
    position: apiDevice.position,
    face: apiDevice.face,
    primary_ip: apiDevice.primary_ip,
    primary_ip6: apiDevice.primary_ip6,
    accelerators: apiDevice.accelerators,
    gpu_count: apiDevice.gpu_count || 0,
    u_height: apiDevice.u_height ?? null,
    is_full_depth: apiDevice.is_full_depth ?? null,
    interconnect_type: apiDevice.interconnect_type,
    cluster_id: apiDevice.cluster_id,
    tenant: apiDevice.tenant,
    tenant_id: apiDevice.tenant_id,
    tenant_slug: apiDevice.tenant_slug,
    connected_devices: apiDevice.connected_devices || [],
    bmc: transformBmc(apiDevice.bmc),
    interfaces: (apiDevice.interfaces || []).map(transformInterface),
    interface_count: apiDevice.interface_count,
    connection_count: apiDevice.connection_count,
    tags: apiDevice.tags || [],
    custom_fields: apiDevice.custom_fields || {},
    created: apiDevice.created,
    last_updated: apiDevice.last_updated,
  };
}

/** Transform API rack to frontend Rack type. */
function transformRack(apiRack: ApiRack): Rack {
  return {
    id: apiRack.id,
    name: apiRack.name,
    status: apiRack.status,
    role: apiRack.role,
    u_height: apiRack.u_height,
    serial: apiRack.serial,
    site_id: apiRack.site_id,
    location_id: apiRack.location_id,
    location_name: apiRack.location_name || undefined,
    location_path: apiRack.path && apiRack.path.length > 0 ? apiRack.path : undefined,
    tenant: apiRack.tenant,
    tenant_id: apiRack.tenant_id,
    tenant_slug: apiRack.tenant_slug,
    devices: (apiRack.devices || []).map(transformDevice),
    device_count: apiRack.device_count,
    total_u_used: apiRack.total_u_used,
    cabinet_index: apiRack.cabinet_index ?? null,
  };
}

/** Map one API location node, preserving nested children and racks. */
function transformLocation(apiLoc: ApiLocation, parentPath: string[] = []): Location {
  const locationPath =
    apiLoc.path && apiLoc.path.length > 0 ? apiLoc.path : [...parentPath, apiLoc.name];

  return {
    id: apiLoc.id,
    name: apiLoc.name,
    status: apiLoc.status,
    site_id: apiLoc.site_id,
    parent_id: apiLoc.parent_id,
    racks: (apiLoc.racks || []).map((rack) => ({
      ...transformRack(rack),
      location_name: rack.location_name || apiLoc.name,
      location_path: rack.path?.length ? rack.path : locationPath,
    })),
    devices: (apiLoc.devices || []).map(transformDevice),
    children: (apiLoc.children || []).map((child) => transformLocation(child, locationPath)),
    rack_count: apiLoc.rack_count,
    device_count: apiLoc.device_count,
    row_sort_key: apiLoc.row_sort_key ?? null,
  };
}

/** Recursively count GPUs from nested locations. */
function countGpusInLocations(locations: ApiLocation[]): number {
  let total = 0;
  function traverse(locs: ApiLocation[]) {
    for (const loc of locs) {
      for (const rack of loc.racks) {
        for (const device of rack.devices) {
          total += device.gpu_count || 0;
        }
      }
      for (const device of loc.devices) {
        total += device.gpu_count || 0;
      }
      if (loc.children && loc.children.length > 0) {
        traverse(loc.children);
      }
    }
  }
  traverse(locations);
  return total;
}

/** Recursively count racks from nested locations. */
function countRacksInLocations(locations: ApiLocation[]): number {
  let total = 0;
  function traverse(locs: ApiLocation[]) {
    for (const loc of locs) {
      total += loc.racks.length;
      if (loc.children && loc.children.length > 0) {
        traverse(loc.children);
      }
    }
  }
  traverse(locations);
  return total;
}

/** Recursively count devices from nested locations. */
function countDevicesInLocations(locations: ApiLocation[]): number {
  let total = 0;
  function traverse(locs: ApiLocation[]) {
    for (const loc of locs) {
      for (const rack of loc.racks) {
        total += rack.devices.length;
      }
      total += loc.devices.length;
      if (loc.children && loc.children.length > 0) {
        traverse(loc.children);
      }
    }
  }
  traverse(locations);
  return total;
}

/**
 * Transform API locations to frontend Location type (nested tree preserved).
 *
 * Exported so any future consumer of the raw `/devices/digital-twin` tree
 * can reuse the exact same ApiLocation -> Location conversion this file
 * already uses for `/digital-twin`'s globe, instead of writing (and risking
 * diverging from) a second copy.
 */
export function transformLocations(apiLocations: ApiLocation[]): Location[] {
  return (apiLocations || []).map((loc) => transformLocation(loc, []));
}

/** Extract all sites from nested regions. Exported for the same reason as `transformLocations` above. */
export function flattenRegionsToSites(regions: ApiRegion[]): ApiSite[] {
  const sites: ApiSite[] = [];
  function traverse(regionList: ApiRegion[]) {
    for (const region of regionList) {
      sites.push(...region.sites);
      if (region.children && region.children.length > 0) {
        traverse(region.children);
      }
    }
  }
  traverse(regions);
  return sites;
}

/** Transform the `/devices/digital-twin` API response to `GlobeSite[]` for frontend consumption. */
export function transformApiToGlobeSites(response: DigitalTwinApiResponse): GlobeSite[] {
  if (!response?.regions) {
    return [];
  }

  const allSites = flattenRegionsToSites(response.regions);

  // Filter sites with invalid coordinates: only when BOTH lat and lng are
  // exactly 0 (likely unset in NetBox), so real sites near (0,0) survive.
  const validSites = allSites.filter((site) => !(site.latitude === 0 && site.longitude === 0));

  return validSites.map((site) => {
    const rackCount = countRacksInLocations(site.locations);
    const deviceCount = countDevicesInLocations(site.locations);
    const gpuCount = countGpusInLocations(site.locations);
    const layoutWarnings = response.metadata?.layout_warnings ?? [];

    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      status: site.status,
      regionName: site.region_name,
      regionSlug: site.region_slug,
      latitude: site.latitude,
      longitude: site.longitude,
      address: site.physical_address || "Address unavailable",
      rackCount,
      deviceCount,
      gpuCount,
      locations: transformLocations(site.locations),
      layoutWarnings,
    };
  });
}
