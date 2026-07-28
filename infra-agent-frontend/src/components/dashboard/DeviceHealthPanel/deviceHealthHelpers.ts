import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import type {
  ComponentHealth,
  LiveDeviceSensor,
} from "@/features/digitalTwin/digitalTwinApi.types";

export function getHealthIndicator(health: ComponentHealth | string | undefined | null): {
  color: string;
  icon: LucideIcon;
} {
  if (!health) return { color: "var(--muted)", icon: Info };
  switch (health) {
    case "OK":
      return { color: "var(--success)", icon: CheckCircle2 };
    case "Warning":
      return { color: "var(--warning)", icon: AlertTriangle };
    case "Critical":
      return { color: "var(--destructive)", icon: XCircle };
    default:
      return { color: "var(--muted)", icon: Info };
  }
}

export function formatBytes(gb: number | undefined | null): string {
  if (gb == null || isNaN(gb)) return "N/A";
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  return `${gb} GB`;
}

export function getTempColor(celsius: number | undefined | null): string {
  if (celsius == null || isNaN(celsius)) return "var(--muted)";
  if (celsius < 40) return "var(--success)";
  if (celsius < 60) return "var(--warning)";
  if (celsius < 80) return "#f97316";
  return "var(--destructive)";
}

export function safeNumber(
  value: number | undefined | null,
  decimals = 0,
  fallback = "N/A",
): string {
  if (value == null || isNaN(value)) return fallback;
  return value.toFixed(decimals);
}

export function safeString(value: string | undefined | null, fallback = "N/A"): string {
  return value ?? fallback;
}

export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return arr ?? [];
}

/** Filters sensors belonging to a specific drive slot (matched by name prefix). */
export function getDriveSensors(
  sensors: LiveDeviceSensor[],
  driveSlot: string,
): LiveDeviceSensor[] {
  if (!sensors || !driveSlot) return [];
  const prefix = `${driveSlot} `;
  return sensors.filter((s) => s.name.startsWith(prefix) || s.name === driveSlot);
}
