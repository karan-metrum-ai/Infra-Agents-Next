"use client";

import {
  AlertTriangle,
  Cpu,
  ExternalLink,
  Hash,
  HardDrive,
  MapPin,
  MemoryStick,
  Network,
  Server,
  Tag,
  Thermometer,
  X,
  Zap,
} from "lucide-react";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge/FreshnessBadge";
import { TelemetryProbesRow } from "@/components/ui/TelemetryProbesRow/TelemetryProbesRow";
import { useGetLiveDeviceDetailQuery } from "@/features/digitalTwin/digitalTwinApi";
import { cn } from "@/lib/utils";
import { GpuTelemetrySection } from "./GpuTelemetrySection";
import { OsMetricsSection } from "./OsMetricsSection";
import { StorageDrivesSection } from "./StorageDrivesSection";
import {
  formatBytes,
  formatPowerWatts,
  formatTempCelsius,
  getHealthIndicator,
  getTempColor,
} from "./serverDetailsFormatters";
import { MAX_RETRY_ATTEMPTS, useRetryOnError } from "./useRetryOnError";
import styles from "./ServerDetailsCard.module.css";
import type { ServerDetailsCardProps } from "./ServerDetailsCard.types";

/** Detail/inspector card for a server device clicked in the 3D rack digital-twin visualization. */
export function ServerDetailsCard({
  deviceId,
  deviceName,
  onClose,
  onViewFullDetails,
  variant = "default",
}: ServerDetailsCardProps) {
  const { data, isLoading, isFetching, isError, refetch } = useGetLiveDeviceDetailQuery(deviceId, {
    pollingInterval: 30000,
  });
  const { shouldShowError, retryCount, resetRetries } = useRetryOnError(isError, refetch);

  const showLoadingState =
    isLoading || (isError && !shouldShowError) || (isFetching && shouldShowError);
  const healthIndicator = getHealthIndicator(data?.health_status ?? "unknown");
  const HealthIcon = healthIndicator.icon;

  return (
    <div className={variant === "right" ? styles.cardRight : styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.serverIcon}>
            <Server size={20} aria-hidden="true" />
          </div>
          <div className={styles.headerInfo}>
            <h3 className={styles.serverName}>{deviceName}</h3>
            {data && (
              <span className={styles.serverMeta}>
                {data.manufacturer} {data.model}
              </span>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          {data && !showLoadingState && !shouldShowError && (
            <div className={styles.headerHealth} style={{ color: healthIndicator.color }}>
              <HealthIcon size={12} aria-hidden="true" />
              <span>{healthIndicator.label.toUpperCase()}</span>
            </div>
          )}
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {showLoadingState && (
        <div className={styles.loadingState}>
          <div className={cn(styles.skeleton, styles.skeletonHeader)} />
          <div className={cn(styles.skeleton, styles.skeletonBanner)} />
          <div className={styles.skeletonRow}>
            <div className={cn(styles.skeleton, styles.skeletonItem)} />
            <div className={cn(styles.skeleton, styles.skeletonItem)} />
          </div>
          <div className={styles.skeletonGrid}>
            <div className={cn(styles.skeleton, styles.skeletonGridItem)} />
            <div className={cn(styles.skeleton, styles.skeletonGridItem)} />
            <div className={cn(styles.skeleton, styles.skeletonGridItem)} />
            <div className={cn(styles.skeleton, styles.skeletonGridItem)} />
          </div>
          <div className={styles.skeletonMetrics}>
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
          </div>
          {isError && retryCount > 0 && retryCount < MAX_RETRY_ATTEMPTS && (
            <output className={styles.retryingIndicator}>
              Retrying... ({retryCount}/{MAX_RETRY_ATTEMPTS})
            </output>
          )}
        </div>
      )}

      {shouldShowError && !showLoadingState && (
        <div className={styles.errorState}>
          <AlertTriangle size={24} aria-hidden="true" />
          <span>Failed to load server details</span>
          <span className={styles.errorDetail}>Connection error</span>
          <button type="button" className={styles.retryButton} onClick={resetRetries}>
            Retry
          </button>
        </div>
      )}

      {data && !showLoadingState && !shouldShowError && (
        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.infoRow}>
              <div className={styles.infoItem}>
                <MapPin size={14} className={styles.infoIcon} aria-hidden="true" />
                <div className={styles.infoContent}>
                  <span className={styles.infoLabel}>Location</span>
                  <span className={styles.infoValue}>
                    {data.rack} • U{data.position}
                  </span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Tag size={14} className={styles.infoIcon} aria-hidden="true" />
                <div className={styles.infoContent}>
                  <span className={styles.infoLabel}>Asset Tag</span>
                  <span className={styles.infoValue}>{data.asset_tag || "N/A"}</span>
                </div>
              </div>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoItem}>
                <Hash size={14} className={styles.infoIcon} aria-hidden="true" />
                <div className={styles.infoContent}>
                  <span className={styles.infoLabel}>Serial Number</span>
                  <span className={styles.infoValue}>{data.serial}</span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <Network size={14} className={styles.infoIcon} aria-hidden="true" />
                <div className={styles.infoContent}>
                  <span className={styles.infoLabel}>BMC IP</span>
                  <span className={styles.infoValue}>{data.bmc?.ip_address || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Hardware Summary</h4>
            <div className={styles.hardwareGrid}>
              {(data.hardware?.cpu_count ?? 0) > 0 && (
                <div className={styles.hardwareItem}>
                  <Cpu size={16} className={styles.hardwareIcon} aria-hidden="true" />
                  <div className={styles.hardwareContent}>
                    <span className={styles.hardwareValue}>{data.hardware.cpu_count}x CPU</span>
                    <span className={styles.hardwareLabel}>
                      {data.hardware.cpu_cores_total} cores
                    </span>
                  </div>
                </div>
              )}
              {(data.hardware?.memory_total_gb ?? 0) > 0 && (
                <div className={styles.hardwareItem}>
                  <MemoryStick size={16} className={styles.hardwareIcon} aria-hidden="true" />
                  <div className={styles.hardwareContent}>
                    <span className={styles.hardwareValue}>
                      {formatBytes(data.hardware.memory_total_gb)}
                    </span>
                    <span className={styles.hardwareLabel}>{data.hardware.memory_type}</span>
                  </div>
                </div>
              )}
              {((data.hardware?.storage_total_tb ?? 0) > 0 ||
                (data.hardware?.storage_drives ?? 0) > 0) && (
                <div className={styles.hardwareItem}>
                  <HardDrive size={16} className={styles.hardwareIcon} aria-hidden="true" />
                  <div className={styles.hardwareContent}>
                    <span className={styles.hardwareValue}>
                      {(data.hardware?.storage_total_tb ?? 0).toFixed(1)} TB
                    </span>
                    <span className={styles.hardwareLabel}>
                      {data.hardware?.storage_drives ?? 0} drives
                    </span>
                  </div>
                </div>
              )}
              {(data.hardware?.gpu_count ?? 0) > 0 && (
                <div className={cn(styles.hardwareItem, styles.hardwareItemGpu)}>
                  <Cpu size={16} className={styles.hardwareIcon} aria-hidden="true" />
                  <div className={styles.hardwareContent}>
                    <span className={styles.hardwareValue}>{data.hardware.gpu_count}x GPU</span>
                    <span className={styles.hardwareLabel}>
                      {data.hardware.gpu_model || "Accelerator"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {data.os && <OsMetricsSection os={data.os} />}
          {data.gpus_telemetry && data.gpus_telemetry.length > 0 && (
            <GpuTelemetrySection gpus={data.gpus_telemetry} />
          )}
          {data.storage_drives && data.storage_drives.length > 0 && (
            <StorageDrivesSection data={data} />
          )}

          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Live Metrics</h4>
            <div className={styles.metricsGrid}>
              <div className={styles.metricItem}>
                <Zap size={16} style={{ color: "var(--primary)" }} aria-hidden="true" />
                <span className={styles.metricValue}>
                  {formatPowerWatts(data.power?.current_watts)}
                </span>
                <span className={styles.metricLabel}>Power</span>
              </div>
              <div className={styles.metricItem}>
                <Thermometer
                  size={16}
                  style={{ color: getTempColor(data.thermal?.inlet_temp_celsius) }}
                  aria-hidden="true"
                />
                <span
                  className={styles.metricValue}
                  style={{ color: getTempColor(data.thermal?.inlet_temp_celsius) }}
                >
                  {formatTempCelsius(data.thermal?.inlet_temp_celsius)}
                </span>
                <span className={styles.metricLabel}>Inlet</span>
              </div>
              <div className={styles.metricItem}>
                <Thermometer
                  size={16}
                  style={{ color: getTempColor(data.thermal?.exhaust_temp_celsius) }}
                  aria-hidden="true"
                />
                <span
                  className={styles.metricValue}
                  style={{ color: getTempColor(data.thermal?.exhaust_temp_celsius) }}
                >
                  {formatTempCelsius(data.thermal?.exhaust_temp_celsius)}
                </span>
                <span className={styles.metricLabel}>Exhaust</span>
              </div>
            </div>
          </div>

          {data.sensors && data.sensors.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Sensors</h4>
              <div className={styles.sensorsList}>
                {data.sensors.map((sensor, idx) => (
                  <div key={idx} className={styles.sensorItem}>
                    <span className={styles.sensorName}>{sensor.name}</span>
                    <span className={styles.sensorValue} data-status={sensor.status}>
                      {(sensor.value ?? 0).toFixed(1)}
                      {sensor.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recent_logs && data.recent_logs.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                <AlertTriangle size={12} style={{ color: "var(--warning)" }} aria-hidden="true" />
                Recent Alerts
              </h4>
              <div className={styles.logsList}>
                {data.recent_logs.slice(0, 2).map((log, idx) => (
                  <div key={idx} className={styles.logItem}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {data && !showLoadingState && !shouldShowError && (
        <div className={styles.footer}>
          <div className={styles.footerStreams}>
            {data.telemetry_probes ? (
              <TelemetryProbesRow probes={data.telemetry_probes} />
            ) : (
              <FreshnessBadge
                dataFreshness={data.data_freshness ?? "unknown"}
                lastTelemetryTimestamp={data.last_telemetry_timestamp}
              />
            )}
          </div>
          {onViewFullDetails ? (
            <button type="button" className={styles.viewMoreButton} onClick={onViewFullDetails}>
              <span>Details</span>
              <ExternalLink size={10} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default ServerDetailsCard;
