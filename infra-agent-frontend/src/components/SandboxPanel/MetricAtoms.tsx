"use client";

import type { ReactNode } from "react";
import { formatPct } from "@/lib/formatters";
import styles from "./MetricAtoms.module.css";

/**
 * Small reusable atoms shared across all metric tabs.
 *
 * Kpi, BarRow, Ring, Gauge -- intentionally simple, no animations. The
 * metric tabs compose these into the layouts described in the spec (KPI
 * grid, horizontal bar chart, ring charts, gauge, etc.).
 *
 * Ported from the Vite app's `components/SandboxPanel/MetricAtoms.tsx`.
 * Colors converted from the source's hardcoded `rgba(255,255,255,X)`/
 * `var(--primary)` etc. to this app's semantic CSS variables + `color-mix`,
 * matching `SandboxConfigForm.module.css`'s established convention.
 */

/** Single KPI tile. */
export function Kpi({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className={styles.kpiTile}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>
        {value}
        {unit && <span className={styles.kpiUnit}>{unit}</span>}
      </span>
    </div>
  );
}

/** Horizontal bar row. */
export function BarRow({
  label,
  value,
  max,
  color = "default",
  display,
}: {
  label: string;
  value: number;
  max: number;
  color?: "default" | "error" | "success";
  display?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const fillClass =
    color === "error" ? styles.barFillError : color === "success" ? styles.barFillSuccess : "";
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel} title={label}>
        {label}
      </span>
      <div className={styles.barTrack}>
        <div className={`${styles.barFill} ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.barValue}>{display ?? value}</span>
    </div>
  );
}

/** Ring progress chart used for accuracy percentages. */
export function Ring({
  label,
  value,
  size = 110,
  color = "var(--primary)",
}: {
  label: string;
  /** Ratio between 0 and 1. */
  value: number;
  size?: number;
  color?: string;
}) {
  const safeValue = Math.max(0, Math.min(1, value || 0));
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <div className={styles.ringTile}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG ring chart, not a static <img>
        role="img"
        aria-label={`${label}: ${formatPct(safeValue)}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklch, var(--foreground) 6%, transparent)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${c * safeValue} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          fontSize={18}
          fontFamily="var(--font-mono)"
          fontWeight={600}
          fill="var(--foreground)"
        >
          {formatPct(safeValue)}
        </text>
      </svg>
      <span className={styles.ringTileLabel}>{label}</span>
    </div>
  );
}

/** Half-circle gauge used for utilization and timeout rate. */
export function Gauge({
  label,
  value,
  color = "var(--primary)",
}: {
  label: string;
  /** Ratio between 0 and 1. */
  value: number;
  color?: string;
}) {
  const safeValue = Math.max(0, Math.min(1, value || 0));
  const w = 160;
  const h = 90;
  const r = 70;
  const cx = w / 2;
  const cy = h - 10;
  const angle = Math.PI * safeValue;
  const endX = cx - r * Math.cos(angle);
  const endY = cy - r * Math.sin(angle);
  return (
    <div className={styles.gauge}>
      <svg
        className={styles.gaugeSvg}
        viewBox={`0 0 ${w} ${h}`}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG gauge chart, not a static <img>
        role="img"
        aria-label={`${label}: ${formatPct(safeValue)}`}
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="color-mix(in oklch, var(--foreground) 6%, transparent)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.gaugeValue}>{formatPct(safeValue)}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  );
}

/** Inline empty-state for tabs with no data yet. */
export function TabEmpty({ message = "No data collected yet" }: { message?: string }) {
  return <div className={styles.emptyStateInline}>{message}</div>;
}
