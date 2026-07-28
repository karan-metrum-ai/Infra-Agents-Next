"use client";

/**
 * Shared click/hover-cursor handler builders for rack sub-components
 * (`RackShell`, `RackDeviceSlot`, `RackCduBay`). Extracted from
 * `ServerRack` so the same stop-propagation + selection-toggle logic
 * isn't re-typed at every call site.
 */

import type { Device3D } from "./types";

type PointerLikeEvent = { stopPropagation: () => void };

/** Shared onPointerOver/Out pair that flips the document cursor to a pointer. */
export const rackPointerCursorHandlers = {
  onPointerOver: () => {
    document.body.style.cursor = "pointer";
  },
  onPointerOut: () => {
    document.body.style.cursor = "default";
  },
};

/**
 * Builds a click handler for a rack device (server/switch/CDU slot):
 * stops propagation, flips selection, then notifies the host.
 */
export function createDeviceClickHandler(
  device: Device3D,
  isSelected: boolean,
  onToggleSelection: ((deviceId: string, isSelected: boolean) => void) | undefined,
  onDeviceClick: ((device: Device3D) => void) | undefined,
) {
  return (e: PointerLikeEvent) => {
    e.stopPropagation();
    onToggleSelection?.(device.device_id, !isSelected);
    onDeviceClick?.(device);
  };
}

/** Builds a click handler for the rack-level highlight/click volume. */
export function createRackClickHandler(
  rackId: string,
  onRackClick: ((rackId: string) => void) | undefined,
) {
  return (e: PointerLikeEvent) => {
    e.stopPropagation();
    onRackClick?.(rackId);
  };
}
