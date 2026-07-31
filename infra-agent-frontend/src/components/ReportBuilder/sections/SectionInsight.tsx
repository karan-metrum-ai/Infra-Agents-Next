/**
 * Anomaly callouts / narrative insight text shown under a section's chart or
 * KPI strip. Ported from the Vite app's `components/ReportBuilder/sections/SectionInsight.tsx`.
 * Pure presentational — no hooks/interactivity, no "use client" needed.
 */

import type {
  SectionPreviewAnomaly,
  SectionPreviewInsight,
} from "@/features/reports/reportsApi.types";
import styles from "./SectionInsight.module.css";

interface SectionInsightProps {
  narrative?: string | null;
  insight?: SectionPreviewInsight | null;
  showPlaceholderWhenEmpty?: boolean;
}

const CRIT_SEVERITIES = new Set(["crit", "critical", "high", "severe", "error", "fatal"]);

function anomalySeverityClass(severity?: string): string {
  const value = (severity || "warn").toLowerCase();
  return CRIT_SEVERITIES.has(value) ? styles.anomalyCalloutCrit : styles.anomalyCalloutWarn;
}

function anomalyBadgeLabel(severity?: string): string {
  const value = (severity || "warn").toLowerCase();
  return CRIT_SEVERITIES.has(value) ? "CRIT" : "WARN";
}

export function SectionInsight({
  narrative,
  insight,
  showPlaceholderWhenEmpty = false,
}: SectionInsightProps) {
  const anomalies = insight?.anomalies ?? [];
  const callout = insight?.callout;
  const hasContent = Boolean(narrative) || anomalies.length > 0 || Boolean(callout);

  if (!hasContent && showPlaceholderWhenEmpty) {
    return (
      <div className={styles.analysisGroup}>
        <div className={`${styles.insight} ${styles.insightMuted}`}>
          <span className={styles.insightTag}>Insight</span>
          <span className={styles.insightBody}>
            Report agent analysis for this section appears here.
          </span>
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return null;
  }

  return (
    <div className={styles.analysisGroup}>
      {narrative ? (
        <div className={styles.insight}>
          <span className={styles.insightTag}>Insight</span>
          <span className={styles.insightBody}>{narrative}</span>
        </div>
      ) : null}
      {anomalies.map((anom: SectionPreviewAnomaly, index) => (
        <div
          key={`${anom.device || "device"}-${index}`}
          className={`${styles.anomalyCallout} ${anomalySeverityClass(anom.severity)}`}
        >
          <span className={styles.anomalyBadge}>{anomalyBadgeLabel(anom.severity)}</span>
          {anom.device ? <span className={styles.anomalyDevice}>{anom.device}</span> : null}
          {anom.detail ? <span className={styles.anomalyDetail}>{anom.detail}</span> : null}
        </div>
      ))}
      {callout ? <div className={styles.calloutHighlight}>{callout}</div> : null}
    </div>
  );
}
