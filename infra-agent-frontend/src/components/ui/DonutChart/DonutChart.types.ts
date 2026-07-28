export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

export interface DonutChartProps {
  /** Array of segments to display in the donut chart. */
  segments: DonutSegment[];
  /** Size of the chart in pixels. */
  size?: number;
  /** Thickness of the donut ring as a fraction of radius (0-1). */
  thickness?: number;
  /** Center label (e.g., total count or percentage). */
  centerLabel?: string;
  /** Center sublabel (e.g., "Total" or "Nodes"). */
  centerSublabel?: string;
  /** Optional class name for styling. */
  className?: string;
  /** Show segment labels on hover. */
  showTooltips?: boolean;
  /**
   * Render at 100% of the parent container (aspect-ratio preserved via
   * viewBox) instead of a fixed `size` px box, so the chart grows with real
   * layout instead of a fixed pixel footprint. `size` still sets the
   * viewBox coordinate space and the center-label proportions.
   */
  fluid?: boolean;
}
