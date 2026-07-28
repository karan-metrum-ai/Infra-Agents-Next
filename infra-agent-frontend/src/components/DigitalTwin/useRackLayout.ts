"use client";

/**
 * Pure layout math for one rack: device dedup/split (server vs CDU),
 * non-overlapping vertical placement, switch-pair spreading, and
 * hostname-label collision offsets.
 *
 * Extracted from `ServerRack` so the component itself stays focused on
 * composing `RackShell` / `RackDeviceSlot` / `RackCduBay` — this hook
 * has no rendering, selection, or callback concerns, just props (`rack`)
 * in, layout numbers out.
 */

import { useMemo } from "react";
import type { Device3D, Rack3D } from "./types";
import {
  computeDeviceLabelYOffsets,
  computeRackDeviceYPositions,
  getRackSlotCount,
  isCduDevice,
  isSwitchDevice,
} from "./rackUtils";

const RACK_TOP_Y = 0.88;
const RACK_BOTTOM_Y = -0.88;
const CDU_MIN_HEIGHT_U = 4;
const CDU_BAY_PADDING = 0.06;

export type RackHealthStatus = "ok" | "warning" | "critical";

export interface RackLayout {
  rackHealthStatus: RackHealthStatus;
  uSlots: number;
  slotSpacing: number;
  /** Non-CDU devices, deduped and sorted by U position. */
  rackDevices: Device3D[];
  /** CDU devices, deduped and sorted by U position. */
  cduDevices: Device3D[];
  hasCdu: boolean;
  cduBayHeight: number;
  /** World-Y the whole rack group is lifted by when a CDU bay is present. */
  rackLiftY: number;
  switchYOffsets: Map<string, number>;
  /** Center-Y per device_id, including the switch-pair nudge. */
  deviceWorldYs: Map<string, number>;
  /** Local Html label Y offset per device_id (collision avoidance). */
  deviceLabelYOffsets: Map<string, number>;
}

export function useRackLayout(rack: Rack3D): RackLayout {
  const rackHealthStatus = useMemo<RackHealthStatus>(() => {
    const hasCritical = rack.devices.some((d) => d.health_status === "critical");
    const hasWarning = rack.devices.some((d) => d.health_status === "warning");
    if (hasCritical) return "critical";
    if (hasWarning) return "warning";
    return "ok";
  }, [rack.devices]);

  const uSlots = useMemo(() => getRackSlotCount(rack), [rack]);
  const slotSpacing = useMemo(
    () => (uSlots > 1 ? (RACK_TOP_Y - RACK_BOTTOM_Y) / (uSlots - 1) : 0.088),
    [uSlots],
  );

  const { rackDevices, cduDevices } = useMemo(() => {
    const seen = new Set<string>();
    const deduped = [...rack.devices]
      .sort((a, b) => a.u_position - b.u_position)
      .filter((device) => {
        if (seen.has(device.device_id)) {
          return false;
        }
        seen.add(device.device_id);
        return true;
      });
    return {
      rackDevices: deduped.filter((d) => !isCduDevice(d)),
      cduDevices: deduped.filter((d) => isCduDevice(d)),
    };
  }, [rack.devices]);

  const hasCdu = cduDevices.length > 0;

  const cduBayHeight = useMemo(() => {
    if (!hasCdu) return 0;
    const totalCduH = cduDevices.reduce((sum, d) => {
      const hu = Math.max(CDU_MIN_HEIGHT_U, Math.floor(d.height_u || CDU_MIN_HEIGHT_U));
      return sum + hu * 0.044;
    }, 0);
    return totalCduH + CDU_BAY_PADDING;
  }, [hasCdu, cduDevices]);

  const rackLiftY = hasCdu ? cduBayHeight : 0;

  // Spread adjacent switches apart so 1U pairs (e.g. leaf1a/leaf1b) do not overlap.
  const switchYOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    const switches = rackDevices
      .filter((device) => isSwitchDevice(device))
      .sort((a, b) => a.u_position - b.u_position);

    const adjacentSwitchGap = 0.028;

    for (let i = 0; i < switches.length - 1; i++) {
      const upper = switches[i];
      const lower = switches[i + 1];
      const upperEndU = upper.u_position + Math.max(1, Math.floor(upper.height_u || 1)) - 1;

      if (lower.u_position > upperEndU + 1) {
        continue;
      }

      offsets.set(upper.device_id, (offsets.get(upper.device_id) ?? 0) + adjacentSwitchGap / 2);
      offsets.set(lower.device_id, (offsets.get(lower.device_id) ?? 0) - adjacentSwitchGap / 2);
    }

    return offsets;
  }, [rackDevices]);

  // World-space gap inserted between 1U/2U cards when the rack has room.
  // Scales with slot pitch so it stays a visible, guaranteed-no-overlap
  // separation whether the rack is at its 20-slot floor or a full 42U.
  // Applied greedily while preserving U order; skipped for 4U+ devices and
  // dropped entirely when the rack is full (see computeRackDeviceYPositions).
  const nonFullCardGap = slotSpacing * 0.45;

  const deviceYPositions = useMemo(
    () =>
      computeRackDeviceYPositions(rackDevices, {
        topY: RACK_TOP_Y,
        bottomY: RACK_BOTTOM_Y,
        slotSpacing,
        gap: nonFullCardGap,
      }),
    [rackDevices, slotSpacing, nonFullCardGap],
  );

  // World-space mesh centers (including switch nudge) for label collision.
  const deviceWorldYs = useMemo(() => {
    const ys = new Map<string, number>();
    for (const device of rackDevices) {
      const baseYPos =
        deviceYPositions.get(device.device_id) ??
        RACK_TOP_Y - Math.max(0, (device.u_position || 1) - 1) * slotSpacing;
      const switchYOffset = switchYOffsets.get(device.device_id) ?? 0;
      const isSwitch = isSwitchDevice(device);
      ys.set(device.device_id, baseYPos + (isSwitch ? switchYOffset : 0));
    }
    return ys;
  }, [rackDevices, deviceYPositions, switchYOffsets, slotSpacing]);

  const deviceLabelYOffsets = useMemo(
    () => computeDeviceLabelYOffsets(rackDevices, { deviceYs: deviceWorldYs }),
    [rackDevices, deviceWorldYs],
  );

  return {
    rackHealthStatus,
    uSlots,
    slotSpacing,
    rackDevices,
    cduDevices,
    hasCdu,
    cduBayHeight,
    rackLiftY,
    switchYOffsets,
    deviceWorldYs,
    deviceLabelYOffsets,
  };
}
