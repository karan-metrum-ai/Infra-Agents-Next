"use client";

/**
 * Build always-visible HTML globe markers (detail / mini tip modes).
 *
 * Keeps DataCenterGlobe earth styling; adds demo-style popup tips. These
 * markers are rendered by react-globe.gl's `htmlElement` prop through
 * Three.js's CSS2DRenderer — real DOM `<div>`/`<button>` elements
 * positioned via CSS transforms, so (unlike `pointColor`/`ringColor`,
 * which are genuine WebGL material colors) their styling is real CSS and
 * uses design tokens, not hardcoded hex.
 *
 * Pulled forward from its real Phase-13 home (`utils/**`'s cross-cutting
 * utilities) because `DataCenterGlobe` needs it for Phase 6.
 */

import type { GlobeSite, SiteHealthStatus } from "@/components/DigitalTwin/types";
import tipStyles from "@/components/DigitalTwin/DataCenterGlobe.module.css";

export type GlobeTipMode = "detail" | "mini";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusLabel(status: SiteHealthStatus): string {
  if (status === "healthy") return "Healthy";
  if (status === "warning") return "Warning";
  if (status === "unhealthy") return "Critical";
  return "Unknown";
}

function statusClass(status: SiteHealthStatus): string {
  if (status === "healthy") return tipStyles.tipStatusHealthy;
  if (status === "warning") return tipStyles.tipStatusWarning;
  if (status === "unhealthy") return tipStyles.tipStatusCritical;
  return tipStyles.tipStatusWarning;
}

function pinColor(status: SiteHealthStatus): string {
  if (status === "healthy") return "var(--color-success)";
  if (status === "warning") return "var(--color-warning)";
  if (status === "unhealthy") return "var(--color-danger)";
  return "var(--color-text-muted)";
}

/**
 * Create a DOM marker with pin + tip for react-globe.gl htmlElement.
 */
export function buildGlobeMarkerEl(
  site: GlobeSite,
  selected: boolean,
  tipMode: GlobeTipMode,
  onSelect: (site: GlobeSite) => void,
  disableClick: boolean,
): HTMLElement {
  const health = site.healthStatus || "unknown";
  const issueCount =
    (site.incidentCounts?.critical ?? 0) +
    (site.incidentCounts?.warning ?? 0) +
    (site.incidentCounts?.unknown ?? 0);
  const hasIssues = issueCount > 0 || Boolean(site.issueSummary);
  const util = site.utilization;

  const root = document.createElement("button");
  root.type = "button";
  root.className = [
    tipStyles.marker,
    selected ? tipStyles.markerSelected : "",
    hasIssues ? tipStyles.markerAlert : "",
  ]
    .filter(Boolean)
    .join(" ");
  root.setAttribute("aria-label", site.name);
  if (disableClick) {
    root.style.cursor = "default";
  }

  const pin = document.createElement("span");
  pin.className = tipStyles.markerPin;
  pin.style.background = pinColor(health);
  root.appendChild(pin);

  if (hasIssues) {
    const pulse = document.createElement("span");
    pulse.className = tipStyles.markerPulse;
    pulse.style.borderColor = pinColor(health);
    root.appendChild(pulse);
  }

  const tip = document.createElement("div");

  if (tipMode === "mini") {
    tip.className = [tipStyles.markerTipMini, hasIssues ? tipStyles.markerTipMiniAlert : ""]
      .filter(Boolean)
      .join(" ");
    tip.textContent = String(issueCount);
  } else {
    const issueText =
      site.issueSummary?.trim() ||
      (issueCount > 0
        ? `${issueCount} open issue${issueCount === 1 ? "" : "s"} requiring attention.`
        : "");
    const issueBlock = issueText
      ? `
      <div class="${tipStyles.tipIssue}">
        <em>Detailed Issue</em>
        <p>${escapeHtml(issueText)}</p>
      </div>`
      : "";

    tip.className = tipStyles.markerTip;
    tip.innerHTML = `
      <div class="${tipStyles.tipHeader}">
        <div class="${tipStyles.tipTitles}">
          <div class="${tipStyles.tipName}">${escapeHtml(site.name)}</div>
          <div class="${tipStyles.tipAddr}">${escapeHtml(site.address || site.regionName || "")}</div>
        </div>
        <span class="${tipStyles.tipStatus} ${statusClass(health)}">${statusLabel(health)}</span>
      </div>
      <div class="${tipStyles.tipGrid}">
        <span><em>Compute</em><b>${util?.compute ?? 0}</b></span>
        <span><em>Assets</em><b>${site.deviceCount}</b></span>
        <span><em>Storage</em><b>${util?.storage ?? 0}</b></span>
        <span><em>Network</em><b>${util?.network ?? 0}</b></span>
      </div>
      ${issueBlock}
    `;
  }

  root.appendChild(tip);

  root.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!disableClick) onSelect(site);
  });

  return root;
}
