"use client";

/**
 * Right-hand "Data Centers" list panel for `DataCenterGlobe`: search box +
 * per-site cards (health ring, CPU/GPU utilization bars, power draw,
 * per-role footer breakdown). Owns its own search-query UI state since
 * that's local interaction state, not server data.
 */

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Cable,
  Cpu,
  HardDrive,
  Microchip,
  Monitor,
  Search,
  Zap,
} from "lucide-react";
import type { GlobeSite } from "./types";
import { formatPowerWatts } from "./globeHealthTheme";
import styles from "./DataCenterGlobe.module.css";

interface GlobeSiteListPanelProps {
  sites: GlobeSite[];
  onSiteClick: (site: GlobeSite) => void;
  hideNavigation: boolean;
  selectedSiteId: number | null;
  isLoaded: boolean;
}

export function GlobeSiteListPanel({
  sites,
  onSiteClick,
  hideNavigation,
  selectedSiteId,
  isLoaded,
}: GlobeSiteListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.regionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={`${styles.siteListPanel} ${hideNavigation ? styles.siteListPanelNavHidden : ""} ${
        isLoaded ? styles.panelEnterVisible : styles.panelEnterHidden
      }`}
    >
      <div className={styles.siteListHeader}>
        <div className={styles.panelTitleRow}>
          Data Centers
          <span className={styles.countBadge}>{sites.length}</span>
        </div>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search locations..."
            aria-label="Search data center locations"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>
      <div className={styles.siteListBody}>
        {filteredSites.map((site) => {
          const healthStatus = site.healthStatus || "unknown";
          const isUnhealthy = healthStatus === "unhealthy";
          const isWarning = healthStatus === "warning";
          const isSelected = selectedSiteId != null && site.id === selectedSiteId;
          const critical = site.incidentCounts?.critical ?? 0;
          const warning = site.incidentCounts?.warning ?? 0;
          const util = site.utilization;
          const inv = site.inventory;
          const healthPct = Math.round(site.healthPercent ?? 0);
          const powerWatts = site.powerWattsTotal ?? site.powerWattsAvg ?? 0;

          return (
            <button
              key={site.id}
              type="button"
              onClick={() => onSiteClick(site)}
              className={`${styles.siteItem} ${isUnhealthy ? styles.siteItemUnhealthy : ""} ${
                isWarning ? styles.siteItemWarning : ""
              } ${isSelected ? styles.siteItemSelected : ""}`}
            >
              {/* Top section: Name + Health ring */}
              <div className={styles.cardTop}>
                <div className={styles.cardTopLeft}>
                  <div className={styles.siteName}>{site.name}</div>
                  <div className={styles.alertRow}>
                    <span
                      className={`${styles.alertBadge} ${critical > 0 ? styles.alertCritical : styles.alertMuted}`}
                    >
                      <AlertOctagon size={12} aria-hidden="true" />
                      {critical}
                    </span>
                    <span
                      className={`${styles.alertBadge} ${warning > 0 ? styles.alertWarning : styles.alertMuted}`}
                    >
                      <AlertTriangle size={12} aria-hidden="true" />
                      {warning}
                    </span>
                  </div>
                  <div className={styles.invRow}>
                    <span className={styles.invItem}>
                      <Monitor size={12} aria-hidden="true" />
                      {inv?.compute ?? 0}
                    </span>
                    <span className={styles.invItem}>
                      <Cable size={12} aria-hidden="true" />
                      {inv?.network ?? 0}
                    </span>
                    <span className={styles.invItem}>
                      <HardDrive size={12} aria-hidden="true" />
                      {inv?.storage ?? 0}
                    </span>
                  </div>
                </div>
                <div className={styles.healthRing} aria-label={`Health ${healthPct}%`}>
                  <svg viewBox="0 0 48 48" className={styles.ringSvg} aria-hidden="true">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      strokeWidth="4"
                      className={styles.ringTrack}
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      strokeWidth="4"
                      className={styles.ringArc}
                      strokeDasharray={`${(healthPct / 100) * 125.66} 125.66`}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                    />
                  </svg>
                  <span className={styles.ringValue}>{healthPct}%</span>
                </div>
              </div>

              {/* Metrics section */}
              <div className={styles.metricsSection}>
                <div className={styles.barRow}>
                  <span className={styles.barIcon}>
                    <Cpu size={13} aria-hidden="true" />
                  </span>
                  <span className={styles.barLabel}>CPU</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${styles.barCpu}`}
                      style={{ width: `${Math.min(util?.cpu ?? 0, 100)}%` }}
                    />
                  </div>
                  <span className={`${styles.barValue} ${styles.barValueCpu}`}>
                    {util?.cpu ?? 0}%
                  </span>
                </div>
                <div className={styles.barRow}>
                  <span className={styles.barIcon}>
                    <Microchip size={13} aria-hidden="true" />
                  </span>
                  <span className={styles.barLabel}>GPU</span>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${styles.barGpu}`}
                      style={{ width: `${Math.min(util?.gpu ?? 0, 100)}%` }}
                    />
                  </div>
                  <span className={`${styles.barValue} ${styles.barValueGpu}`}>
                    {util?.gpu ?? 0}%
                  </span>
                </div>
                <div className={styles.powerRow}>
                  <span className={styles.barIcon}>
                    <Zap size={13} aria-hidden="true" />
                  </span>
                  <span className={styles.barLabel}>Power</span>
                  <span className={styles.powerValue}>{formatPowerWatts(powerWatts)}</span>
                </div>
              </div>

              {/* Footer: per-role power breakdown */}
              <div className={styles.cardFooter}>
                <span className={styles.footerItem}>
                  <i className={styles.dotCompute} aria-hidden="true" />
                  Compute {util?.compute ?? 0}%
                </span>
                <span className={styles.footerItem}>
                  <i className={styles.dotNetwork} aria-hidden="true" />
                  Network {util?.network ?? 0}%
                </span>
                <span className={styles.footerItem}>
                  <i className={styles.dotStorage} aria-hidden="true" />
                  Storage {util?.storage ?? 0}%
                </span>
              </div>
            </button>
          );
        })}
        {filteredSites.length === 0 && (
          <div className={styles.emptyState}>No data centers found</div>
        )}
      </div>
    </div>
  );
}
