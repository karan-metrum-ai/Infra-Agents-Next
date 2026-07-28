"use client";

/**
 * Transforms raw `GlobeSite[]` into the point/ring layer data react-globe.gl
 * needs, plus the fan-out display-coordinate map for co-located sites.
 * Extracted from `DataCenterGlobe` so the marker/point transformation logic
 * can be tested and read independently of the render tree.
 */

import { useMemo } from "react";
import type { GlobeSite } from "./types";
import type { GlobePointData, GlobeRingData } from "./DataCenterGlobe.types";
import { HEALTH_COLORS, getRingGradient } from "./globeHealthTheme";
import {
  computeDisplayCoords,
  getDisplayLat,
  getDisplayLng,
  type DisplayCoords,
} from "@/utils/globeMarkerOffsets";

export interface GlobePointsData {
  displayCoords: Map<number, DisplayCoords>;
  pointsData: GlobePointData[];
  ringsData: GlobeRingData[];
  /** Sites with any incidents for ring pulses (Command Center enrichment). */
  issueSites: GlobeSite[];
  /** Sites with finite coordinates, for the always-visible HTML markers. */
  globeSites: GlobeSite[];
}

export function useGlobePointsData(
  sites: GlobeSite[],
  hoveredPoint: GlobePointData | null,
): GlobePointsData {
  const displayCoords = useMemo(() => computeDisplayCoords(sites), [sites]);

  const pointsData = useMemo((): GlobePointData[] => {
    return sites.map((site) => {
      const healthStatus = site.healthStatus || "unknown";
      return {
        lat: getDisplayLat(site, displayCoords),
        lng: getDisplayLng(site, displayCoords),
        size: 0.4 + Math.min(site.deviceCount * 0.08, 0.6),
        color: HEALTH_COLORS[healthStatus],
        site,
        healthStatus,
      };
    });
  }, [sites, displayCoords]);

  // Ripple rings for critical (unhealthy) sites only; extra rings on hover.
  const ringsData = useMemo((): GlobeRingData[] => {
    const alertRings: GlobeRingData[] = sites
      .filter((site) => (site.healthStatus || "unknown") === "unhealthy")
      .map((site) => {
        const healthStatus = site.healthStatus || "unknown";
        const isUnhealthy = healthStatus === "unhealthy";
        const isHovered = hoveredPoint?.site.id === site.id;
        return {
          lat: getDisplayLat(site, displayCoords),
          lng: getDisplayLng(site, displayCoords),
          maxR: isHovered ? (isUnhealthy ? 3.2 : 2.8) : isUnhealthy ? 2.8 : 2.4,
          propagationSpeed: isHovered ? (isUnhealthy ? 1.8 : 1.4) : isUnhealthy ? 2.2 : 1.6,
          repeatPeriod: isHovered ? (isUnhealthy ? 1100 : 1400) : isUnhealthy ? 1400 : 1800,
          color: getRingGradient(healthStatus),
          site,
        };
      });

    if (!hoveredPoint) {
      return alertRings;
    }

    const hoverStatus = hoveredPoint.healthStatus;
    const hoverRings: GlobeRingData[] = [
      {
        lat: hoveredPoint.lat,
        lng: hoveredPoint.lng,
        maxR: 2.2,
        propagationSpeed: 1.2,
        repeatPeriod: 900,
        color: getRingGradient(hoverStatus),
        site: hoveredPoint.site,
      },
      {
        lat: hoveredPoint.lat,
        lng: hoveredPoint.lng,
        maxR: 3.4,
        propagationSpeed: 0.9,
        repeatPeriod: 1200,
        color: getRingGradient(hoverStatus),
        site: hoveredPoint.site,
      },
    ];

    const hasAlertRing = alertRings.some((ring) => ring.site.id === hoveredPoint.site.id);
    if (hasAlertRing) {
      return alertRings;
    }
    return [...alertRings, ...hoverRings];
  }, [sites, hoveredPoint, displayCoords]);

  const issueSites = useMemo(
    () =>
      sites.filter((site) => {
        if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) {
          return false;
        }
        const counts = site.incidentCounts;
        if (!counts) {
          return (site.healthStatus || "unknown") === "unhealthy";
        }
        return counts.critical + counts.warning + counts.unknown > 0;
      }),
    [sites],
  );

  const globeSites = useMemo(
    () => sites.filter((site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude)),
    [sites],
  );

  return { displayCoords, pointsData, ringsData, issueSites, globeSites };
}
