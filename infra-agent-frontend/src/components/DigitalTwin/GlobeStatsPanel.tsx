/**
 * Bottom-left totals strip for `DataCenterGlobe`: site / device / GPU
 * counts. Pure display, no interaction or hooks of its own.
 */

import type { GlobeSite } from "./types";
import styles from "./DataCenterGlobe.module.css";

interface GlobeStatsPanelProps {
  sites: GlobeSite[];
  isLoaded: boolean;
}

export function GlobeStatsPanel({ sites, isLoaded }: GlobeStatsPanelProps) {
  return (
    <div
      className={`${styles.statsPanel} ${isLoaded ? styles.panelEnterBottomVisible : styles.panelEnterBottomHidden}`}
    >
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{sites.length}</div>
          <div className={styles.statLabel}>Data Centers</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValueCyan}>
            {sites.reduce((a, s) => a + s.deviceCount, 0).toLocaleString()}
          </div>
          <div className={styles.statLabel}>Total Devices</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValueGreen}>
            {sites.reduce((a, s) => a + s.gpuCount, 0).toLocaleString()}
          </div>
          <div className={styles.statLabel}>Total GPUs</div>
        </div>
      </div>
    </div>
  );
}
