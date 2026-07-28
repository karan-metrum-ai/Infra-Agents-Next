import { cn } from "@/lib/utils";
import { segmentGlow } from "./commandCenterFormatters";
import styles from "./BottomStatsRow.module.css";
import type { TicketSegmentKey } from "./BottomStatsRow.types";

interface TicketDonutProps {
  open: number;
  inProgress: number;
  closed: number;
  total: number;
  activeKey: TicketSegmentKey | null;
  onSelect: (key: TicketSegmentKey | null) => void;
}

export function TicketDonut({
  open,
  inProgress,
  closed,
  total,
  activeKey,
  onSelect,
}: TicketDonutProps) {
  const parts = (
    [
      { key: "open" as const, value: open, color: "var(--color-info)", label: "Open" },
      {
        key: "inProgress" as const,
        value: inProgress,
        color: "var(--color-warning)",
        label: "In-Progress",
      },
      { key: "closed" as const, value: closed, color: "var(--color-success)", label: "Closed" },
    ] as const
  ).filter((p) => p.value > 0);

  const size = 100;
  const stroke = 9;
  const activeStroke = 10;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const denom = Math.max(open + inProgress + closed, 1);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.ticketRing}
      aria-label={`Incident overview total ${total}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {parts
        .map((p) => {
          const arc = (p.value / denom) * c;
          const isActive = activeKey === p.key;
          const isDimmed = activeKey !== null && !isActive;
          const dashOffset = -offset;
          offset += arc;
          return { p, arc, dashOffset, isActive, isDimmed };
        })
        .sort((a, b) => Number(a.isActive) - Number(b.isActive))
        .map(({ p, arc, dashOffset, isActive, isDimmed }) => (
          <circle
            key={p.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth={isActive ? activeStroke : stroke}
            strokeDasharray={`${arc} ${c - arc}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            className={cn(
              styles.ringSegment,
              isActive && styles.ringSegmentActive,
              isDimmed && styles.ringSegmentDimmed,
            )}
            style={isActive ? { filter: segmentGlow(p.color) } : undefined}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG donut segment made keyboard/AT operable; can't be a native <button> inside an <svg>
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`${p.label} ${p.value}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isActive ? null : p.key);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(isActive ? null : p.key);
              }
            }}
          />
        ))}
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        className={styles.ticketTotal}
        pointerEvents="none"
      >
        {total}
      </text>
    </svg>
  );
}

export default TicketDonut;
