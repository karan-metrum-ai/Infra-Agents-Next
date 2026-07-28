/**
 * Health-status color/theme lookups shared by `DataCenterGlobe` and its
 * marker/tooltip builders.
 *
 * `HEALTH_COLORS` and `getRingGradient` feed react-globe.gl's `pointColor`/
 * `ringColor` props, which react-globe.gl hands straight to Three.js
 * point/ring materials — real WebGL material colors, not DOM/CSS, so they
 * stay hardcoded per the three.js-material exception (rendered through a
 * canvas, never painted by the browser's CSS engine).
 *
 * `STATUS_THEME` feeds inline `style="color: ..."` attributes inside raw
 * HTML strings handed to `pointLabel` (rendered into a real floating
 * tooltip `<div>` by the browser), so those values are CSS custom
 * properties and resolve through the normal cascade.
 */

import type { SiteHealthStatus } from "./types";

export const HEALTH_COLORS: Record<SiteHealthStatus, string> = {
  healthy: "#22c55e",
  warning: "#f59e0b",
  unhealthy: "#ef4444",
  unknown: "#6b7280",
};

export interface SiteStatusTheme {
  label: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  issueBg: string;
  issueBorder: string;
  issueText: string;
}

/** Human-readable status + theme tokens for the hover popover. */
export const STATUS_THEME: Record<SiteHealthStatus, SiteStatusTheme> = {
  healthy: {
    label: "Operational",
    accent: "var(--color-success)",
    badgeBg: "color-mix(in oklch, var(--color-success) 20%, transparent)",
    badgeText: "var(--color-success-fg)",
    issueBg: "color-mix(in oklch, var(--color-success) 12%, transparent)",
    issueBorder: "color-mix(in oklch, var(--color-success) 35%, transparent)",
    issueText: "var(--color-success-fg)",
  },
  warning: {
    label: "Attention",
    accent: "var(--color-warning)",
    badgeBg: "color-mix(in oklch, var(--warning-700) 40%, transparent)",
    badgeText: "var(--warning-200)",
    issueBg: "color-mix(in oklch, var(--warning-900) 40%, transparent)",
    issueBorder: "color-mix(in oklch, var(--color-warning) 40%, transparent)",
    issueText: "var(--warning-100)",
  },
  unhealthy: {
    label: "Critical",
    accent: "var(--color-danger)",
    badgeBg: "color-mix(in oklch, var(--danger-700) 55%, transparent)",
    badgeText: "var(--color-text-primary)",
    issueBg: "color-mix(in oklch, var(--danger-900) 40%, transparent)",
    issueBorder: "color-mix(in oklch, var(--color-danger) 45%, transparent)",
    issueText: "var(--danger-200)",
  },
  unknown: {
    label: "Unknown",
    accent: "var(--color-text-muted)",
    badgeBg: "color-mix(in oklch, var(--neutral-600) 45%, transparent)",
    badgeText: "var(--neutral-200)",
    issueBg: "color-mix(in oklch, var(--neutral-700) 40%, transparent)",
    issueBorder: "color-mix(in oklch, var(--color-text-muted) 35%, transparent)",
    issueText: "var(--neutral-300)",
  },
};

/** Ring gradient from solid center to transparent edge (WebGL ring material). */
export function getRingGradient(status: SiteHealthStatus): string[] {
  const rgba: Record<SiteHealthStatus, string[]> = {
    healthy: ["rgba(34, 197, 94, 0.5)", "rgba(34, 197, 94, 0)"],
    warning: ["rgba(245, 158, 11, 0.55)", "rgba(245, 158, 11, 0)"],
    unhealthy: ["rgba(239, 68, 68, 0.6)", "rgba(239, 68, 68, 0)"],
    unknown: ["rgba(148, 163, 184, 0.4)", "rgba(148, 163, 184, 0)"],
  };
  return rgba[status];
}

/** Escape untrusted strings before embedding in HTML templates. */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatPowerWatts(watts: number): string {
  if (!Number.isFinite(watts) || watts <= 0) return "0 W";
  if (watts >= 1000) {
    const kw = watts / 1000;
    return `${kw >= 10 ? kw.toFixed(0) : kw.toFixed(1)} kW`;
  }
  return `${Math.round(watts)} W`;
}
