import { formatPct as formatPctRatio, formatQps } from "@/lib/formatters";
import type {
  GpuHardwareMetrics,
  GpuInferenceMetrics,
  GpuMetricsReport,
  MetricsSnapshot,
} from "@/features/sandbox/sandboxApi.types";
import styles from "./ReportSummary.module.css";

/**
 * ReportSummary -- compact multi-column KPI grid shown above the metrics
 * deep-dive tabs. Columns: Accuracy | Latency | GPU (conditional) | Load.
 * Each metric uses threshold-based color indicators (a small status dot,
 * not a color-changing value -- matching the source exactly).
 *
 * Ported from the Vite app's `components/SandboxPanel/ReportSummary.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 *
 * Deviations from source (documented):
 * - The source typed `metrics: any`. This app's canonical
 *   `@/features/sandbox/sandboxApi.types` has a real `MetricsSnapshot`
 *   type, used here instead per this codebase's "strictly typed" rule.
 *   A few fields this component reads in practice
 *   (`gpu.lmcache`, `gpu.inference.ttft_during_run_s`,
 *   top-level `metrics.concurrency`) aren't yet part of the canonical
 *   `GpuMetricsReport`/`GpuInferenceMetrics`/`MetricsSnapshot` field lists,
 *   so they're narrowed via local, explicitly-typed casts rather than
 *   widening the shared type definitions or falling back to `any`.
 * - `fmtPct`/`fmtQps` calls that produce byte-identical output to the
 *   canonical `formatPct(v, true)`/`formatQps` in `@/lib/formatters` now
 *   delegate to them. `fmtNum`/`fmtMs` stay local: the source's fixed
 *   decimal-place control (`toFixed(decimals)`) and simple ms/s threshold
 *   (no locale grouping, no sub-millisecond branches) differ from
 *   `lib/formatters`' `formatNum`/`formatMs`, and changing those would
 *   change the displayed precision/units.
 */
interface ReportSummaryProps {
  metrics: MetricsSnapshot | null | undefined;
}

type StatusColor = "success" | "warning" | "destructive";

interface KpiItem {
  label: string;
  value: string;
  color: StatusColor;
}

function dotClass(color: StatusColor): string {
  if (color === "success") return styles.dotSuccess;
  if (color === "warning") return styles.dotWarning;
  return styles.dotDestructive;
}

function accuracyColor(v: number): StatusColor {
  if (v >= 0.8) return "success";
  if (v >= 0.5) return "warning";
  return "destructive";
}

function latencyColor(ms: number): StatusColor {
  if (ms < 30000) return "success";
  if (ms < 60000) return "warning";
  return "destructive";
}

function gpuUtilColor(pct: number): StatusColor {
  if (pct < 80) return "success";
  if (pct < 95) return "warning";
  return "destructive";
}

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || Number.isNaN(v)) return "--";
  return v.toFixed(decimals);
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "--";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "--";
  return formatPctRatio(v, true);
}

/** Extra fields observed in practice that aren't (yet) part of the
 * canonical `GpuMetricsReport`/`GpuInferenceMetrics` types -- see the
 * file-level deviation note. */
type GpuReportWithLmcache = GpuMetricsReport & {
  lmcache?: { token_hit_rate_pct?: number | null } | null;
};
type GpuInferenceWithRunTtft = GpuInferenceMetrics & {
  ttft_during_run_s?: number | null;
};

