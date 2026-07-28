/**
 * Unit tests for smart, non-overlapping vertical device placement.
 */

import { describe, expect, it } from "vitest";
import type { Device3D } from "./types";
import {
  computeDeviceLabelYOffsets,
  computeRackDeviceYPositions,
  DEVICE_LABEL_HALF_HEIGHT,
  DEVICE_LABEL_MIN_GAP,
  getCardMeshFactor,
} from "./rackUtils";

const TOP_Y = 0.88;
const BOTTOM_Y = -0.88;
const GAP = 0.02;

/** Vertical pitch used by the scene: fit `uSlots` between the rails. */
function slotSpacingFor(uSlots: number): number {
  return uSlots > 1 ? (TOP_Y - BOTTOM_Y) / (uSlots - 1) : 0.088;
}

function makeDevice(uPosition: number, heightU: number): Device3D {
  return {
    device_id: `dev-${uPosition}`,
    hostname: `host-${uPosition}`,
    ip_address: "10.0.0.1",
    device_type: "server",
    status: "online",
    rack_position: `U${uPosition}`,
    u_position: uPosition,
    height_u: heightU,
  };
}

function halfHeight(heightU: number, slotSpacing: number): number {
  return (slotSpacing * heightU * getCardMeshFactor(heightU)) / 2;
}

describe("computeRackDeviceYPositions", () => {
  it("adds a gap between 1U cards and preserves U order when the rack has room", () => {
    const slotSpacing = slotSpacingFor(42);
    const devices = [1, 2, 3, 4, 5].map((u) => makeDevice(u, 1));

    const positions = computeRackDeviceYPositions(devices, {
      topY: TOP_Y,
      bottomY: BOTTOM_Y,
      slotSpacing,
      gap: GAP,
    });

    const ys = devices.map((d) => positions.get(d.device_id)!);
    // U order preserved: lower U (higher in rack) has greater Y.
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeLessThan(ys[i - 1]);
    }
    // Every consecutive pair is separated by at least GAP between card edges.
    for (let i = 1; i < ys.length; i++) {
      const edgeGap = ys[i - 1] - halfHeight(1, slotSpacing) - (ys[i] + halfHeight(1, slotSpacing));
      expect(edgeGap).toBeGreaterThanOrEqual(GAP - 1e-6);
    }
  });

  it("falls back to tight packing (no gap) when the rack is full", () => {
    const slotSpacing = slotSpacingFor(42);
    const devices = Array.from({ length: 42 }, (_, i) => makeDevice(i + 1, 1));

    const spaced = computeRackDeviceYPositions(devices, {
      topY: TOP_Y,
      bottomY: BOTTOM_Y,
      slotSpacing,
      gap: GAP,
    });
    const tight = computeRackDeviceYPositions(devices, {
      topY: TOP_Y,
      bottomY: BOTTOM_Y,
      slotSpacing,
      gap: 0,
    });

    // A full rack has no room for gaps → identical to the gap=0 layout.
    for (const d of devices) {
      expect(spaced.get(d.device_id)).toBeCloseTo(tight.get(d.device_id)!, 6);
    }
  });

  it("adds no gap around a 4U device", () => {
    const slotSpacing = slotSpacingFor(42);
    // 1U, 4U, 1U — the pairs touching the 4U must not gain a gap.
    const devices = [makeDevice(1, 1), makeDevice(2, 4), makeDevice(6, 1)];

    const positions = computeRackDeviceYPositions(devices, {
      topY: TOP_Y,
      bottomY: BOTTOM_Y,
      slotSpacing,
      gap: GAP,
    });

    const [a, b, c] = devices.map((d) => positions.get(d.device_id)!);
    const edgeAB = a - halfHeight(1, slotSpacing) - (b + halfHeight(4, slotSpacing));
    const edgeBC = b - halfHeight(4, slotSpacing) - (c + halfHeight(1, slotSpacing));
    // Neither edge is forced open by GAP (natural spacing already exceeds the
    // touching minimum, so no push occurs).
    expect(edgeAB).toBeLessThan(GAP);
    expect(edgeBC).toBeLessThan(GAP);
  });

  it("keeps 1U cards from overlapping only via the gap, never crossing order", () => {
    const slotSpacing = slotSpacingFor(42);
    const devices = [makeDevice(1, 1), makeDevice(2, 1)];

    const positions = computeRackDeviceYPositions(devices, {
      topY: TOP_Y,
      bottomY: BOTTOM_Y,
      slotSpacing,
      gap: GAP,
    });

    const top = positions.get("dev-1")!;
    const bottom = positions.get("dev-2")!;
    const edgeGap = top - halfHeight(1, slotSpacing) - (bottom + halfHeight(1, slotSpacing));
    expect(edgeGap).toBeCloseTo(GAP, 6);
  });

  it("applies the compact mesh factor to 1U/2U cards and the default to 3U+", () => {
    expect(getCardMeshFactor(1)).toBeLessThan(getCardMeshFactor(3));
    expect(getCardMeshFactor(2)).toBe(getCardMeshFactor(1));
    expect(getCardMeshFactor(4)).toBe(getCardMeshFactor(3));
  });
});

describe("computeDeviceLabelYOffsets", () => {
  const minCenterDist = 2 * DEVICE_LABEL_HALF_HEIGHT + DEVICE_LABEL_MIN_GAP;

  it("nudges lower labels when mesh centers are tighter than the badge height", () => {
    const devices = [makeDevice(1, 1), makeDevice(2, 2), makeDevice(3, 4)];
    // Centers closer than 2*halfHeight + gap → collision for equal-size badges.
    const deviceYs = new Map([
      ["dev-1", 0.88],
      ["dev-2", 0.88 - 0.02],
      ["dev-3", 0.88 - 0.04],
    ]);

    const offsets = computeDeviceLabelYOffsets(devices, { deviceYs });

    expect(offsets.get("dev-1")).toBe(0);
    expect(offsets.get("dev-2")).toBeLessThan(0);

    const worldYs = devices.map(
      (d) => deviceYs.get(d.device_id)! + (offsets.get(d.device_id) ?? 0),
    );
    for (let i = 1; i < worldYs.length; i++) {
      expect(worldYs[i - 1] - worldYs[i]).toBeGreaterThanOrEqual(minCenterDist - 1e-9);
    }
  });

  it("keeps offsets at zero when mesh spacing already clears badges", () => {
    const devices = [makeDevice(1, 1), makeDevice(10, 2), makeDevice(20, 4)];
    const deviceYs = new Map([
      ["dev-1", 0.88],
      ["dev-10", 0.5],
      ["dev-20", 0.1],
    ]);

    const offsets = computeDeviceLabelYOffsets(devices, { deviceYs });

    for (const d of devices) {
      expect(offsets.get(d.device_id)).toBe(0);
    }
  });

  it("does not use height_u when deciding label half-height", () => {
    const devices = [makeDevice(1, 1), makeDevice(2, 4)];
    const tightGap = 0.01;
    const deviceYs = new Map([
      ["dev-1", 0.5],
      ["dev-2", 0.5 - tightGap],
    ]);

    const offsets = computeDeviceLabelYOffsets(devices, { deviceYs });
    const worldTop = 0.5 + (offsets.get("dev-1") ?? 0);
    const worldBottom = deviceYs.get("dev-2")! + (offsets.get("dev-2") ?? 0);

    expect(worldTop - worldBottom).toBeCloseTo(minCenterDist, 9);
  });
});
