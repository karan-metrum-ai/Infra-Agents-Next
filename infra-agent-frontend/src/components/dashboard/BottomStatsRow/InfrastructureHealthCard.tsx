"use client";

import { useState } from "react";
import { Server, ServerOff, ShieldOff } from "lucide-react";
import type { CommandCenterInfrastructureHealthResponse } from "@/features/infrastructure/infrastructureApi.types";
import { cn } from "@/lib/utils";
import { Delta } from "./Delta";
import { HealthDonut } from "./HealthDonut";
import { PanelEmpty, PanelLoading } from "./PanelStates";
import { formatKpiValue } from "./commandCenterFormatters";
import styles from "./BottomStatsRow.module.css";
import type { HealthSegmentKey } from "./BottomStatsRow.types";

interface InfrastructureHealthCardProps {
  infraHealth?: CommandCenterInfrastructureHealthResponse | null;
  isLoading?: boolean;
  hasError?: boolean;
}

const LEGEND_ROWS = [
  { key: "healthy" as const, label: "Healthy", dot: "dotHealthy" as const },
  { key: "warning" as const, label: "Warning", dot: "dotWarning" as const },
  { key: "critical" as const, label: "Critical", dot: "dotCritical" as const, critical: true },
];

export function InfrastructureHealthCard({
  infraHealth,
  isLoading,
  hasError,
}: InfrastructureHealthCardProps) {
  const [healthActive, setHealthActive] = useState<HealthSegmentKey | null>(null);

  const nodes = infraHealth?.nodes;
  const totalNodes = infraHealth?.total_nodes ?? 0;
  const kpis = infraHealth?.kpis;
  const healthyCount = nodes?.healthy ?? 0;
  const warningCount = nodes?.warning ?? 0;
  const criticalCount = nodes?.critical ?? 0;
  const knownTotal = healthyCount + warningCount + criticalCount;
  const overallPct = knownTotal > 0 ? (healthyCount / knownTotal) * 100 : 0;

  const toggleHealth = (key: HealthSegmentKey) =>
    setHealthActive((prev) => (prev === key ? null : key));
  const nodePct = (count: number) =>
    knownTotal > 0 ? ((count / knownTotal) * 100).toFixed(1) : "0.0";
  const counts = { healthy: healthyCount, warning: warningCount, critical: criticalCount };

  return (
    <div className={`${styles.card} ${styles.cardOverflowVisible}`}>
      <div className={styles.cardHeader}>
        <Server size={14} aria-hidden="true" />
        <span>Infrastructure Health</span>
        <span className={styles.nodesBadge}>{totalNodes} Nodes</span>
      </div>
      {hasError ? (
        <PanelEmpty
          icon={<ServerOff size={18} />}
          title="Could not load health data"
          subtitle="Service may be temporarily unavailable"
        />
      ) : isLoading && !infraHealth ? (
        <PanelLoading message="Loading health..." />
      ) : !infraHealth ? (
        <PanelEmpty
          icon={<ShieldOff size={18} />}
          title="No health data"
          subtitle="No monitored nodes detected"
        />
      ) : (
        <>
          <div className={styles.uptimeBody}>
            <HealthDonut
              healthy={healthyCount}
              warning={warningCount}
              critical={criticalCount}
              overallPct={overallPct}
              activeKey={healthActive}
              onSelect={setHealthActive}
            />
            <div className={styles.uptimeBreakdown}>
              {LEGEND_ROWS.map((row) => (
                <button
                  type="button"
                  key={row.key}
                  className={cn(
                    styles.legendRow,
                    styles.glowButton,
                    styles.healthLegendRow,
                    "critical" in row && row.critical && styles.uptimeRowCritical,
                    healthActive === row.key && styles.legendGlow,
                    healthActive !== null && healthActive !== row.key && styles.legendDimmed,
                  )}
                  aria-pressed={healthActive === row.key}
                  onClick={() => toggleHealth(row.key)}
                >
                  <i className={styles[row.dot]} aria-hidden="true" />
                  <span className={styles.uptimeLabel}>
                    {row.label} <b>{counts[row.key]}</b>
                  </span>
                  <span className={styles.uptimePct}>{nodePct(counts[row.key])}%</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.metricCell}>
              <span className={styles.metricLabel}>Uptime</span>
              <span className={styles.metricValue}>
                {formatKpiValue(kpis?.uptime.value ?? 0, kpis?.uptime.unit ?? "percent")}{" "}
                <Delta value={kpis?.uptime.trend ?? 0} suffix="%" />
              </span>
            </div>
            <div className={styles.metricCell}>
              <span className={styles.metricLabel}>MTTR</span>
              <span className={styles.metricValue}>
                {formatKpiValue(kpis?.mttr.value ?? 0, kpis?.mttr.unit ?? "minutes")}{" "}
                <Delta value={kpis?.mttr.trend ?? 0} invert suffix="m" />
              </span>
            </div>
            <div className={styles.metricCell}>
              <span className={styles.metricLabel}>SLA</span>
              <span className={styles.metricValue}>
                {formatKpiValue(kpis?.sla.value ?? 0, kpis?.sla.unit ?? "percent")}{" "}
                <Delta value={kpis?.sla.trend ?? 0} suffix="%" />
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default InfrastructureHealthCard;
