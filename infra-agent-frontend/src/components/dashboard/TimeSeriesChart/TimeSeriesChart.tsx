"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline/Sparkline";
import { cn } from "@/lib/utils";
import { TIME_WINDOWS, useTimeSeries, type TimeWindowLabel } from "@/hooks/useTimeSeries";
import styles from "./TimeSeriesChart.module.css";
import type { TimeSeriesChartProps } from "./TimeSeriesChart.types";

const defaultFormat = (v: number) => v.toFixed(1);

/** Labelled sparkline with a 10m/1h/6h/24h/7d range selector; lives inside a tab or collapsible section. */
export function TimeSeriesChart({
  deviceId,
  clusterId,
  metric,
  label,
  unit = "",
  color = "var(--primary)",
  width: widthProp,
  height = 72,
  formatValue = defaultFormat,
}: TimeSeriesChartProps) {
  const [window, setWindow] = useState<TimeWindowLabel>("1h");
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(widthProp ?? 320);

  useEffect(() => {
    if (widthProp != null) {
      setChartWidth(widthProp);
      return;
    }
    const el = chartAreaRef.current;
    if (!el) return;
    const updateWidth = () => setChartWidth(Math.max(el.clientWidth, 200));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [widthProp]);

  const chartWidthResolved = widthProp ?? chartWidth;

  const { points, isLoading, isError, isFetching, downsampled, refetch } = useTimeSeries({
    deviceId,
    clusterId,
    metric,
    window,
  });

  const latest = points.length > 0 ? points[points.length - 1].val : null;
  const values = points.map((p) => p.val);
  const timestamps = points.map((p) => p.ts);

  return (
    <div className={styles.panel} style={{ "--chart-color": color } as React.CSSProperties}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>
          {latest != null ? `${formatValue(latest)}${unit}` : "—"}
          {isFetching && <RefreshCw size={10} className={styles.fetchingIcon} aria-hidden="true" />}
        </span>
      </div>

      <div ref={chartAreaRef} className={styles.chartArea} style={{ minHeight: height }}>
        {isError ? (
          <div className={styles.errorState} style={{ height }}>
            Error loading data
          </div>
        ) : isLoading ? (
          <div className={styles.loadingSkeleton} style={{ height }} />
        ) : (
          <Sparkline
            data={values}
            timestamps={timestamps}
            width={chartWidthResolved}
            height={height}
            color={color}
            unit={unit}
            formatValue={formatValue}
            filled
            ariaLabel={`${label} trend`}
          />
        )}
        {downsampled && <span className={styles.downsampledBadge}>downsampled</span>}
      </div>

      <div className={styles.windowRow}>
        {TIME_WINDOWS.map((w) => (
          <button
            key={w.label}
            type="button"
            onClick={() => setWindow(w.label)}
            className={cn(styles.chip, window === w.label && styles.chipActive)}
            aria-pressed={window === w.label}
          >
            {w.label}
          </button>
        ))}
        <button
          type="button"
          onClick={refetch}
          className={cn(styles.chip, styles.refreshChip)}
          aria-label="Refresh chart"
          title="Refresh"
        >
          <RefreshCw size={10} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default TimeSeriesChart;
