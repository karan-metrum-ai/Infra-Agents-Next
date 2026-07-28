/**
 * Top-right "Building Stats" glass panel: totals plus the current floor's
 * rack/server counts.
 */

import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinBuildingStatsProps } from "./DataCenterDigitalTwin.types";

export function DigitalTwinBuildingStats({
  totalFloors,
  totalRacks,
  totalServers,
  currentFloor,
  floorRackCount,
  floorServerCount,
  showContent,
}: DigitalTwinBuildingStatsProps) {
  return (
    <div
      className={`${styles.buildingStatsPanel} ${showContent ? styles.buildingStatsVisible : styles.buildingStatsHidden}`}
    >
      <div className={styles.statsHeaderRow}>
        <div className={styles.statsHeaderDot} aria-hidden="true" />
        Building Stats
      </div>
      <div className={styles.statsBody}>
        <div className={styles.statsRow}>
          <span className={styles.statsLabel}>Total Floors</span>
          <span className={styles.statsValue}>{totalFloors}</span>
        </div>
        <div className={styles.statsRow}>
          <span className={styles.statsLabel}>Total Racks</span>
          <span className={styles.statsValue}>{totalRacks}</span>
        </div>
        <div className={styles.statsRow} style={{ marginBottom: 0 }}>
          <span className={styles.statsLabel}>Total Servers</span>
          <span className={styles.statsValue}>{totalServers}</span>
        </div>

        <div className={styles.statsDivider}>
          <div className={styles.statsRow}>
            <span className={styles.statsLabel}>Current Floor</span>
            <span className={styles.currentFloorValue}>F{currentFloor}</span>
          </div>
          <div className={styles.statsRow}>
            <span className={styles.statsLabel}>Floor Racks</span>
            <span className={styles.statsValue}>{floorRackCount}</span>
          </div>
          <div className={styles.statsRow} style={{ marginBottom: 0 }}>
            <span className={styles.statsLabel}>Floor Servers</span>
            <span className={styles.statsValue}>{floorServerCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
