"use client";

import {
  Orbit,
  Share2,
  Link as LinkIcon,
  Zap,
  Activity,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useGetTeamMetricsQuery } from "@/features/metrics/prometheusApi";
import { cn } from "@/lib/utils";
import styles from "./MetricsObservabilityPanel.module.css";
import type { MetricsObservabilityPanelProps } from "./MetricsObservabilityPanel.types";

function formatValue(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/** Compact 2x2 observability tile panel (sessions/delegations/tokens/events) for Operations Manager. */
export function MetricsObservabilityPanel({
  teamId,
  clusterId,
  pollingInterval = 30000,
  className,
}: MetricsObservabilityPanelProps) {
  const {
    data: metrics,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetTeamMetricsQuery(
    { teamId, clusterId },
    { pollingInterval, skip: !teamId && !clusterId },
  );

  if (isError && !metrics) {
    return (
      <div className={cn(styles.panel, styles.panelError, className)}>
        <div className={styles.errorContent}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>Metrics unavailable</span>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => refetch()}
            aria-label="Retry loading metrics"
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const sessions = metrics?.sessionsActive ?? 0;
  const delegations = Object.values(metrics?.delegationsTotal ?? {}).reduce((sum, v) => sum + v, 0);
  const tokens = metrics?.tokensTotal ?? 0;
  const events = metrics?.eventsProcessed ?? 0;
  if (!isLoading && sessions + delegations + tokens + events === 0) {
    return null;
  }

  return (
    <div className={cn(styles.panel, className)}>
      <div className={styles.panelHeader}>
        <div className={styles.headerLeft}>
          <Activity size={16} className={styles.headerIcon} aria-hidden="true" />
          <span className={styles.headerTitle}>Observability</span>
          {isFetching && (
            <span className={styles.pollingDot} title="Live updating" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricItem}>
          <div className={cn(styles.metricIconWrapper, styles.iconGreen)} aria-hidden="true">
            <Orbit size={22} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricLabel}>Sessions</span>
            <span className={styles.metricValue}>
              {isLoading && !metrics ? (
                <span className={styles.shimmer} />
              ) : (
                formatValue(metrics?.sessionsActive)
              )}
            </span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={cn(styles.metricIconWrapper, styles.iconPurple)} aria-hidden="true">
            <Share2 size={22} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricLabel}>Delegations</span>
            <span className={styles.metricValue}>
              {isLoading && !metrics ? (
                <span className={styles.shimmer} />
              ) : (
                formatValue(delegations)
              )}
            </span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={cn(styles.metricIconWrapper, styles.iconAmber)} aria-hidden="true">
            <LinkIcon size={22} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricLabel}>Tokens</span>
            <span className={styles.metricValue}>
              {isLoading && !metrics ? (
                <span className={styles.shimmer} />
              ) : (
                formatValue(metrics?.tokensTotal)
              )}
            </span>
          </div>
        </div>

        <div className={styles.metricItem}>
          <div className={cn(styles.metricIconWrapper, styles.iconBlue)} aria-hidden="true">
            <Zap size={22} />
          </div>
          <div className={styles.metricData}>
            <span className={styles.metricLabel}>Events</span>
            <span className={styles.metricValue}>
              {isLoading && !metrics ? (
                <span className={styles.shimmer} />
              ) : (
                formatValue(metrics?.eventsProcessed)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetricsObservabilityPanel;
