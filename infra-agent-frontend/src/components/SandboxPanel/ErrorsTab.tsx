import type { ErrorMetrics } from "@/features/sandbox/sandboxApi.types";
import { BarRow, Gauge, Kpi, TabEmpty } from "./MetricAtoms";
import styles from "./ErrorsTab.module.css";

/**
 * Errors tab -- total errors KPI + breakdown bar chart by type + timeout
 * rate gauge.
 *
 * Ported from the Vite app's `components/SandboxPanel/ErrorsTab.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 *
 * No type-narrowing deviation needed here (unlike most of the other tabs):
 * every field this component reads (`total_errors`, `error_rate`,
 * `errors_by_type`, `timeout_count`, `timeout_rate`, `rejection_count`) is
 * already a named field on the canonical `ErrorMetrics` interface.
 */

interface ErrorsTabProps {
  data: ErrorMetrics | null | undefined;
}

function safeInt(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "0";
  return String(Math.round(v));
}

function safePct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "0%";
  return `${(v * 100).toFixed(1)}%`;
}

export function ErrorsTab({ data }: ErrorsTabProps) {
  if (!data) return <TabEmpty />;

  const byType = data.errors_by_type ?? {};
  const hasBreakdown = Object.keys(byType).length > 0;
  const maxByType = hasBreakdown ? Math.max(...Object.values(byType), 1) : 1;

  const rejectedCount = byType.rejected ?? data.rejection_count ?? 0;
  const timeoutCount = data.timeout_count ?? 0;

  return (
    <div className={styles.tabPanel}>
      <div className={styles.kpiGrid}>
        <Kpi label="Total Errors" value={safeInt(data.total_errors)} />
        <Kpi label="Error Rate" value={safePct(data.error_rate)} />
        <Kpi label="Timeouts" value={safeInt(timeoutCount)} />
        <Kpi label="Rejections" value={safeInt(rejectedCount)} />
        <Kpi label="Timeout Rate" value={safePct(data.timeout_rate)} />
      </div>

      {(data.timeout_rate ?? 0) > 0 && (
        <div className={styles.gaugeRow}>
          <Gauge label="Timeout Rate" value={data.timeout_rate ?? 0} color="var(--warning)" />
        </div>
      )}

      {!hasBreakdown && data.total_errors === 0 && (
        <div className={styles.emptyStateInline}>No errors -- all queries succeeded</div>
      )}

      {hasBreakdown && (
        <>
          <div className={styles.metricSubtitle}>Errors by Type</div>
          <div className={styles.barChart}>
            {Object.entries(byType).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={maxByType} color="error" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ErrorsTab;
