import type { DeviceHealthStatus } from "@/components/dashboard/MetricCards/MetricCards.types";

export interface MetricsPanelProps {
  /** Device IPs to show live metrics for. Onboarding (a later phase) is what populates this list. */
  deviceIps: string[];
  onHealthStatusChange?: (healthStatus: Record<string, DeviceHealthStatus>) => void;
  className?: string;
}
