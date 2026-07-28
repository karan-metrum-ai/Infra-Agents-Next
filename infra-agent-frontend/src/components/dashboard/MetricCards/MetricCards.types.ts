import type { MetricRecord } from "@/features/metrics/deviceMetricsApi.types";

export type HealthLevel = "ok" | "warning" | "critical" | "unknown";

export interface DeviceHealthStatus {
  overall: HealthLevel;
  powerSupply: HealthLevel;
  system: HealthLevel;
  temperature: HealthLevel;
  hasRecentCriticalEvents: boolean;
}

export interface MetricCardsProps {
  deviceIps: string[];
  className?: string;
  pollingInterval?: number;
  onHealthStatusChange?: (healthStatus: Record<string, DeviceHealthStatus>) => void;
}

export interface DeviceMetricCardGroupProps {
  deviceIp: string;
  pollingInterval: number;
  onHealthStatusChange?: (deviceIp: string, status: DeviceHealthStatus) => void;
}

export type { MetricRecord };
