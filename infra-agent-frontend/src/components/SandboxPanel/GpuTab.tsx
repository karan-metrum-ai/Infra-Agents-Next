import type { GpuMetricsReport } from "@/features/sandbox/sandboxApi.types";
import { BarRow, Gauge, Kpi, TabEmpty } from "./MetricAtoms";
import styles from "./GpuTab.module.css";

/**
 * GPU tab -- hardware utilization + vLLM inference metrics collected from
 * `gpu_metrics_server` (rocm-smi/nvidia-smi) and the vLLM `/metrics`
 * Prometheus endpoint during the eval run.
 *
 * Ported from the Vite app's `components/SandboxPanel/GpuTab.tsx`. Purely a
 * function of props -- no local state/hooks, so no `"use client"`.
 *
 * Deviations from source (documented):
 * - `lmcache` (optional external LMCache stats) isn't part of the canonical
 *   `GpuMetricsReport` interface's named fields. Narrowed here via a local
 *   `GpuMetricsReportExt` intersection type, matching the
 *   `GpuReportWithLmcache` precedent already established in
 *   `ReportSummary.tsx` rather than widening the shared type or using `any`.
 * - The source's local `_fmt`/`_pct` helpers are renamed `formatGpuValue`/
 *   `toRatio` (same behavior) -- purely a naming cleanup, leading
 *   underscores on actually-used functions read as unused-variable markers
 *   elsewhere in this codebase.
 */

type GpuMetricsReportExt = GpuMetricsReport & {
  lmcache?: {
    token_hit_rate_pct?: number | null;
    key_hit_rate_pct?: number | null;
    tokens_hit?: number | null;
    tokens_requested?: number | null;
    l1_memory_usage_gb?: number | null;
    l1_usage_ratio?: number | null;
  } | null;
};

interface GpuTabProps {
  data: GpuMetricsReport | null | undefined;
}

function formatGpuValue(v: number | null | undefined, decimals = 1, unit = ""): string {
  if (v == null) return "N/A";
  return `${v.toFixed(decimals)}${unit}`;
}

function toRatio(v: number | null | undefined): number {
  if (v == null) return 0;
  return Math.min(100, Math.max(0, v)) / 100;
}

const VENDOR_COLOR: Record<string, string> = {
  nvidia: "var(--success)",
  amd: "var(--warning)",
};

