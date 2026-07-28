/**
 * Rack Utility Functions
 *
 * Shared helpers for converting API data into the Rack3D / Device3D
 * format consumed by the Three.js scene.  Previously duplicated between
 * DataCenterDigitalTwin and SiteRoomView — now a single source of truth.
 */

import type { Device, Rack, Location, GlobeSite, Rack3D, Device3D } from "./types";
import type { DeviceTelemetryProbes } from "@/schemas/telemetryProbe.schema";

const SWITCH_MODEL_PATTERN = /s5448|z9432|n3248|s5232|s5248|n3224|n3248|mellanox|sonic/i;
const CDU_PATTERN = /cdu|coolant.distribution|liebert.*cdu|pcw.*cdu/i;

/** Telemetry metadata keyed by device hostname. */
export interface DeviceTelemetryInfo {
  last_telemetry_timestamp: string | null;
  data_freshness: string | null;
  telemetry_probes?: DeviceTelemetryProbes | null;
}

/**
 * Build a hostname-keyed telemetry map from bulk live device rows.
 */
export function buildDeviceTelemetryMap(
  devices: ReadonlyArray<{
    hostname: string;
    last_telemetry_timestamp: string | null;
    data_freshness: string | null;
    telemetry_probes?: DeviceTelemetryProbes | null;
  }>,
): Map<string, DeviceTelemetryInfo> {
  const map = new Map<string, DeviceTelemetryInfo>();
  for (const dev of devices) {
    const entry: DeviceTelemetryInfo = {
      last_telemetry_timestamp: dev.last_telemetry_timestamp,
      data_freshness: dev.data_freshness,
      telemetry_probes: dev.telemetry_probes ?? null,
    };
    map.set(dev.hostname, entry);
    map.set(dev.hostname.toLowerCase(), entry);
  }
  return map;
}

/**
 * Resolve cluster id from explicit prop or site inventory.
 */
export function resolveTelemetryClusterId(
  clusterId: string | null | undefined,
  site?: GlobeSite | null,
): string | null {
  if (clusterId) {
    return clusterId;
  }
  if (!site) {
    return null;
  }
  return extractClusterIdFromSite(site);
}

function extractClusterIdFromSite(site: GlobeSite): string | null {
  for (const location of site.locations) {
    const clusterId = extractClusterIdFromLocation(location);
    if (clusterId) {
      return clusterId;
    }
  }
  return null;
}

function extractClusterIdFromLocation(location: Location): string | null {
  for (const device of location.devices) {
    if (device.cluster_id) {
      return device.cluster_id;
    }
  }
  for (const rack of location.racks) {
    for (const device of rack.devices) {
      if (device.cluster_id) {
        return device.cluster_id;
      }
    }
  }
  for (const child of location.children) {
    const clusterId = extractClusterIdFromLocation(child);
    if (clusterId) {
      return clusterId;
    }
  }
  return null;
}

function lookupDeviceTelemetry(
  telemetryMap: Map<string, DeviceTelemetryInfo> | undefined,
  deviceName: string,
): DeviceTelemetryInfo | undefined {
  if (!telemetryMap) {
    return undefined;
  }
  return telemetryMap.get(deviceName) ?? telemetryMap.get(deviceName.toLowerCase());
}

/** True when BMC or OS telemetry is missing on a rack device. */
export function hasUnavailableTelemetryStream(device: Device3D): boolean {
  const probes = device.telemetry_probes;
  if (probes) {
    return probes.bmc.status === "missing" || probes.os.status === "missing";
  }
  if (device.data_freshness) {
    return device.data_freshness !== "real-time";
  }
  return false;
}

/**
 * Detect whether a raw API device record represents a CDU.
 */
function detectCduDevice(device: Device): boolean {
  const roleLower = (device.role || "").toLowerCase();
  const typeLower = (device.device_type || "").toLowerCase();
  const nameLower = (device.name || "").toLowerCase();
  const tagsLower = (device.tags || []).map((t) => t.toLowerCase());

  return (
    roleLower === "cdu" ||
    roleLower.includes("coolant distribution") ||
    CDU_PATTERN.test(typeLower) ||
    CDU_PATTERN.test(nameLower) ||
    tagsLower.some((tag) => tag === "cooling-infrastructure" || tag.includes("cdu"))
  );
}

