"use client";

import { Activity } from "lucide-react";
import { MetricCards } from "@/components/dashboard/MetricCards/MetricCards";
import { cn } from "@/lib/utils";
import styles from "./MetricsPanel.module.css";
import type { MetricsPanelProps } from "./MetricsPanel.types";

export function MetricsPanel({ deviceIps, onHealthStatusChange, className }: MetricsPanelProps) {
  return (
    <div className={cn(styles.metricsPanel, className)}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <Activity size={18} className={styles.pulseIcon} aria-hidden="true" />
          <h3>Live Infrastructure Metrics</h3>
        </div>
      </div>

      <div className={styles.panelStatus}>
        <div className={styles.statusIndicator}>
          <span className={styles.liveIndicator} aria-hidden="true" />
          <span>Live</span>
        </div>
      </div>

      <div className={styles.panelContent}>
        <MetricCards
          deviceIps={deviceIps}
          pollingInterval={30000}
          onHealthStatusChange={onHealthStatusChange}
        />
      </div>
    </div>
  );
}

export default MetricsPanel;
