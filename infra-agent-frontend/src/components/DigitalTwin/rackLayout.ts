/**
 * Row-aware rack layout for digital twin 3D views.
 *
 * Uses explicit cabinet_index / row_sort_key from the API only. Missing
 * metadata is reported via warnings and racks are omitted — no name parsing
 * or sequential fallback placement.
 */

import type {
  OnboardingDevice,
  OnboardingDevicesResponse,
  OnboardingLocation,
  OnboardingRack,
  OnboardingRegion,
} from "./rackLayout.types";
import type { Device, Location, Rack, Rack3D } from "./types";
import { expandRackDevices, type DeviceTelemetryInfo } from "./rackUtils";

const DEFAULT_RACK_U_HEIGHT = 42;
const ROW_COLOR_EVEN = "#00aaff";
const ROW_COLOR_ODD = "#ff6600";

/** Racks grouped by a location leaf that holds at least one rack. */
export interface RowRackGroup {
  rowLabel: string;
  locationPath: string[];
  racks: Rack[];
  rowSortKey: number;
  treeOrder: number;
}

export interface LayoutRacksTo3DOptions {
  /** Y position for all racks (default -0.25). */
  rackY?: number;
  /** X position of the leftmost cabinet slot (default -4). */
  xStart?: number;
  /** Spacing between cabinet slots (default 2). */
  xSpacing?: number;
  /** Spacing between row aisles on the Z axis (default 4). */
  rowSpacing?: number;
  criticalDeviceSet?: Set<string> | null;
  warningDeviceSet?: Set<string> | null;
  telemetryMap?: Map<string, DeviceTelemetryInfo>;
  /** Placeholder racks appended after real racks (default 0). */
  extraEmptyRacks?: number;
}

export interface LayoutRacksResult {
  racks: Rack3D[];
  warnings: string[];
}

function requireCabinetIndex(rack: Rack): number | null {
  if (typeof rack.cabinet_index === "number" && rack.cabinet_index > 0) {
    return rack.cabinet_index;
  }
  return null;
}

function requireRowSortKey(location: Location): number | null {
  if (typeof location.row_sort_key === "number" && location.row_sort_key > 0) {
    return location.row_sort_key;
  }
  return null;
}

/**
 * Walk a location tree and emit one group per location that has racks.
 */
export function collectRowRackGroups(locations: Location[]): RowRackGroup[] {
  const groups: RowRackGroup[] = [];
  let treeOrder = 0;

  function walk(locs: Location[]) {
    for (const loc of locs) {
      const rowKey = requireRowSortKey(loc);
      const layoutRacks = loc.racks.filter((rack) => requireCabinetIndex(rack) !== null);
      if (layoutRacks.length > 0 && rowKey !== null) {
        groups.push({
          rowLabel: loc.name,
          locationPath: loc.racks[0]?.location_path?.length
            ? loc.racks[0].location_path!
            : [loc.name],
          racks: layoutRacks,
          rowSortKey: rowKey,
          treeOrder: treeOrder++,
        });
      }
      if (loc.children.length > 0) {
        walk(loc.children);
      }
    }
  }

  walk(locations);

  return groups.sort((a, b) => {
    if (a.rowSortKey !== b.rowSortKey) {
      return a.rowSortKey - b.rowSortKey;
    }
    return a.treeOrder - b.treeOrder;
  });
}

function sortRacksInGroup(racks: Rack[]): Rack[] {
  return [...racks].sort((a, b) => {
    const cabA = requireCabinetIndex(a);
    const cabB = requireCabinetIndex(b);
    if (cabA !== null && cabB !== null && cabA !== cabB) {
      return cabA - cabB;
    }
    return a.name.localeCompare(b.name);
  });
}

function rowBandColor(rowBandIndex: number): string {
  return rowBandIndex % 2 === 0 ? ROW_COLOR_EVEN : ROW_COLOR_ODD;
}

function rowBandZ(rowBandIndex: number, rowCount: number, spacing: number) {
  const centerOffset = (rowCount - 1) / 2;
  return (rowBandIndex - centerOffset) * spacing;
}

/**
 * Place grouped racks in 3D space with cabinet-index gaps and row aisles.
 */
