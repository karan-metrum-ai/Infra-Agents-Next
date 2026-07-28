"use client";

/**
 * Top-left "Back to Globe" pill + site info card + contextual hint panel
 * shown over the interior/exterior 3D view.
 */

import { ArrowLeft } from "lucide-react";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinSiteHeaderProps } from "./DataCenterDigitalTwin.types";

export function DigitalTwinSiteHeader({
  regionName,
  address,
  viewMode,
  currentFloor,
  totalFloors,
  showContent,
  onBackToGlobe,
}: DigitalTwinSiteHeaderProps) {
  return (
    <div
      className={`${styles.topHeaderRow} ${showContent ? styles.topHeaderRowVisible : styles.topHeaderRowHidden}`}
    >
      <div className={styles.backButtonCluster}>
        <button type="button" onClick={onBackToGlobe} className={styles.backButton}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Globe
        </button>

        <div className={styles.siteInfoCluster}>
          <div className={styles.siteInfoCard}>
            <h1 className={styles.siteInfoTitle}>{regionName}</h1>
            <p className={styles.siteInfoAddress}>{address}</p>
          </div>

          <div className={styles.hintPanel}>
            <p className={styles.hintText}>
              {viewMode === "interior"
                ? `Floor ${currentFloor} of ${totalFloors}  ·  Click rack to see details  ·  Scroll to zoom`
                : "Click on a floor to enter  ·  Scroll to zoom  ·  Drag to rotate"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
