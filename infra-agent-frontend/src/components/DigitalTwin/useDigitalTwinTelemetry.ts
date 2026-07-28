"use client";

/**
 * Resolves the effective telemetry cluster for the currently-selected site,
 * polls live bulk-device freshness data for it, and lays the site's
 * location tree out into positioned racks (with critical/warning device
 * highlighting merged in). Extracted from `DataCenterDigitalTwin` so the
 * data-derivation pipeline is testable independent of the render tree.
 */

import { useMemo } from "react";
import { useGetLiveBulkDevicesQuery } from "@/features/digitalTwin/digitalTwinApi";
import { collectRowRackGroups, layoutRacksTo3D, mergeLayoutWarnings } from "./rackLayout";
import { buildDeviceTelemetryMap, resolveTelemetryClusterId } from "./rackUtils";
import type { GlobeSite, Rack3D } from "./types";

export interface UseDigitalTwinTelemetryOptions {
  clusterId: string | null | undefined;
  selectedSite: GlobeSite | null;
}

export interface DigitalTwinTelemetryResult {
  currentFloorRacks: Rack3D[];
  layoutWarnings: string[];
}

export function useDigitalTwinTelemetry({
  clusterId,
  selectedSite,
}: UseDigitalTwinTelemetryOptions): DigitalTwinTelemetryResult {
  const effectiveClusterId = useMemo(
    () => resolveTelemetryClusterId(clusterId, selectedSite),
    [clusterId, selectedSite],
  );

  const numericClusterId = effectiveClusterId ? parseInt(effectiveClusterId, 10) : 0;
  const { data: bulkDevicesData } = useGetLiveBulkDevicesQuery(numericClusterId, {
    skip: !effectiveClusterId || numericClusterId === 0,
    pollingInterval: 30000,
  });

  const deviceTelemetryMap = useMemo(() => {
    if (!bulkDevicesData?.devices) {
      return new Map();
    }
    return buildDeviceTelemetryMap(bulkDevicesData.devices);
  }, [bulkDevicesData]);

  const criticalDeviceSet = useMemo(() => {
    const plural = selectedSite?.affectedDevices;
    if (plural && plural.length > 0) {
      return new Set(plural);
    }
    if (selectedSite?.affectedDevice) {
      return new Set([selectedSite.affectedDevice]);
    }
    return new Set<string>();
  }, [selectedSite]);

  const warningDeviceSet = useMemo(
    () => new Set(selectedSite?.warningDevices ?? []),
    [selectedSite?.warningDevices],
  );

  const layoutResult = useMemo(() => {
    if (!selectedSite) {
      return { racks: [] as Rack3D[], warnings: [] as string[] };
    }
    const groups = collectRowRackGroups(selectedSite.locations);
    const laidOut = layoutRacksTo3D(groups, {
      criticalDeviceSet,
      warningDeviceSet,
      telemetryMap: deviceTelemetryMap,
    });
    return {
      racks: laidOut.racks,
      warnings: mergeLayoutWarnings(laidOut.warnings, selectedSite.layoutWarnings),
    };
  }, [selectedSite, criticalDeviceSet, warningDeviceSet, deviceTelemetryMap]);

  return { currentFloorRacks: layoutResult.racks, layoutWarnings: layoutResult.warnings };
}
