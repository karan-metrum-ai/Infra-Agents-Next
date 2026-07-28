"use client";

/**
 * Right-side device detail wiring for the interior 3D view: a compact
 * Server/Switch details card for the currently-selected device, or the
 * full `DeviceHealthPanel` when the user drills into "View full details".
 */

import ServerDetailsCard from "@/components/dashboard/ServerDetailsCard/ServerDetailsCard";
import { SwitchDetailsCard } from "@/components/dashboard/SwitchDetailsCard/SwitchDetailsCard";
import DeviceHealthPanel from "@/components/dashboard/DeviceHealthPanel/DeviceHealthPanel";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinDeviceDetailPanelProps } from "./DataCenterDigitalTwin.types";

export function DigitalTwinDeviceDetailPanel({
  viewMode,
  selectedDevice,
  healthPanelDeviceId,
  healthPanelDeviceName,
  onCloseDeviceCard,
  onViewFullDetails,
  onCloseHealthPanel,
}: DigitalTwinDeviceDetailPanelProps) {
  return (
    <>
      {viewMode === "interior" &&
        selectedDevice &&
        healthPanelDeviceId === null &&
        (() => {
          const numericDeviceId = parseInt(selectedDevice.device_id, 10);
          if (Number.isNaN(numericDeviceId)) return null;
          const isSwitch = selectedDevice.device_type === "switch";

          return (
            <div className={styles.deviceDetailPanel}>
              {isSwitch ? (
                <SwitchDetailsCard
                  deviceId={numericDeviceId}
                  deviceName={selectedDevice.hostname}
                  onClose={onCloseDeviceCard}
                  variant="right"
                />
              ) : (
                <ServerDetailsCard
                  deviceId={numericDeviceId}
                  deviceName={selectedDevice.hostname}
                  onClose={onCloseDeviceCard}
                  onViewFullDetails={() => onViewFullDetails(selectedDevice)}
                  variant="right"
                />
              )}
            </div>
          );
        })()}

      {healthPanelDeviceId !== null && (
        <div className={styles.healthPanel}>
          <DeviceHealthPanel
            deviceId={healthPanelDeviceId}
            deviceName={healthPanelDeviceName}
            onClose={onCloseHealthPanel}
            variant="right"
          />
        </div>
      )}
    </>
  );
}