export function GpuTab({ data }: GpuTabProps) {
  if (!data || (!data.hardware && !data.inference)) {
    return <TabEmpty message="GPU metrics not available — start gpu_metrics_server on the host" />;
  }

  const d = data as GpuMetricsReportExt;
  const hw = data.hardware;
  const inf = data.inference;
  const lmc = d.lmcache;
  const accentColor = VENDOR_COLOR[(hw?.vendor ?? "").toLowerCase()] ?? "var(--primary)";

  return (
    <div className={styles.tabPanel}>
      {hw && (
        <>
          <div className={styles.metricSubtitle}>
            {hw.vendor.toUpperCase()} {hw.model} &times; {hw.gpu_count}
          </div>

          <div className={styles.kpiGrid}>
            <Kpi label="GPU Count" value={String(hw.gpu_count)} />
            <Kpi label="VRAM Total" value={formatGpuValue(hw.memory_total_gb, 0)} unit=" GB" />
            <Kpi
              label="VRAM Peak Used"
              value={formatGpuValue(hw.memory_used_gb_peak, 1)}
              unit=" GB"
            />
            <Kpi label="Temp Peak" value={formatGpuValue(hw.temperature_c_peak, 0)} unit=" °C" />
            {hw.power_draw_w_mean != null && (
              <Kpi label="Power (avg)" value={formatGpuValue(hw.power_draw_w_mean, 0)} unit=" W" />
            )}
            <Kpi label="Samples" value={String(hw.snapshots)} />
          </div>

          <div className={styles.metricSubtitleSpaced}>Hardware Utilization</div>
          <div className={styles.gaugeRow}>
            <Gauge label="Util Mean" value={toRatio(hw.utilization_pct_mean)} color={accentColor} />
            <Gauge label="Util Peak" value={toRatio(hw.utilization_pct_peak)} color={accentColor} />
          </div>

          <div className={styles.barChartSpaced}>
            <BarRow
              label="VRAM Mean"
              value={hw.memory_used_gb_mean}
              max={hw.memory_total_gb || 1}
              color="default"
              display={`${formatGpuValue(hw.memory_used_gb_mean, 1)} GB`}
            />
            <BarRow
              label="VRAM Peak"
              value={hw.memory_used_gb_peak}
              max={hw.memory_total_gb || 1}
              color={hw.memory_used_gb_peak / (hw.memory_total_gb || 1) > 0.9 ? "error" : "default"}
              display={`${formatGpuValue(hw.memory_used_gb_peak, 1)} GB`}
            />
          </div>
        </>
      )}

      {inf && (
        <>
          <div className={styles.metricSubtitleXlSpaced}>vLLM Inference (during eval)</div>

          <div className={styles.kpiGrid}>
            <Kpi
              label="KV Cache Mean"
              value={formatGpuValue(inf.kv_cache_usage_pct_mean, 1)}
              unit="%"
            />
            <Kpi
              label="KV Cache Peak"
              value={formatGpuValue(inf.kv_cache_usage_pct_peak, 1)}
              unit="%"
            />
            <Kpi
              label="TTFT Mean"
              value={inf.ttft_mean_s != null ? formatGpuValue(inf.ttft_mean_s, 3) : "N/A"}
              unit={inf.ttft_mean_s != null ? "s" : ""}
            />
            <Kpi
              label="TPOT Mean"
              value={inf.tpot_mean_s != null ? formatGpuValue(inf.tpot_mean_s * 1000, 1) : "N/A"}
              unit={inf.tpot_mean_s != null ? " ms/tok" : ""}
            />
            <Kpi label="Req Running (peak)" value={String(inf.requests_running_peak)} />
            <Kpi label="Req Waiting (peak)" value={String(inf.requests_waiting_peak)} />
            {inf.prefix_cache_hit_rate_pct != null && (
              <Kpi
                label="Prefix Cache Hit"
                value={formatGpuValue(inf.prefix_cache_hit_rate_pct, 1)}
                unit="%"
              />
            )}
          </div>

          <div className={styles.barChartSpaced}>
            <BarRow
              label="KV Cache Mean"
              value={inf.kv_cache_usage_pct_mean}
              max={100}
              color={inf.kv_cache_usage_pct_peak > 80 ? "error" : "default"}
              display={`${formatGpuValue(inf.kv_cache_usage_pct_mean, 1)}%`}
            />
            <BarRow
              label="KV Cache Peak"
              value={inf.kv_cache_usage_pct_peak}
              max={100}
              color={inf.kv_cache_usage_pct_peak > 80 ? "error" : "default"}
              display={`${formatGpuValue(inf.kv_cache_usage_pct_peak, 1)}%`}
            />
            {inf.prefix_cache_hit_rate_pct != null && (
              <BarRow
                label="Prefix Cache Hit"
                value={inf.prefix_cache_hit_rate_pct}
                max={100}
                color="success"
                display={`${formatGpuValue(inf.prefix_cache_hit_rate_pct, 1)}%`}
              />
            )}
          </div>
        </>
      )}

      {lmc && (
        <>
          <div className={styles.metricSubtitle}>External LMCache</div>
          <div className={styles.kpiGrid}>
            <Kpi
              label="Token Hit Rate"
              value={formatGpuValue(lmc.token_hit_rate_pct, 1)}
              unit="%"
            />
            <Kpi
              label="Tokens Hit"
              value={`${(lmc.tokens_hit || 0).toLocaleString()} / ${(lmc.tokens_requested || 0).toLocaleString()}`}
            />
            <Kpi label="L1 Memory" value={formatGpuValue(lmc.l1_memory_usage_gb, 2)} unit=" GB" />
            <Kpi
              label="L1 Capacity"
              value={formatGpuValue((lmc.l1_usage_ratio || 0) * 100, 1)}
              unit="%"
            />
          </div>
          <div className={styles.barChart}>
            <BarRow
              label="Token Hit Rate"
              value={lmc.token_hit_rate_pct || 0}
              max={100}
              color="success"
              display={`${formatGpuValue(lmc.token_hit_rate_pct, 1)}%`}
            />
            <BarRow
              label="Key Hit Rate"
              value={lmc.key_hit_rate_pct || 0}
              max={100}
              color="success"
              display={`${formatGpuValue(lmc.key_hit_rate_pct, 1)}%`}
            />
          </div>
        </>
      )}

      {data.snapshot_count != null && (
        <div className={styles.footnote}>
          {data.snapshot_count} snapshots over {formatGpuValue(data.duration_s, 0)}s
        </div>
      )}
    </div>
  );
}

export default GpuTab;