/**
 * Detect whether a scene device should render as a CDU.
 */
export function isCduDevice(device: Device3D): boolean {
  if (device.device_type === "cdu") {
    return true;
  }

  const hostLower = (device.hostname || "").toLowerCase();
  const modelLower = (device.model || "").toLowerCase();
  const tagsLower = (device.tags || []).map((t) => t.toLowerCase());

  return (
    CDU_PATTERN.test(hostLower) ||
    CDU_PATTERN.test(modelLower) ||
    tagsLower.some((tag) => tag === "cooling-infrastructure" || tag.includes("cdu"))
  );
}

/**
 * Detect whether a raw API device record represents a network switch.
 */
function detectSwitchDevice(device: Device): boolean {
  const roleLower = (device.role || "").toLowerCase();
  const typeLower = (device.device_type || "").toLowerCase();
  const modelLower = (device.model || "").toLowerCase();
  const manufacturerLower = (device.manufacturer || "").toLowerCase();
  const bmcTypeLower = (device.bmc?.type || "").toLowerCase();
  const tagsLower = (device.tags || []).map((tag) => tag.toLowerCase());

  return (
    roleLower.includes("network-switch") ||
    roleLower.includes("switch") ||
    typeLower.includes("switch") ||
    bmcTypeLower.includes("sonic") ||
    tagsLower.some(
      (tag) => tag === "sonic" || tag.includes("switch") || tag.includes("network-switch"),
    ) ||
    SWITCH_MODEL_PATTERN.test(modelLower) ||
    SWITCH_MODEL_PATTERN.test(typeLower) ||
    (manufacturerLower.includes("dell") &&
      (modelLower.includes("5448") || modelLower.includes("9432") || modelLower.includes("3248")))
  );
}

/**
 * Detect whether a scene device should render as a network switch.
 */
export function isSwitchDevice(device: Device3D): boolean {
  if (device.device_type === "switch") {
    return true;
  }

  const roleLower = (device.model || "").toLowerCase();
  const tagsLower = (device.tags || []).map((tag) => tag.toLowerCase());

  return (
    tagsLower.some(
      (tag) => tag === "sonic" || tag.includes("switch") || tag.includes("network-switch"),
    ) || SWITCH_MODEL_PATTERN.test(roleLower)
  );
}

/**
 * Compute the number of rack U slots required to show all devices.
 */
export function getRackSlotCount(rack: Pick<Rack3D, "devices" | "u_height">): number {
  const maxDeviceU = rack.devices.reduce((max, device) => {
    const topIndex = Math.max(0, (device.u_position || 1) - 1);
    const heightU = Math.max(1, Math.floor(device.height_u || 1));
    return Math.max(max, topIndex + heightU);
  }, 0);

  return Math.max(rack.u_height || 0, maxDeviceU, 20);
}

// ─── Vertical device placement ──────────────────────────────────────────────

/** Options controlling non-overlapping vertical device placement. */
export interface DeviceYLayoutOptions {
  /** World-Y of the top rack rail. */
  topY: number;
  /** World-Y of the bottom rack rail. */
  bottomY: number;
  /** World-space distance between adjacent U slots. */
  slotSpacing: number;
  /** Extra world-space gap inserted between 1U/2U cards (0 disables). */
  gap: number;
}

/** Devices this tall or taller never receive an added gap. */
const NO_GAP_HEIGHT_U = 4;

/**
 * Card mesh height factor for compact (1U/2U) devices — trimmed down from
 * the default so the added gap reads as real separation, not just less
 * overlap.
 */
export const CARD_MESH_FACTOR_COMPACT = 0.8;
/** Card mesh height factor for 3U+ devices. */
export const CARD_MESH_FACTOR_DEFAULT = 0.94;
/** Devices this short or shorter use the compact mesh factor. */
const COMPACT_HEIGHT_U = 2;

/** Fraction of a slot a device's card mesh should fill. */
export function getCardMeshFactor(heightU: number): number {
  return heightU <= COMPACT_HEIGHT_U ? CARD_MESH_FACTOR_COMPACT : CARD_MESH_FACTOR_DEFAULT;
}

function deviceHeightU(device: Device3D): number {
  return Math.max(1, Math.floor(device.height_u || 1));
}

