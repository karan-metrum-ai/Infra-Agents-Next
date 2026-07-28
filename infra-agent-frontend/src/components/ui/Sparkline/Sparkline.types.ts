export interface SparklineProps {
  /** Array of numeric values (Y-axis). Gaps (NaN/null) are skipped. */
  data: (number | null | undefined)[];
  /** Optional Unix-ms timestamps aligned with `data`. */
  timestamps?: number[];
  /** Container width in px. Defaults to 80. */
  width?: number;
  /** Container height in px. Defaults to 28. */
  height?: number;
  /** Stroke color. Defaults to 'var(--primary)'. */
  color?: string;
  /** Stroke width. Defaults to 1.5. */
  strokeWidth?: number;
  /** Show gradient area fill beneath the line. */
  filled?: boolean;
  /** Unit appended to tooltip values. */
  unit?: string;
  /** Value formatter for tooltips. */
  formatValue?: (v: number) => string;
  /** Optional ARIA label for accessibility. */
  ariaLabel?: string;
}
