"use client";

/**
 * Renders a 3D interior view of a site's data center floor — the Command
 * Center split-view companion to the full multi-site globe at
 * `/digital-twin`. Ported from the Vite source's `SiteRoomView.tsx`.
 */

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { DigitalTwinScene } from "@/components/DigitalTwin/DigitalTwinScene";
import {
  collectRowRackGroups,
  layoutRacksTo3D,
  mergeLayoutWarnings,
} from "@/components/DigitalTwin/rackLayout";
import {
  buildDeviceTelemetryMap,
  resolveTelemetryClusterId,
} from "@/components/DigitalTwin/rackUtils";
import { DeviceHealthPanel } from "@/components/dashboard/DeviceHealthPanel/DeviceHealthPanel";
import { ServerDetailsCard } from "@/components/dashboard/ServerDetailsCard/ServerDetailsCard";
import { SwitchDetailsCard } from "@/components/dashboard/SwitchDetailsCard/SwitchDetailsCard";
import { useGetLiveBulkDevicesQuery } from "@/features/digitalTwin/digitalTwinApi";
import type { Device3D } from "@/components/DigitalTwin/types";
import { cn } from "@/lib/utils";
import styles from "./SiteRoomView.module.css";
import type { SiteRoomViewProps } from "./SiteRoomView.types";

export function SiteRoomView({ site, clusterId, className }: SiteRoomViewProps) {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [selectedDevice, setSelectedDevice] = useState<Device3D | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [healthPanelDeviceId, setHealthPanelDeviceId] = useState<number | null>(null);
  const [healthPanelDeviceName, setHealthPanelDeviceName] = useState("");

  const criticalDeviceSet = useMemo(() => {
    const names =
      site.affectedDevices && site.affectedDevices.length > 0
        ? site.affectedDevices
        : site.affectedDevice
          ? [site.affectedDevice]
          : [];
    return new Set(names);
  }, [site.affectedDevices, site.affectedDevice]);

  const warningDeviceSet = useMemo(() => new Set(site.warningDevices ?? []), [site.warningDevices]);

  const effectiveClusterId = useMemo(
    () => resolveTelemetryClusterId(clusterId ?? null, site),
    [clusterId, site],
  );
  const numericClusterId = effectiveClusterId ? Number.parseInt(effectiveClusterId, 10) : 0;
  const { data: bulkDevicesData } = useGetLiveBulkDevicesQuery(numericClusterId, {
    skip: !effectiveClusterId || numericClusterId === 0,
    pollingInterval: 30_000,
  });

  const deviceTelemetryMap = useMemo(() => {
    if (!bulkDevicesData?.devices) return new Map();
    return buildDeviceTelemetryMap(bulkDevicesData.devices);
  }, [bulkDevicesData]);

  const { racks3D, layoutWarnings } = useMemo(() => {
    const groups = collectRowRackGroups(site.locations);
    const laidOut = layoutRacksTo3D(groups, {
      xStart: -5,
      criticalDeviceSet,
      warningDeviceSet,
      telemetryMap: deviceTelemetryMap,
    });
    return {
      racks3D: laidOut.racks,
      layoutWarnings: mergeLayoutWarnings(laidOut.warnings, site.layoutWarnings),
    };
  }, [site, criticalDeviceSet, warningDeviceSet, deviceTelemetryMap]);

  const handleToggleSelection = useCallback((deviceId: string, isSelected: boolean) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(deviceId);
      else next.delete(deviceId);
      return next;
    });
  }, []);

  const handleOpenHealthPanel = useCallback((device: Device3D) => {
    const numericId = Number.parseInt(device.device_id, 10);
    if (!Number.isNaN(numericId)) {
      setHealthPanelDeviceId(numericId);
      setHealthPanelDeviceName(device.hostname);
    }
  }, []);

  const handleCloseHealthPanel = useCallback(() => {
    setHealthPanelDeviceId(null);
    setHealthPanelDeviceName("");
  }, []);

  const deviceIdNumeric = selectedDevice
    ? Number.parseInt(selectedDevice.device_id, 10)
    : Number.NaN;

  return (
    <div className={cn(styles.siteRoomView, className)}>
      {layoutWarnings.length > 0 && (
        <div className={styles.layoutWarningBanner} role="alert">
          Layout metadata incomplete — check CSV upload ({layoutWarnings.length} rack
          {layoutWarnings.length === 1 ? "" : "s"} skipped)
        </div>
      )}

      {/* Same scene module mounted on /digital-twin. `initialCamera="inside-room"`
          spawns the camera in the central corridor so the user lands directly
          inside the data hall for this split view. */}
      <DigitalTwinScene
        className={styles.canvas}
        racks={racks3D}
        regionName={site.name}
        selectedRackId={selectedRackId}
        selectedDeviceIds={selectedDeviceIds}
        onRackClick={(rackId) => setSelectedRackId((prev) => (prev === rackId ? null : rackId))}
        onDeviceClick={setSelectedDevice}
        onToggleSelection={handleToggleSelection}
        onResetView={() => setSelectedRackId(null)}
        initialCamera="inside-room"
        showLoadingOverlay={false}
      />

      <div className={styles.statsOverlay}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{racks3D.length}</span>
          <span className={styles.statLabel}>Racks</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {racks3D.reduce((acc, r) => acc + r.devices.length, 0)}
          </span>
          <span className={styles.statLabel}>Devices</span>
        </div>
      </div>

      {selectedDevice &&
        !healthPanelDeviceId &&
        (!Number.isNaN(deviceIdNumeric) ? (
          selectedDevice.device_type === "switch" ? (
            <SwitchDetailsCard
              deviceId={deviceIdNumeric}
              deviceName={selectedDevice.hostname}
              onClose={() => setSelectedDevice(null)}
            />
          ) : (
            <ServerDetailsCard
              deviceId={deviceIdNumeric}
              deviceName={selectedDevice.hostname}
              onClose={() => setSelectedDevice(null)}
              onViewFullDetails={() => handleOpenHealthPanel(selectedDevice)}
            />
          )
        ) : (
          <div className={styles.deviceInfo}>
            <div className={styles.deviceHeader}>
              <span className={styles.deviceName}>{selectedDevice.hostname}</span>
              <span className={styles.deviceStatus} data-status={selectedDevice.status}>
                {selectedDevice.status}
              </span>
            </div>
            <div className={styles.deviceDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>IP</span>
                <span className={styles.detailValue}>{selectedDevice.ip_address}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Type</span>
                <span className={styles.detailValue}>{selectedDevice.device_type}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Position</span>
                <span className={styles.detailValue}>{selectedDevice.rack_position}</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeDeviceInfo}
              onClick={() => setSelectedDevice(null)}
            >
              Close
            </button>
          </div>
        ))}

      {healthPanelDeviceId !== null && (
        <DeviceHealthPanel
          deviceId={healthPanelDeviceId}
          deviceName={healthPanelDeviceName}
          onClose={handleCloseHealthPanel}
        />
      )}

      <div className={styles.loadingFallback}>
        <Loader2 className={styles.spinner} size={24} aria-hidden="true" />
        <span>Loading 3D view…</span>
      </div>
    </div>
  );
}

export default SiteRoomView;
