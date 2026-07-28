export function segmentGlow(color: string): string {
  return `drop-shadow(0 0 3px ${color})`;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(ts)) return iso;
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatKpiValue(value: number, unit: "percent" | "minutes" | "count"): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "minutes") return `${Math.round(value)}m`;
  return String(Math.round(value));
}

export function incidentPriorityMeta(
  priority: string | null | undefined,
  styles: Record<string, string>,
): { label: string; className: string } {
  const key = (priority ?? "").toLowerCase().trim();
  if (
    key === "high" ||
    key === "critical" ||
    key === "urgent" ||
    key === "1" ||
    key === "2" ||
    key.startsWith("1 ") ||
    key.startsWith("2 ")
  ) {
    return { label: "High", className: styles.tagHigh };
  }
  if (
    key === "low" ||
    key === "planning" ||
    key === "4" ||
    key === "5" ||
    key.startsWith("4 ") ||
    key.startsWith("5 ")
  ) {
    return { label: "Low", className: styles.tagLow };
  }
  return { label: "Medium", className: styles.tagMedium };
}
