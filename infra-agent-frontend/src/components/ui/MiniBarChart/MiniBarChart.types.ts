export interface BarData {
  value: number;
  label?: string;
  color?: string;
}

export interface MiniBarChartProps {
  /** Array of bar values to display. */
  data: BarData[];
  /** Width of the chart in pixels. */
  width?: number;
  /** Height of the chart in pixels. */
  height?: number;
  /** Default color for bars without a specified color. */
  defaultColor?: string;
  /** Gap between bars in pixels. */
  barGap?: number;
  /** Border radius for bars. */
  barRadius?: number;
  /** Optional class name for styling. */
  className?: string;
  /** Show value labels on hover. */
  showTooltips?: boolean;
  /** Show day labels below bars. */
  showLabels?: boolean;
  /** Show value numbers on top of bars. */
  showValues?: boolean;
}