export function ReportSummary({ metrics }: ReportSummaryProps) {
  if (!metrics) return null;

  const columns: { title: string; items: KpiItem[] }[] = [];

  if (metrics.accuracy) {
    const acc = metrics.accuracy;
    const meanScore =
      (acc.mean_score as number | undefined) ??
      acc.atomizer_accuracy ??
      acc.query_success_rate ??
      null;
    const toolMatch =
      (acc.tool_call_match_rate as number | undefined) ?? acc.planner_agent_match_rate ?? null;
    const completed = (acc.completed_queries as number | undefined) ?? 0;
    const total = (acc.total_queries as number | undefined) ?? 0;
    const items: KpiItem[] = [];
    if (meanScore != null) {
      items.push({
        label: "Mean Score",
        value: fmtNum(meanScore, 3),
        color: accuracyColor(meanScore),
      });
    }
    if (toolMatch != null) {
      items.push({
        label: "Tool Match",
        value: fmtNum(toolMatch, 3),
        color: accuracyColor(toolMatch),
      });
    }
    if (total > 0) {
      const ratio = completed / total;
      items.push({
        label: "Accepted",
        value: `${completed}/${total}`,
        color: ratio >= 0.7 ? "success" : ratio >= 0.4 ? "warning" : "destructive",
      });
    }
    if (items.length > 0) {
      columns.push({ title: "Accuracy", items });
    }
  }

  if (metrics.latency) {
    const lat = metrics.latency;
    const items: KpiItem[] = [];
    if (lat.e2e_mean_ms != null) {
      items.push({
        label: "E2E Mean",
        value: fmtMs(lat.e2e_mean_ms),
        color: latencyColor(lat.e2e_mean_ms),
      });
    }
    if (lat.e2e_p95_ms != null) {
      items.push({
        label: "E2E P95",
        value: fmtMs(lat.e2e_p95_ms),
        color: latencyColor(lat.e2e_p95_ms),
      });
    }
    const mopMeanMs = lat.mop_mean_ms as number | undefined;
    if (mopMeanMs != null) {
      items.push({ label: "MOP Mean", value: fmtMs(mopMeanMs), color: latencyColor(mopMeanMs) });
    }
    if (items.length > 0) {
      const completedCount = lat.completed_queries as number | undefined;
      const title = completedCount != null ? `Latency (${completedCount} queries)` : "Latency";
      columns.push({ title, items });
    }
  }

  if (metrics.gpu) {
    const gpu = metrics.gpu as GpuReportWithLmcache;
    const hw: GpuHardwareMetrics | null | undefined = gpu.hardware;
    const inf: GpuInferenceWithRunTtft | null | undefined = gpu.inference as
      | GpuInferenceWithRunTtft
      | null
      | undefined;
    const lmc = gpu.lmcache;
    const items: KpiItem[] = [];
    if (hw?.utilization_pct_mean != null) {
      items.push({
        label: "GPU Util",
        value: fmtPct(hw.utilization_pct_mean),
        color: gpuUtilColor(hw.utilization_pct_mean),
      });
    }
    if (inf?.ttft_during_run_s != null) {
      items.push({
        label: "TTFT",
        value: `${fmtNum(inf.ttft_during_run_s * 1000, 0)}ms`,
        color: "success",
      });
    } else if (inf?.ttft_mean_s != null) {
      items.push({
        label: "TTFT",
        value: `${fmtNum(inf.ttft_mean_s * 1000, 0)}ms`,
        color: "success",
      });
    }
    if (lmc?.token_hit_rate_pct != null) {
      items.push({ label: "Cache Hit", value: fmtPct(lmc.token_hit_rate_pct), color: "success" });
    }
    if (hw?.power_draw_w_mean != null) {
      items.push({
        label: "Power",
        value: `${Math.round(hw.power_draw_w_mean)}W`,
        color: "success",
      });
    }
    if (items.length > 0) {
      columns.push({ title: "GPU", items });
    }
  }

  const loadItems: KpiItem[] = [];
  if (metrics.throughput?.overall_qps != null) {
    loadItems.push({
      label: "QPS",
      value: formatQps(metrics.throughput.overall_qps),
      color: "success",
    });
  }
  const concurrency = metrics.concurrency as
    | { peak_active_queries?: number; peak_concurrent_queries?: number }
    | undefined;
  const peakConc = concurrency?.peak_active_queries ?? concurrency?.peak_concurrent_queries;
  if (peakConc != null) {
    loadItems.push({ label: "Peak Concurrency", value: String(peakConc), color: "success" });
  }
  if (metrics.tokens?.total_tokens != null && metrics.tokens.total_tokens > 0) {
    const totalTokens = metrics.tokens.total_tokens;
    loadItems.push({
      label: "Total Tokens",
      value: totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens),
      color: "success",
    });
  }
  if (metrics.errors?.error_rate != null) {
    const errRate = metrics.errors.error_rate;
    loadItems.push({
      label: "Error Rate",
      value: fmtPct(errRate * 100),
      color: errRate < 0.05 ? "success" : errRate < 0.2 ? "warning" : "destructive",
    });
  }
  if (loadItems.length > 0) {
    columns.push({ title: "Load", items: loadItems });
  }

  if (columns.length === 0) return null;

  return (
    <div
      className={styles.grid}
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((col) => (
        <div key={col.title} className={styles.column}>
          <span className={styles.columnTitle}>{col.title}</span>
          <div className={styles.itemList}>
            {col.items.map((kpi) => (
              <div key={kpi.label} className={styles.item}>
                <span className={styles.itemLabel}>{kpi.label}</span>
                <span className={styles.itemValue}>
                  <span className={`${styles.dot} ${dotClass(kpi.color)}`} aria-hidden="true" />
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReportSummary;
