import { describe, it, expect } from "vitest";
import { computeDisplayCoords, getDisplayLat, getDisplayLng } from "./globeMarkerOffsets";
import type { GlobeSite } from "@/components/DigitalTwin/types";

/**
 * Minimal GlobeSite stub for tests.
 */
function makeSite(id: number, lat: number, lng: number): GlobeSite {
  return {
    id,
    name: `Site ${id}`,
    slug: `site-${id}`,
    status: "active",
    regionName: "",
    regionSlug: "",
    latitude: lat,
    longitude: lng,
    address: "",
    rackCount: 0,
    deviceCount: 0,
    gpuCount: 0,
    locations: [],
  };
}

describe("computeDisplayCoords", () => {
  it("keeps a singleton site at its original coordinates", () => {
    const sites = [makeSite(1, 37.7749, -122.4194)];
    const map = computeDisplayCoords(sites);

    expect(map.size).toBe(1);
    const coords = map.get(1);
    expect(coords?.displayLat).toBe(37.7749);
    expect(coords?.displayLng).toBe(-122.4194);
  });

  it("fans out two sites sharing exact same coords", () => {
    const sites = [makeSite(1, 40.0, 10.0), makeSite(2, 40.0, 10.0)];
    const map = computeDisplayCoords(sites);

    expect(map.size).toBe(2);
    const c1 = map.get(1)!;
    const c2 = map.get(2)!;

    // They should not overlap each other.
    const samePos = c1.displayLat === c2.displayLat && c1.displayLng === c2.displayLng;
    expect(samePos).toBe(false);

    // At least one coordinate should differ from the original.
    const c1Moved = c1.displayLat !== 40.0 || c1.displayLng !== 10.0;
    const c2Moved = c2.displayLat !== 40.0 || c2.displayLng !== 10.0;
    expect(c1Moved).toBe(true);
    expect(c2Moved).toBe(true);
  });

  it("skips sites with non-finite coordinates", () => {
    const sites = [makeSite(1, NaN, 10.0), makeSite(2, 40.0, Infinity), makeSite(3, 40.0, 10.0)];
    const map = computeDisplayCoords(sites);

    expect(map.size).toBe(1);
    expect(map.has(1)).toBe(false);
    expect(map.has(2)).toBe(false);
    expect(map.has(3)).toBe(true);
  });

  it("groups sites that round to the same 4-decimal point", () => {
    // 40.00001 rounds to 40.0000 at 4 decimals.
    const sites = [makeSite(1, 40.0, 10.0), makeSite(2, 40.00001, 10.00001)];
    const map = computeDisplayCoords(sites);

    expect(map.size).toBe(2);
    const c1 = map.get(1)!;
    const c2 = map.get(2)!;

    // They are grouped together so should be fanned apart.
    const samePos = c1.displayLat === c2.displayLat && c1.displayLng === c2.displayLng;
    expect(samePos).toBe(false);
  });

  it("does not group sites that differ beyond 4 decimals", () => {
    // 0.0001 diff at 4 decimals → different keys (40.0 vs 40.0001).
    const sites = [makeSite(1, 40.0, 10.0), makeSite(2, 40.0001, 10.0001)];
    const map = computeDisplayCoords(sites);

    expect(map.size).toBe(2);
    const c1 = map.get(1)!;
    const c2 = map.get(2)!;

    // Both singletons → keep original.
    expect(c1.displayLat).toBe(40.0);
    expect(c2.displayLat).toBe(40.0001);
  });
});

describe("getDisplayLat / getDisplayLng helpers", () => {
  it("returns display coord from map when present", () => {
    const site = makeSite(1, 10.0, 20.0);
    const map = new Map([[1, { displayLat: 11.0, displayLng: 21.0 }]]);

    expect(getDisplayLat(site, map)).toBe(11.0);
    expect(getDisplayLng(site, map)).toBe(21.0);
  });

  it("falls back to original coords when site not in map", () => {
    const site = makeSite(99, 10.0, 20.0);
    const map = new Map<number, { displayLat: number; displayLng: number }>();

    expect(getDisplayLat(site, map)).toBe(10.0);
    expect(getDisplayLng(site, map)).toBe(20.0);
  });
});
