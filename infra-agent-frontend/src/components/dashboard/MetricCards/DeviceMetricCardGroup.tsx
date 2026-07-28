"use client";

import { useEffect, useMemo } from "react";
import type { ComponentType } from "react";
import {
  Activity,
  CheckCircle,
  FileText,
  Power,
  RefreshCw,
  Thermometer,
  Wifi,
  WifiOff,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useGetDeviceHealthMetricsQuery } from "@/features/metrics/deviceMetricsApi";
import type { MetricRecord } from "@/features/metrics/deviceMetricsApi.types";
import { cn } from "@/lib/utils";
import styles from "./MetricCards.module.css";
import type {
  DeviceHealthStatus,
  DeviceMetricCardGroupProps,
  HealthLevel,
} from "./MetricCards.types";

/** Health is derived only from captured events — not gauges or thresholds. */
function calculateHealthStatus(events: MetricRecord[]): DeviceHealthStatus {
  const hasRecentCriticalEvents = events.some((event) => {
    const severity = String(event.severity ?? "").toLowerCase();
    return severity === "critical" || severity === "error";
  });
  const hasRecentWarningEvents = events.some((event) => {
    const severity = String(event.severity ?? "").toLowerCase();
    return severity === "warning" || severity === "warn";
  });

  const overall: HealthLevel = hasRecentCriticalEvents
    ? "critical"
    : hasRecentWarningEvents
      ? "warning"
      : "ok";

  return { overall, powerSupply: "ok", system: "ok", temperature: "ok", hasRecentCriticalEvents };
}

function getStatusIcon(status: string) {
  switch (status?.toLowerCase()) {
    case "ok":
      return { Icon: CheckCircle, className: styles.statusOk };
    case "warning":
      return { Icon: AlertTriangle, className: styles.statusWarning };
    case "critical":
      return { Icon: XCircle, className: styles.statusCritical };
    default:
      return { Icon: Activity, className: undefined };
  }
}

function formatLastUpdated(timestamp: Date): string {
  const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return timestamp.toLocaleTimeString();
}

interface CardSpec {
  title: string;
  Icon: ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }>;
  data: MetricRecord[];
  status: string;
}

function MetricDataCard({
  deviceIp,
  title,
  Icon,
  data,
  status,
  isLoading,
}: CardSpec & { deviceIp: string; isLoading: boolean }) {
  const { Icon: StatusIcon, className: statusClassName } = getStatusIcon(status);

  return (
    <div
      className={cn(
        styles.card,
        (status === "warning" || status === "critical") && styles.cardHasAlert,
      )}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <Icon size={20} aria-hidden="true" />
          <div>
            <h4>{title}</h4>
            <span className={styles.deviceIp}>{deviceIp}</span>
          </div>
        </div>
        <div className={styles.cardStatus}>
          <span className={cn(styles.statusIndicator, statusClassName)}>
            <StatusIcon size={16} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className={styles.cardContent}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <RefreshCw size={16} className={styles.spinningIcon} aria-hidden="true" />
            <span>Loading metrics...</span>
          </div>
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No data available</span>
          </div>
        ) : (
          <div className={styles.metricsData}>
            {data.slice(0, 3).map((item, index) => (
              <div key={index} className={styles.metricItem}>
                <div className={styles.metricInfo}>
                  {item.name != null && (
                    <span className={styles.metricName}>{String(item.name)}</span>
                  )}
                  {item.message != null && (
                    <span className={styles.metricMessage}>{String(item.message)}</span>
                  )}
                  {item.status != null && (
                    <span
                      className={cn(
                        styles.metricStatus,
                        getStatusIcon(String(item.status)).className,
                      )}
                    >
                      {String(item.status)}
                    </span>
                  )}
                  {item.severity != null && (
                    <span
                      className={cn(
                        styles.metricSeverity,
                        getStatusIcon(String(item.severity)).className,
                      )}
                    >
                      {String(item.severity)}
                    </span>
                  )}
                </div>
                <div className={styles.metricValue}>
                  {typeof item.val === "number" ? (
                    <>
                      <span className={styles.value}>{item.val.toFixed(1)}</span>
                      {item.units != null && (
                        <span className={styles.units}>{String(item.units)}</span>
                      )}
                    </>
                  ) : (
                    <span className={styles.value}>{String(item.val)}</span>
                  )}
                </div>
              </div>
            ))}
            {data.length > 3 && (
              <div className={styles.moreItems}>+{data.length - 3} more items</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Fetches and renders the 4 health-metric cards (power/system/temperature/events) for one device. */
export function DeviceMetricCardGroup({
  deviceIp,
  pollingInterval,
  onHealthStatusChange,
}: DeviceMetricCardGroupProps) {
  const { data, isLoading, isFetching, isError, error, fulfilledTimeStamp, refetch } =
    useGetDeviceHealthMetricsQuery({ deviceIp, minutes: 1 }, { pollingInterval });

  const healthStatus = useMemo(() => calculateHealthStatus(data?.events ?? []), [data]);

  useEffect(() => {
    onHealthStatusChange?.(deviceIp, healthStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceIp, healthStatus.overall, healthStatus.hasRecentCriticalEvents]);

  if (!data) {
    return (
      <div className={styles.loadingCard}>
        <RefreshCw size={20} className={styles.spinningIcon} aria-hidden="true" />
        <span>Loading {deviceIp}...</span>
      </div>
    );
  }

  const errorMessage = isError
    ? error && "status" in error
      ? String(error.status)
      : "Connection error"
    : null;
  const lastUpdated = fulfilledTimeStamp ? new Date(fulfilledTimeStamp) : null;

  const cards: CardSpec[] = [
    {
      title: "Power Supply Health",
      Icon: Power,
      data: data.powerSupplyHealth,
      status: healthStatus.powerSupply,
    },
    {
      title: "System Health",
      Icon: Activity,
      data: data.systemHealth,
      status: healthStatus.system,
    },
    {
      title: "Temperature Sensors",
      Icon: Thermometer,
      data: data.temperature,
      status: healthStatus.temperature,
    },
    {
      title: "Recent Events",
      Icon: FileText,
      data: data.events,
      status: healthStatus.hasRecentCriticalEvents ? "critical" : "ok",
    },
  ];

  return (
    <>
      {cards
        .filter((c) => c.data.length > 0)
        .map((c) => (
          <MetricDataCard key={c.title} deviceIp={deviceIp} isLoading={isLoading} {...c} />
        ))}
      {errorMessage && (
        <div className={styles.errorState}>
          <WifiOff size={16} aria-hidden="true" />
          <span>{errorMessage}</span>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => refetch()}
            aria-label="Retry"
          >
            <RefreshCw size={12} aria-hidden="true" />
          </button>
        </div>
      )}
      {lastUpdated && !errorMessage && (
        <div className={styles.cardFooter}>
          <span className={styles.lastUpdated}>Updated {formatLastUpdated(lastUpdated)}</span>
          {isFetching && <Wifi size={14} className={styles.pollingIcon} aria-hidden="true" />}
        </div>
      )}
    </>
  );
}

export default DeviceMetricCardGroup;
