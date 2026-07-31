/**
 * Centralized formatters for the Sandbox Panel UI.
 *
 * Every sandbox component must format durations, bytes, percentages,
 * milliseconds, and timestamps through these helpers so the display
 * is consistent across the panel.
 *
 * Ported verbatim from the Vite app's `lib/formatters.ts` (Phase 13 scope,
 * pulled forward — Phase 9's Sandbox metric tabs are hard dependents).
 */

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Format a duration expressed in seconds as a human-readable string.
 *
 * Returns:
 *   < 1s        -> "850ms"
 *   < 60s       -> "12.4s"
 *   < 60m       -> "2m 16s"
 *   >= 60m      -> "1h 03m 12s"
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "--";
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/**
 * Format a millisecond value, automatically upgrading to seconds
 * once it crosses 1000ms.
 */
export function formatMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "--";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 1) return `${ms.toFixed(2)}ms`;
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms)}ms`;
}

/**
 * Format a byte count using binary units (KiB / MiB / GiB).
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "--";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
}

/**
 * Format a 0..1 ratio as a percentage with 1 decimal point.
 * Pass `alreadyPct=true` for values already in 0..100 range.
 */
export function formatPct(value: number | null | undefined, alreadyPct = false): string {
  if (value == null || Number.isNaN(value)) return "--";
  const pct = alreadyPct ? value : value * 100;
  return `${pct.toFixed(1)}%`;
}

/**
 * Format an integer with locale grouping.
 */
export function formatInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return Math.round(n).toLocaleString();
}

/**
 * Format a generic number with up to 4 fraction digits and grouping.
 */
export function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "--";
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/**
 * Format a QPS value with 2 fraction digits, suffix "qps".
 */
export function formatQps(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-- qps";
  return `${n.toFixed(2)} qps`;
}

/**
 * Absolute timestamp in user locale, including date and seconds.
 */
export function formatAbsTime(iso: string | number | null | undefined): string {
  if (iso == null) return "--";
  const d = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Relative time vs. now, e.g. "5 minutes ago" or "in 3 hours".
 */
export function formatRelTime(iso: string | number | null | undefined): string {
  if (iso == null) return "--";
  const d = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return RTF.format(diffSec, "second");
  if (abs < 3600) return RTF.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return RTF.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return RTF.format(Math.round(diffSec / 86400), "day");
  if (abs < 31536000) return RTF.format(Math.round(diffSec / 2592000), "month");
  return RTF.format(Math.round(diffSec / 31536000), "year");
}

/**
 * Compute the seconds elapsed between two ISO timestamps, returning
 * null when either side is missing or unparseable.
 */
export function diffSeconds(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return (b - a) / 1000;
}

/**
 * Truncate the middle of a long string and keep the ends visible.
 * Useful for run IDs in compact contexts.
 */
export function truncateMid(s: string, head = 8, tail = 4): string {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/**
 * Turn a snake_case or kebab-case field name into a human label.
 */
export function humanize(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
