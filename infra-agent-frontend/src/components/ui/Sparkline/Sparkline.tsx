/**
 * Sparkline — compact ECharts line chart for metric cards and trends.
 */

"use client";

import { useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsOption } from "echarts";
import { useSparklineChart } from "./useSparklineChart";
import styles from "./Sparkline.module.css";
import type { SparklineProps } from "./Sparkline.types";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const defaultFormat = (v: number) => v.toFixed(1);

/**
 * Resolves a `var(--token)` reference to its computed value. Reads from
 * `document.documentElement` rather than the chart's own container -- CSS
 * custom properties used here are theme tokens set at `:root`, so the
 * computed value is identical either way, and reading from the document
 * root (always present) instead of the chart container (only present
 * post-mount) lets this run during render, not just inside an effect.
 */
function resolveColor(color: string): string {
  if (!color.startsWith("var(")) {
    return color;
  }
  if (typeof window === "undefined") {
    return "#6366f1";
  }
  const token = color.slice(4, -1).trim();
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return resolved || "#6366f1";
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba(")) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function Sparkline({
  data,
  timestamps,
  width = 80,
  height = 28,
  color = "var(--primary)",
  strokeWidth = 1.5,
  filled = true,
  unit = "",
  formatValue = defaultFormat,
  ariaLabel,
}: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const seriesPairs = useMemo(() => {
    const pairs: Array<[number, number]> = [];
    data.forEach((value, index) => {
      if (value == null || Number.isNaN(value)) {
        return;
      }
      const ts = timestamps?.[index];
      pairs.push([ts ?? index, value]);
    });
    return pairs;
  }, [data, timestamps]);

  const hasTimeAxis = useMemo(
    () => timestamps != null && timestamps.some((ts) => ts != null),
    [timestamps],
  );

  const hasEnoughData = seriesPairs.length >= 2;

  const option = useMemo<EChartsOption | null>(() => {
    if (!hasEnoughData) {
      return null;
    }

    const resolvedColor = resolveColor(color);
    return {
      animation: false,
      grid: { left: 2, right: 2, top: 2, bottom: 2, containLabel: false },
      xAxis: hasTimeAxis ? { type: "time", show: false } : { type: "value", show: false },
      yAxis: { type: "value", show: false, scale: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "var(--color-surface-sunken)",
        borderColor: "var(--color-border-strong)",
        textStyle: {
          color: "var(--color-text-primary)",
          fontSize: 10,
          fontFamily: "var(--font-geist-mono), monospace",
        },
        axisPointer: {
          type: "line",
          lineStyle: { color: "var(--color-border-strong)" },
        },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          if (!item || item.value == null) {
            return "";
          }
          const raw = item.value as [number, number] | number;
          const value = Array.isArray(raw) ? raw[1] : raw;
          const ts = Array.isArray(raw) ? raw[0] : null;
          const valueText = `${formatValue(value)}${unit}`;
          if (hasTimeAxis && ts != null) {
            const when = new Date(ts).toLocaleString();
            return `${when}<br/>${valueText}`;
          }
          return valueText;
        },
      },
      series: [
        {
          type: "line",
          data: seriesPairs,
          showSymbol: false,
          smooth: 0.2,
          lineStyle: { color: resolvedColor, width: strokeWidth },
          areaStyle: filled
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: withAlpha(resolvedColor, 0.25) },
                  { offset: 1, color: withAlpha(resolvedColor, 0.02) },
                ]),
              }
            : undefined,
        },
      ],
    };
  }, [seriesPairs, color, filled, strokeWidth, hasTimeAxis, unit, formatValue, hasEnoughData]);

  useSparklineChart(containerRef, chartRef, hasEnoughData, option);

  if (!hasEnoughData) {
    return (
      <div
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- live chart container, not a static <img>
        role="img"
        aria-label={ariaLabel ?? "No data"}
        data-testid="sparkline-placeholder"
        className={styles.placeholder}
        style={{ width, height }}
      >
        <div className={styles.placeholderLine} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- ECharts mounts a canvas here, not a static <img>
      role="img"
      aria-label={ariaLabel ?? "Sparkline"}
      data-testid="sparkline-chart"
      className={styles.chart}
      style={{ width, height }}
    />
  );
}
