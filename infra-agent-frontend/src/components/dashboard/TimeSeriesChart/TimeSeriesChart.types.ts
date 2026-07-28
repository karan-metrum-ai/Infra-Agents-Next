export interface TimeSeriesChartProps {
  /** NetBox device ID. */
  deviceId: number;
  /** Cluster ID for tenant isolation. */
  clusterId: number | null | undefined;
  /** GreptimeDB metric table name. */
  metric: string;
  /** Human-readable label shown above the chart. */
  label: string;
  /** Unit appended to tooltip / latest value. */
  unit?: string;
  /** Chart line color. */
  color?: string;
  /** Chart width in px; auto-measured via ResizeObserver if omitted. */
  width?: number;
  /** Chart height in px. */
  height?: number;
  /** Value formatter. Defaults to one-decimal fixed-point. */
  formatValue?: (v: number) => string;
}
