export interface FreshnessBadgeProps {
  /** Raw data_freshness string from the backend ('real-time'|'stale'|'unknown'). */
  dataFreshness: string;
  /** ISO-8601 timestamp of last telemetry receipt. */
  lastTelemetryTimestamp?: string | null;
  /** Additional CSS class name. */
  className?: string;
}
