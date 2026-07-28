/**
 * Builds the raw HTML hover popover shown by react-globe.gl's `pointLabel`
 * (point-mode tooltips, non-persistent). Rendered outside React's tree
 * into a floating tooltip `<div>`, so CSS-module class names are read out
 * of `styles` and interpolated as literal strings rather than applied via
 * JSX `className` — the same technique `globeMarkerHtml.ts` uses for the
 * always-visible marker tips.
 */

import type { GlobeSite, SiteHealthStatus } from "./types";
import { escapeHtml, STATUS_THEME, type SiteStatusTheme } from "./globeHealthTheme";
import styles from "./DataCenterGlobe.module.css";

/** Primary content block: alert, ok state, or nothing. */
function buildStatusMessageHtml(
  site: GlobeSite,
  healthStatus: SiteHealthStatus,
  theme: SiteStatusTheme,
): string {
  if (site.issueSummary) {
    const issueLabel = healthStatus === "unhealthy" ? "Active incident" : "Needs review";
    return `
      <div class="${styles.sitePopoverIssue}" style="
        --issue-accent: ${theme.accent};
        background: ${theme.issueBg};
        border: 1px solid ${theme.issueBorder};
        border-left-width: 3px;
      ">
        <span class="${styles.sitePopoverIssueLabel}" style="color: ${theme.accent};">
          ${issueLabel}
        </span>
        <p class="${styles.sitePopoverIssueText}" style="color: ${theme.issueText};">
          ${escapeHtml(site.issueSummary)}
        </p>
      </div>
    `;
  }

  if (healthStatus === "healthy") {
    return `<p class="${styles.sitePopoverOk}">All systems operational</p>`;
  }

  return "";
}

/** Build the site hover panel (scannable hierarchy, accessible contrast). */
export function buildSiteTooltipHtml(
  site: GlobeSite,
  healthStatus: SiteHealthStatus,
  disableMarkerClick: boolean,
): string {
  const theme = STATUS_THEME[healthStatus];
  const statusMessageHtml = buildStatusMessageHtml(site, healthStatus, theme);

  const badgeHtml =
    healthStatus !== "unknown"
      ? `
        <span class="${styles.sitePopoverBadge}" style="
          background: ${theme.badgeBg};
          color: ${theme.badgeText};
        ">${escapeHtml(theme.label)}</span>
      `
      : "";

  const footerHtml = !disableMarkerClick
    ? `
      <div class="${styles.sitePopoverFooter}">
        <span>Open site</span>
        <span aria-hidden="true"> &rsaquo;</span>
      </div>
    `
    : "";

  return `
    <div class="${styles.sitePopover}">
      <div class="${styles.sitePopoverStripe}" style="background: ${theme.accent};"></div>
      <div class="${styles.sitePopoverMain}">
        <header class="${styles.sitePopoverHead}">
          <h3 class="${styles.sitePopoverTitle}">${escapeHtml(site.name)}</h3>
          ${badgeHtml}
        </header>
        ${statusMessageHtml}
        <p class="${styles.sitePopoverLocation}">${escapeHtml(site.address)}</p>
        <div class="${styles.sitePopoverMetrics}">
          <div class="${styles.sitePopoverMetric}">
            <span class="${styles.sitePopoverMetricValue}">${site.rackCount}</span>
            <span class="${styles.sitePopoverMetricLabel}">Racks</span>
          </div>
          <div class="${styles.sitePopoverMetric}">
            <span class="${styles.sitePopoverMetricValue}">${site.deviceCount}</span>
            <span class="${styles.sitePopoverMetricLabel}">Devices</span>
          </div>
          <div class="${styles.sitePopoverMetric}">
            <span class="${styles.sitePopoverMetricValue}">${site.gpuCount}</span>
            <span class="${styles.sitePopoverMetricLabel}">GPUs</span>
          </div>
        </div>
        ${footerHtml}
      </div>
      <div class="${styles.sitePopoverCaret}"></div>
    </div>
  `;
}
