/**
 * DonutChart — lightweight SVG-based donut chart for proportional data.
 */

import { useMemo } from "react";
import type { DonutChartProps } from "./DonutChart.types";

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M",
    outerStart.x,
    outerStart.y,
    "A",
    outerR,
    outerR,
    0,
    largeArcFlag,
    0,
    outerEnd.x,
    outerEnd.y,
    "L",
    innerEnd.x,
    innerEnd.y,
    "A",
    innerR,
    innerR,
    0,
    largeArcFlag,
    1,
    innerStart.x,
    innerStart.y,
    "Z",
  ].join(" ");
}

export function DonutChart({
  segments,
  size = 120,
  thickness = 0.25,
  centerLabel,
  centerSublabel,
  className = "",
  showTooltips = true,
  fluid = false,
}: DonutChartProps) {
  const total = useMemo(() => segments.reduce((sum, seg) => sum + seg.value, 0), [segments]);

  const radius = size / 2;
  const innerRadius = radius * (1 - thickness);

  const arcs = useMemo(() => {
    let currentAngle = -90;
    return segments.map((segment) => {
      const percentage = total > 0 ? segment.value / total : 0;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return { ...segment, percentage, startAngle, angle };
    });
  }, [segments, total]);

  const hasCenterContent = Boolean(centerLabel || centerSublabel);
  const labelY = centerLabel && centerSublabel ? radius - size * 0.06 : radius;
  const sublabelY = radius + size * 0.13;

  return (
    <div
      className={className}
      style={
        fluid
          ? { position: "relative", width: "100%", height: "100%" }
          : { position: "relative", width: size, height: size }
      }
    >
      <svg
        width={fluid ? "100%" : size}
        height={fluid ? "100%" : size}
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ring rotated -90deg (via a group, not the whole svg) so arc
            angle 0 starts at the top; in-SVG center text stays upright. */}
        <g style={{ transform: "rotate(-90deg)", transformOrigin: `${radius}px ${radius}px` }}>
          <circle
            cx={radius}
            cy={radius}
            r={(radius + innerRadius) / 2}
            fill="none"
            strokeWidth={radius - innerRadius}
            style={{ stroke: "var(--color-border)" }}
          />

          {arcs.map((arc) => {
            if (arc.value === 0) return null;

            const endAngle = arc.startAngle + arc.angle;
            const adjustedEndAngle = arc.angle >= 359.9 ? arc.startAngle + 359.9 : endAngle;

            return (
              <path
                key={arc.label}
                d={describeArc(
                  radius,
                  radius,
                  radius - 2,
                  innerRadius + 2,
                  arc.startAngle + 90,
                  adjustedEndAngle + 90,
                )}
                fill={arc.color}
                stroke={arc.color}
                strokeWidth={0.5}
                strokeOpacity={0.55}
                style={{
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: showTooltips ? "pointer" : "default",
                }}
              >
                {showTooltips && (
                  <title>
                    {arc.label}: {arc.value} ({(arc.percentage * 100).toFixed(1)}%)
                  </title>
                )}
              </path>
            );
          })}
        </g>

        {/* Center content -- in-SVG so it scales with the ring in fluid
            mode instead of a fixed-px HTML overlay. */}
        {fluid && hasCenterContent && (
          <>
            {centerLabel && (
              <text
                x={radius}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.18}
                fontWeight={600}
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fill: "var(--foreground)",
                }}
              >
                {centerLabel}
              </text>
            )}
            {centerSublabel && (
              <text
                x={radius}
                y={centerLabel ? sublabelY : radius}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={size * 0.09}
                fontWeight={500}
                letterSpacing="0.05em"
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fill: "var(--color-text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {centerSublabel}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Center content (non-fluid) -- fixed-px HTML overlay, unchanged. */}
      {!fluid && hasCenterContent && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {centerLabel && (
            <div
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: size * 0.18,
                fontWeight: 600,
                color: "var(--foreground)",
                lineHeight: 1.1,
              }}
            >
              {centerLabel}
            </div>
          )}
          {centerSublabel && (
            <div
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: size * 0.09,
                fontWeight: 500,
                color: "var(--color-text-muted)",
                marginTop: 2,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {centerSublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