export function layoutRacksTo3D(
  groups: RowRackGroup[],
  options: LayoutRacksTo3DOptions = {},
): LayoutRacksResult {
  const { rackY = -0.25, xStart = -4, xSpacing = 2, rowSpacing = 4, telemetryMap } = options;
  const criticalDeviceSet = options.criticalDeviceSet ?? null;
  const warningDeviceSet = options.warningDeviceSet ?? null;

  const sortedGroups = [...groups].sort((a, b) => {
    if (a.rowSortKey !== b.rowSortKey) {
      return a.rowSortKey - b.rowSortKey;
    }
    return a.treeOrder - b.treeOrder;
  });

  const result: Rack3D[] = [];
  const warnings: string[] = [];

  sortedGroups.forEach((group, rowBandIndex) => {
    const sortedRacks = sortRacksInGroup(group.racks);
    const cabinetIndices = sortedRacks
      .map((rack) => requireCabinetIndex(rack))
      .filter((idx): idx is number => idx !== null);
    if (cabinetIndices.length === 0) {
      return;
    }
    const minCabinet = Math.min(...cabinetIndices);

    const zPos = rowBandZ(rowBandIndex, sortedGroups.length, rowSpacing);
    const facesForward = rowBandIndex % 2 === 0;
    const rotation: [number, number, number] | undefined = facesForward
      ? undefined
      : [0, Math.PI, 0];

    sortedRacks.forEach((rack) => {
      const cabIndex = requireCabinetIndex(rack);
      if (cabIndex === null) {
        warnings.push(`rack '${rack.name}' missing cabinet_index — skipped`);
        return;
      }

      const xPos = xStart + (cabIndex - minCabinet) * xSpacing;
      const devices = expandRackDevices(rack, criticalDeviceSet, telemetryMap, warningDeviceSet);

      result.push({
        rack_id: rack.name,
        rack_name: rack.name,
        rack_color: rowBandColor(rowBandIndex),
        row_name: group.rowLabel,
        devices,
        u_height: rack.u_height || DEFAULT_RACK_U_HEIGHT,
        position: [xPos, rackY, zPos],
        rotation,
      });
    });
  });

  return { racks: result, warnings };
}

/**
 * Convenience: collect row groups from a location tree and lay out racks.
 */
export function layoutLocationsToRack3D(
  locations: Location[],
  options: LayoutRacksTo3DOptions = {},
): LayoutRacksResult {
  const groups = collectRowRackGroups(locations);
  const warnings: string[] = [];

  function collectMissing(locList: Location[]) {
    for (const loc of locList) {
      if (loc.racks.length > 0 && requireRowSortKey(loc) === null) {
        warnings.push(`location '${loc.name}' has racks but missing row_sort_key`);
      }
      for (const rack of loc.racks) {
        if (requireCabinetIndex(rack) === null) {
          warnings.push(`rack '${rack.name}' missing cabinet_index`);
        }
      }
      collectMissing(loc.children);
    }
  }
  collectMissing(locations);

  if (groups.length === 0) {
    return { racks: [], warnings };
  }
  const laidOut = layoutRacksTo3D(groups, options);
  return {
    racks: laidOut.racks,
    warnings: [...warnings, ...laidOut.warnings],
  };
}

/**
 * Merge local layout warnings with API-reported warnings (deduped).
 */
export function mergeLayoutWarnings(local: string[], api: string[] | undefined | null): string[] {
  if (!api?.length) {
    return local;
  }
  return [...new Set([...local, ...api])];
}

/**
 * Group laid-out racks by Z aisle band (from metadata-driven positions).
 */
export function groupRacksByRowBand(racks: Rack3D[]): Rack3D[][] {
  if (racks.length === 0) {
    return [];
  }

  const buckets = new Map<number, Rack3D[]>();
  for (const rack of racks) {
    const zKey = Math.round(rack.position[2] * 100) / 100;
    const list = buckets.get(zKey) ?? [];
    list.push(rack);
    buckets.set(zKey, list);
  }

  return [...buckets.entries()]
    .sort(([zA], [zB]) => zA - zB)
    .map(([, rowRacks]) => [...rowRacks].sort((a, b) => a.position[0] - b.position[0]));
}

function emptyBmc(): Device["bmc"] {
  return {
    ip_address: "",
    type: "",
    username: "",
    port: 0,
    vault_secret_path: "",
    reachable: null,
  };
}

function onboardingDeviceToDevice(device: OnboardingDevice): Device {
  return {
    id: device.id,
    name: device.name,
    status: device.status,
    role: device.role,
    device_type: device.device_type,
    manufacturer: device.manufacturer,
    model: device.model,
    serial: device.serial || "",
    asset_tag: device.asset_tag || "",
    sku: device.sku,
    service_tag: device.service_tag,
    site: device.site,
    site_id: device.site_id,
    location: device.location || "",
    location_id: device.location_id || 0,
    rack: device.rack || "",
    rack_id: device.rack_id || 0,
    position: device.position || 0,
    face: device.face,
    primary_ip: device.primary_ip,
    primary_ip6: device.primary_ip6,
    accelerators: device.accelerators || "",
    gpu_count: device.gpu_count,
    u_height: device.u_height,
    is_full_depth: device.is_full_depth,
    interconnect_type: device.interconnect_type,
    cluster_id: device.cluster_id || "",
    tenant: device.tenant || "",
    tenant_id: device.tenant_id || 0,
    tenant_slug: device.tenant_slug || "",
    connected_devices: device.connected_devices,
    bmc: device.bmc
      ? {
          ip_address: device.bmc.ip_address || "",
          type: device.bmc.type || "",
          username: device.bmc.username || "",
          port: device.bmc.port || 0,
          vault_secret_path: device.bmc.vault_secret_path || "",
          reachable: device.bmc.reachable,
        }
      : emptyBmc(),
    interfaces: device.interfaces.map((iface) => ({
      id: iface.id,
      name: iface.name,
      type: iface.type,
      mac_address: iface.mac_address ?? undefined,
      enabled: iface.enabled,
    })),
    interface_count: device.interface_count,
    connection_count: device.connection_count,
    tags: device.tags,
    custom_fields: device.custom_fields,
    created: device.created,
    last_updated: device.last_updated,
  };
}

