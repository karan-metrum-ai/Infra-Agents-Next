import { Fragment } from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatPct } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { OptimizationResult } from "@/features/sandbox/sandboxApi.types";
import styles from "./OptimizationSection.module.css";

/**
 * OptimizationSection -- conditional DSPy before/after comparison.
 *
 * Renders only when `report.optimization` is non-null. Shows side-by-side
 * score cards for each KyAI dimension with color-coded lift indicators.
 *
 * Ported from the Vite app's `components/SandboxPanel/OptimizationSection.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 * Every inline `style={{}}` object from the source was converted to a CSS
 * Module class (this app's styling convention); the percentage-formatting
 * branch of the source's local `fmtScore` now delegates to the canonical
 * `formatPct` from `@/lib/formatters` since the two produce byte-identical
 * output -- the `ms` branch stays local since it deliberately never
 * downgrades to seconds (unlike `lib/formatters`' `formatMs`), matching the
 * source's exact "Latency (mean)" display.
 */
interface OptimizationSectionProps {
  optimization: OptimizationResult | null;
}

const SCORE_KEYS = [
  { key: "mean_score", label: "Overall Score", fmt: "pct" },
  { key: "tool_match", label: "Tool Match", fmt: "pct" },
  { key: "param_match", label: "Param Match", fmt: "pct" },
  { key: "order_valid", label: "Order Valid", fmt: "pct" },
  { key: "reasoning", label: "Reasoning", fmt: "pct" },
  { key: "latency_mean_ms", label: "Latency (mean)", fmt: "ms" },
] as const;

function fmtScore(v: number | string | null | undefined, fmt: string = "pct"): string {
  if (v == null) return "--";
  if (typeof v === "number") {
    if (fmt === "ms") return `${Math.round(v).toLocaleString()}ms`;
    return formatPct(v);
  }
  return String(v);
}

function fmtLift(v: number | undefined): string {
  if (v == null || typeof v !== "number") return "";
  const pct = v * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function OptimizationSection({ optimization }: OptimizationSectionProps) {
  if (!optimization) return null;

  const before = optimization.before ?? {};
  const after = optimization.after ?? {};
  const lift = optimization.lift ?? {};

  const beforeCompleted = Number(before.completed ?? 0);
  const beforeTotal = Number(before.total ?? 0);
  const afterCompleted = Number(after.completed ?? 0);
  const afterTotal = Number(after.total ?? 0);

  const overallLift = lift.mean_score ?? 0;
  const isPositive = overallLift > 0.01;
  const isNegative = overallLift < -0.01;

  const bannerClass = isPositive
    ? styles.liftBannerPositive
    : isNegative
      ? styles.liftBannerNegative
      : styles.liftBannerNeutral;
  const iconClass = isPositive
    ? styles.liftIconPositive
    : isNegative
      ? styles.liftIconNegative
      : styles.liftIconNeutral;
  const textClass = isPositive
    ? styles.liftTextPositive
    : isNegative
      ? styles.liftTextNegative
      : styles.liftTextNeutral;

  const acceptanceLift = lift.acceptance_rate;
  const acceptanceClass =
    typeof acceptanceLift === "number" && acceptanceLift > 0
      ? styles.liftPositive
      : typeof acceptanceLift === "number" && acceptanceLift < 0
        ? styles.liftNegative
        : styles.liftNeutral;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <TrendingUp size={16} className={styles.titleIcon} aria-hidden="true" />
          DSPy Optimization
        </h3>
        <span className={styles.sectionSubtitle}>
          BootstrapFewShot compilation -- before vs after
        </span>
      </div>

      <div className={cn(styles.liftBanner, bannerClass)}>
        {isPositive ? (
          <ArrowUpRight size={24} className={iconClass} aria-hidden="true" />
        ) : isNegative ? (
          <ArrowDownRight size={24} className={iconClass} aria-hidden="true" />
        ) : (
          <Minus size={24} className={iconClass} aria-hidden="true" />
        )}
        <div>
          <div className={cn(styles.liftText, textClass)}>
            {fmtLift(overallLift)} overall score lift
          </div>
          <div className={styles.liftDetail}>
            {fmtScore(before.mean_score)} before → {fmtScore(after.mean_score)} after |{" "}
            {beforeCompleted}/{beforeTotal} → {afterCompleted}/{afterTotal} completed
          </div>
        </div>
      </div>

      <div className={styles.table}>
        {["Metric", "Before", "After", "Lift"].map((h) => (
          <div key={h} className={cn(styles.headerCell, h !== "Metric" && styles.headerCellRight)}>
            {h}
          </div>
        ))}

        {SCORE_KEYS.map(({ key, label, fmt }) => {
          const bv = before[key];
          const av = after[key];
          const lv = key === "latency_mean_ms" ? lift.latency : lift[key];
          const liftPositive = typeof lv === "number" && lv > 0.005;
          const liftNegative = typeof lv === "number" && lv < -0.005;

          return (
            <Fragment key={key}>
              <div className={cn(styles.cell, key === "mean_score" && styles.cellEmphasis)}>
                {label}
              </div>
              <div className={cn(styles.cell, styles.cellRight)}>{fmtScore(bv, fmt)}</div>
              <div className={cn(styles.cell, styles.cellRight)}>{fmtScore(av, fmt)}</div>
              <div
                className={cn(
                  styles.cell,
                  styles.cellRight,
                  liftPositive
                    ? styles.liftPositive
                    : liftNegative
                      ? styles.liftNegative
                      : styles.liftNeutral,
                )}
              >
                {fmtLift(lv)}
              </div>
            </Fragment>
          );
        })}

        <div className={styles.cell}>Acceptance</div>
        <div className={cn(styles.cell, styles.cellRight)}>
          {beforeCompleted}/{beforeTotal}
        </div>
        <div className={cn(styles.cell, styles.cellRight)}>
          {afterCompleted}/{afterTotal}
        </div>
        <div className={cn(styles.cell, styles.cellRight, acceptanceClass)}>
          {typeof acceptanceLift === "number" ? fmtLift(acceptanceLift) : "--"}
        </div>
      </div>
    </section>
  );
}

export default OptimizationSection;