/** World-space half-height of a device's rendered card. */
function deviceHalfHeight(device: Device3D, slotSpacing: number): number {
  const heightU = deviceHeightU(device);
  return (slotSpacing * heightU * getCardMeshFactor(heightU)) / 2;
}

/** Center-Y of a device at its natural U position (pre-gap). */
function naturalDeviceY(device: Device3D, topY: number, slotSpacing: number): number {
  const topSlotIndex = Math.max(0, (device.u_position || 1) - 1);
  const heightU = deviceHeightU(device);
  const baseY = topY - topSlotIndex * slotSpacing;
  let centerOffset = ((heightU - 1) * slotSpacing) / 2;

  if (device.sub_slot_index != null && device.drives_in_host && device.drives_in_host > 1) {
    const hostSpan = Math.max(2, Math.floor(device.drives_in_host)) * slotSpacing;
    const slotHeight = hostSpan / device.drives_in_host;
    centerOffset = hostSpan / 2 - (device.sub_slot_index + 0.5) * slotHeight;
  }

  return baseY - centerOffset;
}

/**
 * Compute non-overlapping center-Y positions for rack devices.
 *
 * Devices keep their true U order and start from their natural U position;
 * each device is pushed DOWN only as far as needed to keep a minimum gap
 * from the device above. 4U (and taller) devices never receive an added
 * gap. When the accumulated gaps would push the bottom-most card below the
 * rack floor (a full / packed rack), the pass is retried with no gap so
 * 1U/2U cards are allowed to sit tight (overlay).
 *
 * @returns Map of device_id → center-Y in world space.
 */
export function computeRackDeviceYPositions(
  devices: Device3D[],
  opts: DeviceYLayoutOptions,
): Map<string, number> {
  const ordered = [...devices].sort((a, b) => (a.u_position || 0) - (b.u_position || 0));

  const layout = (gap: number): Map<string, number> => {
    const result = new Map<string, number>();
    let prev: Device3D | null = null;
    let prevY = 0;
    for (const device of ordered) {
      const naturalY = naturalDeviceY(device, opts.topY, opts.slotSpacing);
      // Embedded drives are pinned to their host sub-slot, never shifted.
      if (device.sub_slot_index != null) {
        result.set(device.device_id, naturalY);
        continue;
      }
      let y = naturalY;
      if (prev) {
        const gapFor =
          deviceHeightU(prev) >= NO_GAP_HEIGHT_U || deviceHeightU(device) >= NO_GAP_HEIGHT_U
            ? 0
            : gap;
        const minCenterDist =
          deviceHalfHeight(prev, opts.slotSpacing) +
          deviceHalfHeight(device, opts.slotSpacing) +
          gapFor;
        y = Math.min(naturalY, prevY - minCenterDist);
      }
      result.set(device.device_id, y);
      prev = device;
      prevY = y;
    }
    return result;
  };

  if (opts.gap <= 0) {
    return layout(0);
  }

  const spaced = layout(opts.gap);
  let minBottom = Number.POSITIVE_INFINITY;
  for (const device of ordered) {
    if (device.sub_slot_index != null) continue;
    const y = spaced.get(device.device_id);
    if (y == null) continue;
    const bottom = y - deviceHalfHeight(device, opts.slotSpacing);
    minBottom = Math.min(minBottom, bottom);
  }
  // Gaps overflow the rack floor → full/packed → revert to tight packing.
  if (minBottom < opts.bottomY) {
    return layout(0);
  }
  return spaced;
}

/**
 * Default world-space half-height for a single-line hostname Html badge.
 * Independent of device height_u so 1U/2U/4U cards share one visual size.
 */
export const DEVICE_LABEL_HALF_HEIGHT = 0.028;

/** Default world-space gap kept between adjacent hostname badge edges. */
export const DEVICE_LABEL_MIN_GAP = 0.055;

/** Options for non-overlapping hostname label placement. */
export interface DeviceLabelYOffsetOptions {
  /**
   * Mesh center-Y per device_id (world space). Missing entries are
   * skipped.
   */
  deviceYs: Map<string, number>;
  /** World-space half-height of each hostname badge. */
  labelHalfHeight?: number;
  /** World-space gap between adjacent badge edges. */
  minGap?: number;
}

