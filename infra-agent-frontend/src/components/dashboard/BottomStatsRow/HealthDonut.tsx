import { cn } from "@/lib/utils";
import { segmentGlow } from "./commandCenterFormatters";
import styles from "./BottomStatsRow.module.css";
import type { HealthSegmentKey } from "./BottomStatsRow.types";

interface HealthDonutProps {
  healthy: number;
  warning: number;
  critical: number;
  overallPct: number;
  activeKey: HealthSegmentKey | null;
  onSelect: (key: HealthSegmentKey | null) => void;
}

export function HealthDonut({
  healthy,
  warning,
  critical,
  overallPct,
  activeKey,
  onSelect,
}: HealthDonutProps) {
  const size = 88;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 8;
  const activeStroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const knownTotal = Math.max(healthy + warning + critical, 1);
  const gap = knownTotal > 1 ? c * 0.008 : 0;

  const segments = (
    [
      { key: "healthy" as const, value: healthy, color: "var(--color-success)", label: "Healthy" },
      { key: "warning" as const, value: warning, color: "var(--color-warning)", label: "Warning" },
      {
        key: "critical" as const,
        value: critical,
        color: "var(--color-danger)",
        label: "Critical",
      },
    ] as const
  ).filter((s) => s.value > 0);

  let cursor = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.ring}
      aria-label={`Overall health ${overallPct.toFixed(1)} percent`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {segments
        .map((seg) => {
          const raw = (seg.value / knownTotal) * c;
          const arc = Math.max(raw - gap, 0.01);
          const isActive = activeKey === seg.key;
          const isDimmed = activeKey !== null && !isActive;
          const dashOffset = -cursor;
          cursor += raw;
          return { seg, arc, dashOffset, isActive, isDimmed };
        })
        .sort((a, b) => Number(a.isActive) - Number(b.isActive))
        .map(({ seg, arc, dashOffset, isActive, isDimmed }) => (
          <circle
            key={seg.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={isActive ? activeStroke : stroke}
            strokeLinecap="butt"
            strokeDasharray={`${arc} ${c - arc}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            className={cn(
              styles.ringSegment,
              isActive && styles.ringSegmentActive,
              isDimmed && styles.ringSegmentDimmed,
            )}
            style={isActive ? { filter: segmentGlow(seg.color) } : undefined}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG donut segment made keyboard/AT operable; can't be a native <button> inside an <svg>
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`${seg.label} ${seg.value}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isActive ? null : seg.key);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(isActive ? null : seg.key);
              }
            }}
          />
        ))}
      <text x={cx} y={cy - 2} textAnchor="middle" className={styles.ringPct} pointerEvents="none">
        {overallPct.toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        className={styles.ringLabel}
        pointerEvents="none"
      >
        OVERALL
      </text>
    </svg>
  );
}

export default HealthDonut;
