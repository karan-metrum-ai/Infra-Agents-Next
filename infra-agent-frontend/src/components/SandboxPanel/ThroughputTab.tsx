"use client";

import { useMemo } from "react";
import { DonutChart } from "@/components/ui/DonutChart/DonutChart";
import type { DonutSegment } from "@/components/ui/DonutChart/DonutChart.types";
import { formatInt, formatQps } from "@/lib/formatters";
import type { ThroughputMetrics } from "@/features/sandbox/sandboxApi.types";
import { Kpi, TabEmpty } from "./MetricAtoms";
import styles from "./ThroughputTab.module.css";

/**
 * Throughput tab -- KPIs for QPS metrics plus a donut breakdown of query
 * outcomes (completed/rejected/failed).
 *
 * Ported from the Vite app's `components/SandboxPanel/ThroughputTab.tsx`.
 *
 * Deviations from source (documented):
 * - Uses this app's real `DonutChart` (`@/components/ui/DonutChart`), whose
 *   prop API matches the source 1:1 (`segments`/`size`/`centerLabel`/
 *   `centerSublabel`) -- no adaptation needed beyond the import path.
 * - `total_duration_s`/`acceptance_rate`/`completed_queries`/
 *   `rejected_queries`/`failed_queries` aren't part of the canonical
 *   `ThroughputMetrics` interface's named fields (only `total_queries`,
 *   `overall_qps`, `queries_by_status`, `successful_qps` are declared, plus
 *   a `[k: string]: unknown` catch-all for the rest of the real wire
 *   shape). Narrowed here via a local `ThroughputMetricsExt` intersection
 *   type, matching the `GpuReportWithLmcache` precedent in
 *   `ReportSummary.tsx` rather than widening the shared type or using `any`.
 * - The source's inline `style={{...}}` legend/donut layout is moved into
 *   `ThroughputTab.module.css` classes; the per-segment swatch color is the
 *   only thing that stays inline since it's genuinely per-datum.
 * - `rgba(255,255,255,0.25)` (the `pending` status swatch color) converted
 *   to `color-mix(in oklch, var(--foreground) 25%, transparent)` per the
 *   mandatory color-token conversion rule.
 */

type ThroughputMetricsExt = ThroughputMetrics & {
  completed_queries?: number;
  rejected_queries?: number;
  failed_queries?: number;
  total_duration_s?: number;
  acceptance_rate?: number;
};

const STATUS_COLORS: Record<string, string> = {
  completed: "var(--success)",
  success: "var(--success)",
  succeeded: "var(--success)",
  rejected: "var(--warning)",
  failed: "var(--destructive)",
  error: "var(--destructive)",
  timeout: "var(--warning)",
  pending: "color-mix(in oklch, var(--foreground) 25%, transparent)",
};

interface ThroughputTabProps {
  data: ThroughputMetrics | null | undefined;
}

export function ThroughputTab({ data }: ThroughputTabProps) {
  const segments: DonutSegment[] = useMemo(() => {
    if (!data) return [];
    const d = data as ThroughputMetricsExt;

    if (d.queries_by_status && Object.keys(d.queries_by_status).length > 0) {
      return Object.entries(d.queries_by_status)
        .filter(([, v]) => v > 0)
        .map(([status, count]) => ({
          label: status,
          value: count,
          color: STATUS_COLORS[status.toLowerCase()] ?? "var(--primary)",
        }));
    }

    const segs: DonutSegment[] = [];
    if (d.completed_queries)
      segs.push({ label: "completed", value: d.completed_queries, color: STATUS_COLORS.completed });
    if (d.rejected_queries)
      segs.push({ label: "rejected", value: d.rejected_queries, color: STATUS_COLORS.rejected });
    if (d.failed_queries)
      segs.push({ label: "failed", value: d.failed_queries, color: STATUS_COLORS.failed });
    return segs;
  }, [data]);

  if (!data) return <TabEmpty />;

  const d = data as ThroughputMetricsExt;
  const total = d.total_queries ?? 0;
  const durationS = d.total_duration_s ?? 0;
  const acceptanceRate = d.acceptance_rate;

  return (
    <div className={styles.tabPanel}>
      <div className={styles.kpiGrid}>
        <Kpi label="Overall QPS" value={formatQps(d.overall_qps)} />
        <Kpi label="Successful QPS" value={formatQps(d.successful_qps)} />
        <Kpi label="Total Queries" value={formatInt(total)} />
        <Kpi label="Duration" value={durationS > 0 ? `${durationS.toFixed(1)}s` : "--"} />
        {acceptanceRate != null && (
          <Kpi label="Acceptance Rate" value={`${(acceptanceRate * 100).toFixed(1)}%`} />
        )}
      </div>

      {segments.length > 0 && (
        <>
          <div className={styles.metricSubtitle}>Queries by Status</div>
          <div className={styles.statusRow}>
            <DonutChart
              segments={segments}
              size={160}
              centerLabel={String(total)}
              centerSublabel="Total"
            />
            <div className={styles.legend}>
              {segments.map((s) => (
                <div key={s.label} className={styles.legendItem}>
                  <span className={styles.legendSwatch} style={{ background: s.color }} />
                  <span className={styles.legendLabel}>{s.label}</span>
                  <span className={styles.legendValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ThroughputTab;
