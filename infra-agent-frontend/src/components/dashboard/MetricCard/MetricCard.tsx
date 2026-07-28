import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./MetricCard.module.css";
import type { MetricCardProps } from "./MetricCard.types";

const TREND_CLASSES = { up: styles.trendUp, down: styles.trendDown, stable: styles.trendStable };

/** Individual metric tile: icon, label, value, and an optional trend delta vs. previousValue. */
export function MetricCard({
  label,
  value,
  icon,
  color = "var(--primary)",
  isLoading = false,
  previousValue,
  formatValue = (v) => v.toLocaleString(),
}: MetricCardProps) {
  const trend =
    previousValue == null || value == null
      ? null
      : value > previousValue
        ? "up"
        : value < previousValue
          ? "down"
          : "stable";

  const delta = previousValue != null && value != null ? value - previousValue : null;

  return (
    <div className={styles.metricCard} style={{ "--metric-color": color } as React.CSSProperties}>
      <div className={styles.metricIcon} style={{ color }} aria-hidden="true">
        {icon}
      </div>

      <div className={styles.metricContent}>
        <span className={styles.metricLabel}>{label}</span>

        {isLoading ? (
          <div className={styles.metricValueShimmer} />
        ) : (
          <div className={styles.metricValueRow}>
            <span className={styles.metricValue}>{value !== null ? formatValue(value) : "--"}</span>

            {trend && delta !== null && delta !== 0 && (
              <span className={cn(styles.trendIndicator, TREND_CLASSES[trend])}>
                {trend === "up" && <TrendingUp size={12} aria-hidden="true" />}
                {trend === "down" && <TrendingDown size={12} aria-hidden="true" />}
                {trend === "stable" && <Minus size={12} aria-hidden="true" />}
                <span>
                  {delta > 0 ? "+" : ""}
                  {delta}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
