import { CheckCircle2, AlertTriangle, XCircle, Activity, type LucideIcon } from "lucide-react";

export function formatPowerWatts(value?: number | null): string {
  if (value == null) return "N/A";
  return `${value.toFixed(0)}W`;
}

export function formatTempCelsius(value?: number | null): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}°C`;
}

export function formatBytes(gb: number | null | undefined): string {
  const val = gb ?? 0;
  if (val >= 1024) return `${(val / 1024).toFixed(1)} TB`;
  return `${val.toFixed(0)} GB`;
}

export function getTempColor(celsius: number | null | undefined): string {
  const val = celsius ?? 0;
  if (val < 35) return "var(--success)";
  if (val < 50) return "#84cc16";
  if (val < 65) return "var(--warning)";
  if (val < 80) return "#f97316";
  return "var(--destructive)";
}

export function formatBytesPerSec(bps: number | null | undefined): string {
  if (bps == null) return "N/A";
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  if (bps < 1024 * 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bps / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
}

export function formatBytesGib(bytes: number | null | undefined): string {
  if (bytes == null) return "N/A";
  const gib = bytes / 1024 ** 3;
  if (gib >= 1) return `${gib.toFixed(1)} GiB`;
  const mib = bytes / 1024 ** 2;
  return `${mib.toFixed(0)} MiB`;
}

export function formatUptimeSeconds(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export interface HealthIndicator {
  color: string;
  bgColor: string;
  icon: LucideIcon;
  label: string;
}

export function getHealthIndicator(status: string): HealthIndicator {
  switch (status.toLowerCase()) {
    case "healthy":
    case "ok":
    case "online":
      return {
        color: "var(--success)",
        bgColor: "rgba(34, 197, 94, 0.15)",
        icon: CheckCircle2,
        label: "Healthy",
      };
    case "warning":
    case "degraded":
      return {
        color: "var(--warning)",
        bgColor: "rgba(245, 158, 11, 0.15)",
        icon: AlertTriangle,
        label: "Warning",
      };
    case "unhealthy":
    case "critical":
    case "offline":
      return {
        color: "var(--destructive)",
        bgColor: "rgba(239, 68, 68, 0.15)",
        icon: XCircle,
        label: "Critical",
      };
    default:
      return {
        color: "var(--muted)",
        bgColor: "rgba(107, 114, 128, 0.15)",
        icon: Activity,
        label: "Unknown",
      };
  }
}

export interface DeviceSensor {
  name: string;
  value: number | null;
  unit: string;
  status: string;
}

/** Filters sensors belonging to a specific drive slot (matched by name prefix). */
export function getDriveSensors(
  sensors: DeviceSensor[] | undefined,
  driveSlot: string,
): DeviceSensor[] {
  if (!sensors || !driveSlot) return [];
  const prefix = `${driveSlot} `;
  return sensors.filter((s) => s.name.startsWith(prefix) || s.name === driveSlot);
}
