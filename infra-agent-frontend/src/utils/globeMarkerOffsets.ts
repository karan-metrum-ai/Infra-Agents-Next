/**
 * Globe marker offset utility for handling co-located data centers.
 *
 * When multiple sites share (nearly) the same lat/lng, this utility computes
 * display positions arranged in a small angular fan-out around the centroid.
 * Original coordinates remain unchanged for tooltips/APIs.
 *
 * Pulled forward from its real Phase-13 home (`utils/**`'s cross-cutting
 * utilities) because `DataCenterGlobe` needs it for Phase 6.
 */

import type { GlobeSite } from "@/components/DigitalTwin/types";

/** Display coordinates for a single site. */
export interface DisplayCoords {
  displayLat: number;
  displayLng: number;
}

/** Round to N decimal places for grouping. 4 decimals ≈ 11m precision. */
const PRECISION = 4;

/** Fan-out radius in degrees. ~0.35° for better visual separation. */
const FAN_RADIUS_DEG = 0.35;

/**
 * Start angle for fan layout (radians).
 * Using -π/4 (upper-right diagonal) so that 2-site groups spread diagonally,
 * preventing vertical tip overlap.
 */
const START_ANGLE = -Math.PI / 4;

/**
 * Round a number to the configured precision for grouping.
 */
function roundCoord(val: number): number {
  const factor = Math.pow(10, PRECISION);
  return Math.round(val * factor) / factor;
}

/**
 * Build a grouping key from rounded lat/lng.
 */
function coordKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

/**
 * Compute display coordinates for a list of sites.
 *
 * - Sites with unique (rounded) coordinates keep their original values.
 * - Sites sharing a coordinate are fanned out evenly on a small circle.
 *
 * Args:
 *     sites: Array of GlobeSite objects with latitude/longitude.
 *
 * Returns:
 *     Map from site.id to DisplayCoords ({ displayLat, displayLng }).
 */
export function computeDisplayCoords(sites: ReadonlyArray<GlobeSite>): Map<number, DisplayCoords> {
  const result = new Map<number, DisplayCoords>();

  // Group sites by rounded lat/lng.
  const groups = new Map<string, GlobeSite[]>();
  for (const site of sites) {
    const lat = site.latitude;
    const lng = site.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    const key = coordKey(lat, lng);
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(site);
  }

  // Compute display coords per group.
  for (const members of groups.values()) {
    if (members.length === 1) {
      const site = members[0];
      result.set(site.id, {
        displayLat: site.latitude,
        displayLng: site.longitude,
      });
      continue;
    }

    // Centroid of the group (use first member — they're all nearly equal).
    const centerLat = members[0].latitude;
    const centerLng = members[0].longitude;

    // Sort by id for deterministic ordering across renders.
    const sorted = [...members].sort((a, b) => a.id - b.id);
    const n = sorted.length;
    const angleStep = (2 * Math.PI) / n;

    for (let i = 0; i < n; i++) {
      const site = sorted[i];
      const theta = START_ANGLE + i * angleStep;

      // Local Cartesian offset → lat/lng.
      // Longitude offset scaled by 1/cos(lat) to preserve visual distance.
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      const dLat = FAN_RADIUS_DEG * Math.cos(theta);
      const dLng =
        cosLat > 0.01
          ? (FAN_RADIUS_DEG * Math.sin(theta)) / cosLat
          : FAN_RADIUS_DEG * Math.sin(theta);

      result.set(site.id, {
        displayLat: centerLat + dLat,
        displayLng: centerLng + dLng,
      });
    }
  }

  return result;
}

/**
 * Helper to get display lat for a site, falling back to original if missing.
 */
export function getDisplayLat(site: GlobeSite, displayMap: Map<number, DisplayCoords>): number {
  return displayMap.get(site.id)?.displayLat ?? site.latitude;
}

/**
 * Helper to get display lng for a site, falling back to original if missing.
 */
export function getDisplayLng(site: GlobeSite, displayMap: Map<number, DisplayCoords>): number {
  return displayMap.get(site.id)?.displayLng ?? site.longitude;
}
