import { formatMs } from "@/lib/formatters";
import type { LatencyMetrics } from "@/features/sandbox/sandboxApi.types";
import { BarRow, Kpi, TabEmpty } from "./MetricAtoms";
import styles from "./LatencyTab.module.css";

/**
 * Latency tab -- percentile bar chart and per-phase p50/p95 stacks.
 *
 * Ported from the Vite app's `components/SandboxPanel/LatencyTab.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 *
 * Deviation from source (documented): `mop_mean_ms`/`mop_p95_ms`/
 * `planning_mean_ms`/`execution_mean_ms` aren't part of the canonical
 * `LatencyMetrics` interface's named fields (it declares the `e2e_*` and
 * `*_p50_ms`/`*_p95_ms` percentile fields plus a `[k: string]: unknown`
 * catch-all for the rest of the real wire shape). Narrowed here via a local
 * `LatencyMetricsExt` intersection type, matching the `ReportSummary.tsx`
 * precedent rather than widening the shared type or using `any`.
 */

type LatencyMetricsExt = LatencyMetrics & {
  mop_mean_ms?: number;
  mop_p95_ms?: number;
  planning_mean_ms?: number;
  execution_mean_ms?: number;
};

interface LatencyTabProps {
  data: LatencyMetrics | null | undefined;
}

const PERCENTILES: Array<{ key: keyof LatencyMetrics; label: string }> = [
  { key: "e2e_min_ms", label: "min" },
  { key: "e2e_p75_ms", label: "p75" },
  { key: "e2e_p90_ms", label: "p90" },
  { key: "e2e_p95_ms", label: "p95" },
  { key: "e2e_max_ms", label: "max" },
];

interface PhaseLatencyRow {
  label: string;
  p50: number;
  p95: number;
}

export function LatencyTab({ data }: LatencyTabProps) {
  if (!data) return <TabEmpty />;

  const d = data as LatencyMetricsExt;

  const maxPercentile = Math.max(...PERCENTILES.map((p) => (data[p.key] as number) || 0), 1);

  const phases: PhaseLatencyRow[] = [
    {
      label: "MOP (total)",
      p50: d.mop_mean_ms || 0,
      p95: d.mop_p95_ms || 0,
    },
    {
      label: "Planning",
      p50: d.planning_mean_ms || d.planning_p50_ms || 0,
      p95: d.planning_p95_ms || 0,
    },
    {
      label: "Execution",
      p50: d.execution_mean_ms || d.execution_p50_ms || 0,
      p95: d.execution_p95_ms || 0,
    },
  ].filter((p) => p.p50 > 0 || p.p95 > 0);
  const maxPhase = Math.max(...phases.flatMap((p) => [p.p50, p.p95]), 1);

  return (
    <div className={styles.tabPanel}>
      <div className={styles.kpiGrid}>
        <Kpi label="E2E Mean" value={formatMs(data.e2e_mean_ms)} />
        <Kpi label="E2E P95" value={formatMs(data.e2e_p95_ms)} />
        {d.mop_mean_ms != null && <Kpi label="MOP Mean" value={formatMs(d.mop_mean_ms)} />}
      </div>

      <div className={styles.metricSubtitle}>End-to-end percentiles</div>
      <div className={styles.barChart}>
        {PERCENTILES.map((p) => (
          <BarRow
            key={p.key as string}
            label={p.label}
            value={(data[p.key] as number) || 0}
            max={maxPercentile}
            display={formatMs(data[p.key] as number)}
          />
        ))}
      </div>

      <div className={styles.metricSubtitle}>Phase breakdown (mean vs p95)</div>
      <div className={styles.phaseList}>
        {phases.map((p) => {
          const p50Pct = (p.p50 / maxPhase) * 100;
          const p95Pct = ((p.p95 - p.p50) / maxPhase) * 100;
          return (
            <div className={styles.stackedBarRow} key={p.label}>
              <span className={styles.phaseLabel}>{p.label}</span>
              <div className={styles.stackedBarTrack}>
                <div className={styles.stackedBarP50} style={{ width: `${p50Pct}%` }} />
                <div
                  className={styles.stackedBarP95}
                  style={{ width: `${Math.max(p95Pct, 0)}%` }}
                />
              </div>
              <span className={styles.stackedBarLabel}>
                {formatMs(p.p50)} / {formatMs(p.p95)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LatencyTab;
