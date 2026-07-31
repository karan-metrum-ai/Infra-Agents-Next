"use client";

/**
 * Stat-value row with trend arrows, shown inside FigureCard. Ported from the
 * Vite app's `components/ReportBuilder/sections/KpiStrip.tsx`. Marked
 * "use client": the editable variant attaches a real onClick handler
 * (remove-stat button).
 */

import { X } from "lucide-react";
import type { SectionPreviewStats } from "@/features/reports/reportsApi.types";
import { displayStatLabel, resolveSectionStats, type ReportSection } from "../reportSchema.types";
import styles from "./KpiStrip.module.css";

const STAT_LABELS: Record<string, string> = {
  mean: "Mean",
  min: "Min",
  max: "Max",
  p95: "P95",
  latest: "Latest",
};

function formatMetric(value: number, unit?: string): string {
  const formatted = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

function trendClass(trend?: string): string {
  if (trend === "up") return styles.trendUp;
  if (trend === "down") return styles.trendDown;
  return styles.trendFlat;
}

interface KpiStripProps {
  section: ReportSection;
  stats?: SectionPreviewStats;
  editable?: boolean;
  onRemoveStat?: (statId: string) => void;
}

export function KpiStrip({ section, stats, editable = false, onRemoveStat }: KpiStripProps) {
  const show = resolveSectionStats(section);
  if (show.length === 0) {
    return null;
  }

  const values: Record<string, number | undefined> = stats
    ? { mean: stats.mean, min: stats.min, max: stats.max, p95: stats.p95, latest: stats.last }
    : {};

  const canRemoveStat = editable && Boolean(onRemoveStat);

  return (
    <div className={styles.kpiStrip} style={{ gridTemplateColumns: `repeat(${show.length}, 1fr)` }}>
      {show.map((statId) => (
        <div key={statId} className={styles.kpiCell}>
          {canRemoveStat && show.length > 1 ? (
            <button
              type="button"
              className={styles.kpiCellRemove}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveStat?.(statId);
              }}
              aria-label={`Remove ${displayStatLabel(statId, STAT_LABELS[statId] || statId)}`}
              title="Remove statistic"
            >
              <X size={10} />
            </button>
          ) : null}
          <div className={styles.kpiCellLabel}>
            {displayStatLabel(statId, STAT_LABELS[statId] || statId)}
          </div>
          <div className={styles.kpiCellValue}>
            {values[statId] !== undefined
              ? formatMetric(values[statId] as number, stats?.unit)
              : "—"}
            {statId === "latest" && stats?.delta_pct !== undefined && (
              <span className={trendClass(stats.trend)}>
                {stats.trend === "up" ? " ▲" : stats.trend === "down" ? " ▼" : " ▬"}
                {stats.delta_pct > 0 ? "+" : ""}
                {stats.delta_pct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
