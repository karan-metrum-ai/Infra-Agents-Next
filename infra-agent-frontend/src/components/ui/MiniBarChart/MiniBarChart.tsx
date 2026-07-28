/**
 * MiniBarChart — compact SVG-based bar chart for displaying trend data.
 */

import type { MiniBarChartProps } from "./MiniBarChart.types";

export function MiniBarChart({
  data,
  width = 200,
  height = 60,
  defaultColor = "var(--primary)",
  barGap = 4,
  barRadius = 3,
  className = "",
  showTooltips = true,
  showLabels = false,
  showValues = false,
}: MiniBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;
  const labelHeight = showLabels ? 14 : 0;
  const valueHeight = showValues ? 12 : 0;
  const chartHeight = height - labelHeight - valueHeight;
  const barWidth = (width - barGap * (barCount - 1)) / barCount;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={0}
          y1={valueHeight + chartHeight * (1 - ratio)}
          x2={width}
          y2={valueHeight + chartHeight * (1 - ratio)}
          strokeWidth={1}
          strokeDasharray="4 4"
          style={{ stroke: "var(--color-border)" }}
        />
      ))}

      {data.map((bar, index) => {
        const barHeight = (bar.value / maxValue) * (chartHeight - 4);
        const x = index * (barWidth + barGap);
        const y = valueHeight + chartHeight - barHeight;
        const color = bar.color || defaultColor;

        return (
          <g key={bar.label ?? index}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barRadius}
              ry={barRadius}
              fill={color}
              opacity={0.15}
              style={{ filter: "blur(4px)" }}
            />
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barRadius}
              ry={barRadius}
              fill={color}
              style={{
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: showTooltips ? "pointer" : "default",
              }}
            >
              {showTooltips && bar.label && (
                <title>
                  {bar.label}: {bar.value}
                </title>
              )}
            </rect>
            {showValues && bar.value > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fontFamily="inherit"
                style={{ fill: color }}
              >
                {bar.value}
              </text>
            )}
            {showLabels && bar.label && (
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                fontSize={8}
                fontFamily="inherit"
                style={{ fill: "var(--color-text-muted)" }}
              >
                {bar.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
