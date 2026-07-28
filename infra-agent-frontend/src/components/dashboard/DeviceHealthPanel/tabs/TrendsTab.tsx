import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart/TimeSeriesChart";
import type { LiveDeviceDetailResponse } from "@/features/digitalTwin/digitalTwinApi.types";
import sharedStyles from "../DeviceHealthPanel.module.css";
import styles from "./TrendsTab.module.css";

/**
 * 5 time-series sparkline charts (OS + GPU + power). Table names verified
 * against cluster_broadcom_lab SHOW TABLES (2026-06-20):
 *   CPU:   all_smi_cpu_utilization                    (val = fractional, 0-1)
 *   Mem:   all_smi_memory_available_bytes             (val = bytes)
 *   Power: idrac_power_control_consumed_watts          (val = watts)
 *   GPU:   all_smi_gpu_power_consumption_watts         (val = watts)
 *   Temp:  all_smi_chassis_inlet_temperature_celsius   (val = °C gauge)
 *
 * Charts are gated on cluster_id for strict tenant isolation.
 */
export function TrendsTab({ data }: { data: LiveDeviceDetailResponse }) {
  const deviceId = data.device_id;
  const rawCluster = data.cluster_id;
  const clusterId = (() => {
    if (rawCluster == null) return null;
    const n = typeof rawCluster === "number" ? rawCluster : parseInt(String(rawCluster), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const primaryIp = data.primary_ip ?? null;

  if (!clusterId) {
    return (
      <div className={sharedStyles.tabContent}>
        <div className={styles.clusterRequired}>Cluster ID required for time-series queries.</div>
      </div>
    );
  }

  const hasGpus = (data.hardware?.gpu_count ?? 0) > 0;

  return (
    <div className={sharedStyles.tabContent}>
      <div className={styles.chartStack}>
        <TimeSeriesChart
          deviceId={deviceId}
          clusterId={clusterId}
          metric="all_smi_cpu_utilization"
          label="CPU Usage"
          unit="%"
          color="var(--primary)"
          formatValue={(v) => `${(v * 100).toFixed(1)}`}
        />

        <TimeSeriesChart
          deviceId={deviceId}
          clusterId={clusterId}
          metric="all_smi_memory_available_bytes"
          label="Memory Available"
          unit=" GiB"
          color="#6ee7b7"
          formatValue={(v) => `${(v / 1024 ** 3).toFixed(1)}`}
        />

        <TimeSeriesChart
          deviceId={deviceId}
          clusterId={clusterId}
          metric="idrac_power_control_consumed_watts"
          label="Power Draw"
          unit=" W"
          color="#f59e0b"
          formatValue={(v) => `${v.toFixed(0)}`}
        />

        {hasGpus && (
          <TimeSeriesChart
            deviceId={deviceId}
            clusterId={clusterId}
            metric="all_smi_gpu_power_consumption_watts"
            label="GPU Power"
            unit=" W"
            color="#818cf8"
            formatValue={(v) => `${v.toFixed(0)}`}
          />
        )}

        <TimeSeriesChart
          deviceId={deviceId}
          clusterId={clusterId}
          metric="all_smi_chassis_inlet_temperature_celsius"
          label="Inlet Temp"
          unit="°C"
          color="#64D8CE"
          formatValue={(v) => v.toFixed(1)}
        />

        {!primaryIp && (
          <div className={styles.noPrimaryIpNotice}>
            No primary IP — queries are cluster-wide (may include other devices)
          </div>
        )}
      </div>
    </div>
  );
}

export default TrendsTab;