function onboardingRackToRack(
  rack: OnboardingRack,
  locationName: string,
  locationPath: string[],
): Rack {
  return {
    id: typeof rack.id === "number" ? rack.id : -1,
    name: rack.name,
    status: rack.status,
    role: rack.role || "",
    u_height: rack.u_height,
    serial: rack.serial || "",
    site_id: rack.site_id,
    location_id: rack.location_id || 0,
    location_name: locationName,
    location_path: locationPath,
    tenant: rack.tenant,
    tenant_id: rack.tenant_id,
    tenant_slug: rack.tenant_slug,
    devices: (rack.devices || []).map(onboardingDeviceToDevice),
    device_count: rack.device_count || rack.devices?.length || 0,
    total_u_used: rack.total_u_used || 0,
    cabinet_index: rack.cabinet_index ?? null,
  };
}

function mapOnboardingLocation(location: OnboardingLocation, parentPath: string[]): Location {
  const locationPath = [...parentPath, location.name];
  return {
    id: location.id,
    name: location.name,
    status: location.status,
    site_id: location.site_id,
    parent_id: location.parent_id,
    racks: [
      ...(location.racks || []).map((rack) =>
        onboardingRackToRack(rack, location.name, locationPath),
      ),
      ...(location.devices?.length
        ? [
            onboardingRackToRack(
              {
                id: `loc-${location.id}-unracked` as unknown as number,
                name: `${location.name}-Unracked`,
                status: "active",
                role: null,
                u_height: 20,
                serial: null,
                site_id: location.site_id,
                location_id: location.id,
                tenant: null,
                tenant_id: null,
                tenant_slug: null,
                devices: location.devices,
              },
              location.name,
              locationPath,
            ),
          ]
        : []),
    ],
    devices: [],
    children: (location.children || []).map((child) => mapOnboardingLocation(child, locationPath)),
    rack_count: location.rack_count || 0,
    device_count: location.device_count || 0,
    row_sort_key: location.row_sort_key ?? null,
  };
}

/**
 * Build a digital-twin Location tree from onboarding API regions.
 */
export function onboardingResponseToLocations(data: OnboardingDevicesResponse): Location[] {
  const locations: Location[] = [];

  function traverseRegions(regions: OnboardingRegion[], parentPath: string[]) {
    for (const region of regions) {
      const regionPath = [...parentPath, region.name];
      for (const site of region.sites || []) {
        const sitePath = [...regionPath, site.name];
        for (const loc of site.locations || []) {
          locations.push(mapOnboardingLocation(loc, sitePath));
        }
        if (site.racks?.length) {
          locations.push({
            id: -site.id,
            name: site.name,
            status: site.status,
            site_id: site.id,
            parent_id: null,
            racks: site.racks.map((rack) => onboardingRackToRack(rack, site.name, sitePath)),
            devices: [],
            children: [],
            rack_count: site.racks.length,
            device_count: site.device_count || 0,
          });
        }
        if (site.devices?.length) {
          locations.push({
            id: -site.id - 1,
            name: `${site.name}-Unracked`,
            status: site.status,
            site_id: site.id,
            parent_id: null,
            racks: [
              onboardingRackToRack(
                {
                  id: `site-${site.id}-unracked` as unknown as number,
                  name: `${site.name}-Unracked`,
                  status: "active",
                  role: null,
                  u_height: 20,
                  serial: null,
                  site_id: site.id,
                  location_id: null,
                  tenant: null,
                  tenant_id: null,
                  tenant_slug: null,
                  devices: site.devices,
                },
                site.name,
                sitePath,
              ),
            ],
            devices: [],
            children: [],
            rack_count: 1,
            device_count: site.devices.length,
          });
        }
      }
      if (region.children?.length) {
        traverseRegions(region.children, regionPath);
      }
    }
  }

  traverseRegions(data.regions || [], []);
  return locations;
}