/**
 * Compute local Html Y offsets so hostname badges do not overlap.
 *
 * Meshes stay at their existing center-Y. When consecutive badges (top to
 * bottom) would collide in world space, the lower badge receives a
 * negative local offset large enough to clear the one above.
 *
 * Label half-height is fixed and does not depend on height_u.
 *
 * @returns Map of device_id → local Y offset (0 when no nudge needed).
 */
export function computeDeviceLabelYOffsets(
  devices: Device3D[],
  opts: DeviceLabelYOffsetOptions,
): Map<string, number> {
  const half = opts.labelHalfHeight ?? DEVICE_LABEL_HALF_HEIGHT;
  const minGap = opts.minGap ?? DEVICE_LABEL_MIN_GAP;
  const minCenterDist = 2 * half + minGap;

  const ordered = [...devices]
    .filter((d) => opts.deviceYs.has(d.device_id))
    .sort((a, b) => {
      const yA = opts.deviceYs.get(a.device_id)!;
      const yB = opts.deviceYs.get(b.device_id)!;
      // Higher Y first (top of rack). Tie-break by U position.
      if (yA !== yB) {
        return yB - yA;
      }
      return (a.u_position || 0) - (b.u_position || 0);
    });

  const offsets = new Map<string, number>();
  let prevWorldY: number | null = null;

  for (const device of ordered) {
    const meshY = opts.deviceYs.get(device.device_id)!;
    let offset = 0;
    if (prevWorldY != null) {
      const naturalWorldY = meshY;
      const maxAllowedY = prevWorldY - minCenterDist;
      if (naturalWorldY > maxAllowedY) {
        offset = maxAllowedY - meshY;
      }
    }
    offsets.set(device.device_id, offset);
    prevWorldY = meshY + offset;
  }

  return offsets;
}

// ─── SSD drive parsing ────────────────────────────────────────────────────────

interface ParsedSsdDrive {
  controller: string;
  serial: string;
  asset_tag: string;
  name: string;
}

function parseSsdDrives(raw: unknown): ParsedSsdDrive[] {
  if (!raw || typeof raw !== "string") {
    return [];
  }
  const text = raw.trim();
  if (!text) {
    return [];
  }
  return text
    .split(";")
    .map((entry) => {
      const parts = entry.split("|");
      const controller = (parts[0] || "").trim();
      const serial = (parts[1] || "").trim();
      const assetTag = (parts[2] || "").trim();
      const name = (parts[3] || controller).trim();
      return {
        controller,
        serial,
        asset_tag: assetTag,
        name,
      };
    })
    .filter((drive) => drive.controller);
}

function isStorageHost(device: Device): boolean {
  const role = (device.role || "").toLowerCase();
  return role.includes("storage host") || role.includes("ssd-host");
}

// ─── Device conversion ────────────────────────────────────────────────────────

/**
 * Convert an API Device record into the flat Device3D format used by the scene.
 *
 * @param device - Raw API device
 * @param index - Position index (used for fallback IP / placement)
 * @param criticalDeviceSet - Devices with critical events from the backend
 * @param warningDeviceSet - Devices with warning events from the backend
 * @param telemetryMap - Optional live telemetry keyed by hostname
 */
