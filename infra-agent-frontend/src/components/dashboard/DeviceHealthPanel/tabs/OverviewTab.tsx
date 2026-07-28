import {
  Activity,
  Cpu,
  Fan,
  HardDrive,
  MemoryStick,
  MonitorCog,
  Network,
  Server,
  Thermometer,
  Zap,
} from "lucide-react";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge/FreshnessBadge";
import type { LiveDeviceDetailResponse } from "@/features/digitalTwin/digitalTwinApi.types";
import { EmptyState } from "../DeviceHealthShared";
import {
  formatBytes,
  getTempColor,
  safeArray,
  safeNumber,
  safeString,
} from "../deviceHealthHelpers";
import styles from "../DeviceHealthPanel.module.css";

/** System overview with key metrics. */
export function OverviewTab({ data }: { data: LiveDeviceDetailResponse }) {
  const system = data?.system;
  const hardware = data?.hardware;
  const power = data?.power;
  const thermal = data?.thermal;
  const fans = safeArray(data?.fans);
  const networkInterfaces = safeArray(data?.network_interfaces);

  return (
    <div className={styles.tabContent}>
      <div className={styles.infoSection}>
        <h4 className={styles.sectionTitle}>
          <MonitorCog size={14} aria-hidden="true" />
          System Information
        </h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Hostname</span>
            <span className={styles.infoValue}>{safeString(system?.hostname)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Model</span>
            <span className={styles.infoValue}>{safeString(data?.model)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Serial</span>
            <span className={styles.infoValue}>{safeString(data?.serial)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Service Tag</span>
            <span className={styles.infoValue}>{safeString(system?.service_tag)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>BIOS Version</span>
            <span className={styles.infoValue}>{safeString(system?.bios_version)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>iDRAC Version</span>
            <span className={styles.infoValue}>{safeString(system?.idrac_version)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Power State</span>
            <span
              className={styles.infoValue}
              data-power={system?.power_state?.toLowerCase() ?? "unknown"}
            >
              {safeString(system?.power_state)}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>BMC IP</span>
            <span className={styles.infoValue}>{safeString(data?.bmc?.ip_address)}</span>
          </div>
          {data?.data_freshness && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Telemetry</span>
              <FreshnessBadge
                dataFreshness={data.data_freshness}
                lastTelemetryTimestamp={data.last_telemetry_timestamp}
              />
            </div>
          )}
        </div>
      </div>

      <div className={styles.infoSection}>
        <h4 className={styles.sectionTitle}>
          <Server size={14} aria-hidden="true" />
          Hardware Summary
        </h4>
        {hardware ? (
          <div className={styles.hardwareSummaryGrid}>
            {(hardware.cpu_count ?? 0) > 0 && (
              <div className={styles.hardwareCard}>
                <Cpu size={18} className={styles.hardwareIcon} aria-hidden="true" />
                <div className={styles.hardwareCardContent}>
                  <span className={styles.hardwareCardValue}>{hardware.cpu_count ?? 0}x</span>
                  <span className={styles.hardwareCardLabel}>
                    {safeString(hardware.cpu_model, "CPU")}
                  </span>
                  <span className={styles.hardwareCardSub}>
                    {hardware.cpu_cores_total ?? 0} cores / {hardware.cpu_threads_total ?? 0}{" "}
                    threads
                  </span>
                </div>
              </div>
            )}
            {(hardware.memory_total_gb ?? 0) > 0 && (
              <div className={styles.hardwareCard}>
                <MemoryStick size={18} className={styles.hardwareIcon} aria-hidden="true" />
                <div className={styles.hardwareCardContent}>
                  <span className={styles.hardwareCardValue}>
                    {formatBytes(hardware.memory_total_gb)}
                  </span>
                  <span className={styles.hardwareCardLabel}>
                    {safeString(hardware.memory_type, "Memory")} @ {hardware.memory_speed_mhz ?? 0}{" "}
                    MHz
                  </span>
                  <span className={styles.hardwareCardSub}>
                    {hardware.memory_dimm_count ?? 0} DIMMs
                  </span>
                </div>
              </div>
            )}
            {((hardware.storage_total_tb ?? 0) > 0 || (hardware.storage_drives ?? 0) > 0) && (
              <div className={styles.hardwareCard}>
                <HardDrive size={18} className={styles.hardwareIcon} aria-hidden="true" />
                <div className={styles.hardwareCardContent}>
                  <span className={styles.hardwareCardValue}>
                    {safeNumber(hardware.storage_total_tb, 1)} TB
                  </span>
                  <span className={styles.hardwareCardLabel}>Storage</span>
                  <span className={styles.hardwareCardSub}>
                    {hardware.storage_drives ?? 0} drives
                  </span>
                </div>
              </div>
            )}
            {(hardware.gpu_count ?? 0) > 0 && (
              <div className={styles.hardwareCard}>
                <Cpu size={18} className={styles.hardwareIcon} data-gpu aria-hidden="true" />
                <div className={styles.hardwareCardContent}>
                  <span className={styles.hardwareCardValue}>{hardware.gpu_count}x GPU</span>
                  <span className={styles.hardwareCardLabel}>
                    {safeString(hardware.gpu_model, "GPU")}
                  </span>
                  <span className={styles.hardwareCardSub}>
                    {hardware.gpu_memory_gb ?? 0} GB VRAM
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState message="Hardware information not available" />
        )}
      </div>

      <div className={styles.quickMetrics}>
        {(power?.current_watts ?? 0) > 0 && (
          <div className={styles.metricCard}>
            <Zap size={16} aria-hidden="true" />
            <span className={styles.metricValue}>{safeNumber(power?.current_watts, 0)}W</span>
            <span className={styles.metricLabel}>Power</span>
          </div>
        )}
        {thermal?.inlet_temp_celsius != null && (
          <div className={styles.metricCard}>
            <Thermometer size={16} aria-hidden="true" />
            <span
              className={styles.metricValue}
              style={{ color: getTempColor(thermal?.inlet_temp_celsius) }}
            >
              {safeNumber(thermal?.inlet_temp_celsius, 1)}C
            </span>
            <span className={styles.metricLabel}>Inlet Temp</span>
          </div>
        )}
        {fans.length > 0 && (
          <div className={styles.metricCard}>
            <Fan size={16} aria-hidden="true" />
            <span className={styles.metricValue}>
              {fans.filter((f) => f?.health === "OK").length}/{fans.length}
            </span>
            <span className={styles.metricLabel}>Fans OK</span>
          </div>
        )}
        {networkInterfaces.length > 0 && (
          <div className={styles.metricCard}>
            <Network size={16} aria-hidden="true" />
            <span className={styles.metricValue}>
              {networkInterfaces.filter((n) => n?.link_status === "Up").length}/
              {networkInterfaces.length}
            </span>
            <span className={styles.metricLabel}>NICs Up</span>
          </div>
        )}
        {data?.os?.cpu_usage_percent != null && (
          <div className={styles.metricCard}>
            <Activity size={16} aria-hidden="true" />
            <span className={styles.metricValue}>{data.os.cpu_usage_percent.toFixed(1)}%</span>
            <span className={styles.metricLabel}>CPU</span>
          </div>
        )}
        {data?.os?.mem_used_percent != null && (
          <div className={styles.metricCard}>
            <MemoryStick size={16} aria-hidden="true" />
            <span className={styles.metricValue}>{data.os.mem_used_percent.toFixed(1)}%</span>
            <span className={styles.metricLabel}>Mem</span>
          </div>
        )}
        {data?.os?.load1 != null && (
          <div className={styles.metricCard}>
            <Server size={16} aria-hidden="true" />
            <span className={styles.metricValue}>{data.os.load1.toFixed(2)}</span>
            <span className={styles.metricLabel}>Load</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default OverviewTab;
