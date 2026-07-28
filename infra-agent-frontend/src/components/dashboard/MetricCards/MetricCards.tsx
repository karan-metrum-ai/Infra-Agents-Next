"use client";

import { useCallback, useRef } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceMetricCardGroup } from "./DeviceMetricCardGroup";
import styles from "./MetricCards.module.css";
import type { DeviceHealthStatus, MetricCardsProps } from "./MetricCards.types";

/** Renders one metric-card group per device IP, aggregating each device's derived health status up to the parent. */
export function MetricCards({
  deviceIps,
  className,
  pollingInterval = 30000,
  onHealthStatusChange,
}: MetricCardsProps) {
  const healthByDeviceRef = useRef<Record<string, DeviceHealthStatus>>({});

  const handleDeviceHealthChange = useCallback(
    (deviceIp: string, status: DeviceHealthStatus) => {
      healthByDeviceRef.current = { ...healthByDeviceRef.current, [deviceIp]: status };
      onHealthStatusChange?.(healthByDeviceRef.current);
    },
    [onHealthStatusChange],
  );

  if (deviceIps.length === 0) {
    return (
      <div className={cn(styles.metricCards, className)}>
        <div className={styles.noDevices}>
          <Activity size={48} className={styles.noDevicesIcon} aria-hidden="true" />
          <h3>No devices selected</h3>
          <p>Select devices to view live metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.metricCards, className)}>
      {deviceIps.map((deviceIp) => (
        <DeviceMetricCardGroup
          key={deviceIp}
          deviceIp={deviceIp}
          pollingInterval={pollingInterval}
          onHealthStatusChange={handleDeviceHealthChange}
        />
      ))}
    </div>
  );
}

export default MetricCards;