export function convertToDevice3D(
  device: Device,
  index: number,
  criticalDeviceSet?: Set<string> | null,
  telemetryMap?: Map<string, DeviceTelemetryInfo>,
  warningDeviceSet?: Set<string> | null,
): Device3D {
  const isCritical = !!(criticalDeviceSet && criticalDeviceSet.has(device.name));
  const isWarning = !!(warningDeviceSet && warningDeviceSet.has(device.name));
  const healthStatus: "ok" | "warning" | "critical" = isCritical
    ? "critical"
    : isWarning
      ? "warning"
      : "ok";
  const deviceStatus: "online" | "offline" | "degraded" =
    device.status !== "active" ? "offline" : isCritical || isWarning ? "degraded" : "online";

  const isCdu = detectCduDevice(device);
  const isSwitch = !isCdu && detectSwitchDevice(device);

  let deviceType: string;
  if (isCdu) {
    deviceType = "cdu";
  } else if (isSwitch) {
    deviceType = "switch";
  } else if (device.accelerators === "GPU") {
    deviceType = "server";
  } else {
    deviceType = "storage";
  }

  const heuristicHeightU = isCdu
    ? 2
    : isSwitch
      ? 1
      : device.accelerators === "GPU"
        ? device.gpu_count > 4
          ? 4
          : device.gpu_count > 0
            ? 2
            : 1
        : 1;
  const heightU =
    typeof device.u_height === "number" && device.u_height > 0
      ? Math.max(1, Math.floor(device.u_height))
      : heuristicHeightU;
  const isFullDepth = typeof device.is_full_depth === "boolean" ? device.is_full_depth : !isSwitch;

  const telemetry = lookupDeviceTelemetry(telemetryMap, device.name);

  return {
    device_id: String(device.id),
    hostname: device.name,
    ip_address:
      device.bmc?.ip_address || device.primary_ip?.split("/")[0] || `192.168.1.${100 + index}`,
    device_type: deviceType,
    status: deviceStatus,
    temperature: 35 + (index % 10),
    power_consumption: 200 + index * 20,
    rack_position: `U${device.position || index + 1}`,
    u_position: device.position || index + 1,
    height_u: heightU,
    is_full_depth: isFullDepth,
    health_status: healthStatus,
    manufacturer: device.manufacturer,
    model: device.model,
    gpu_count: device.gpu_count,
    accelerators: device.accelerators,
    tenant: device.tenant,
    cluster_id: device.cluster_id,
    tags: device.tags,
    serial: device.serial,
    asset_tag: device.asset_tag,
    service_tag: device.service_tag ?? undefined,
    last_telemetry_timestamp: telemetry?.last_telemetry_timestamp ?? null,
    data_freshness: (telemetry?.data_freshness as Device3D["data_freshness"]) ?? undefined,
    telemetry_probes: telemetry?.telemetry_probes ?? undefined,
  };
}

export function expandRackDevices(
  rack: Rack,
  criticalDeviceSet?: Set<string> | null,
  telemetryMap?: Map<string, DeviceTelemetryInfo>,
  warningDeviceSet?: Set<string> | null,
): Device3D[] {
  const devices: Device3D[] = [];
  rack.devices.forEach((device, index) => {
    const drives = parseSsdDrives(device.custom_fields?.ssd_drives);
    if (isStorageHost(device) && drives.length > 0) {
      // Show the storage host as a single device instead of expanding
      // individual NVMe drives. Drive details are shown in the detail
      // panel when the host is clicked.
      const hostDevice = convertToDevice3D(
        device,
        index,
        criticalDeviceSet,
        telemetryMap,
        warningDeviceSet,
      );
      hostDevice.ssd_drives = drives;
      // Ensure storage hosts have a visible height in the rack.
      hostDevice.height_u = Math.max(2, hostDevice.height_u || 2);
      devices.push(hostDevice);
      return;
    }
    devices.push(
      convertToDevice3D(device, index, criticalDeviceSet, telemetryMap, warningDeviceSet),
    );
  });
  return devices;
}

// ─── Location / Site helpers ──────────────────────────────────────────────────

/**
 * Recursively extract all racks from a site's location tree.
 */
export function getRacksFromSite(site: GlobeSite): Rack[] {
  const racks: Rack[] = [];

  function extractRacks(locations: Location[]) {
    for (const location of locations) {
      racks.push(...location.racks);
      extractRacks(location.children);
    }
  }

  extractRacks(site.locations);
  return racks;
}

// ─── Rack targeting ───────────────────────────────────────────────────────────

/**
 * Find the rack that contains the affected device.
 * Falls back to the first rack in the array.
 *
 * @param racks - All racks in the current floor / site
 * @param affectedDevice - Hostname of the device being worked on
 */
export function findTargetRack(racks: Rack3D[], affectedDevice?: string | null): Rack3D | null {
  if (!racks.length) return null;
  if (!affectedDevice) return racks[0];

  const hit = racks.find((r) => r.devices.some((d) => d.hostname === affectedDevice));
  if (!hit) {
    console.warn(
      `[GhostTechnician] Device "${affectedDevice}" not found in any rack.` +
        ` Falling back to first rack "${racks[0].rack_id}".`,
    );
  }
  return hit ?? racks[0];
}
