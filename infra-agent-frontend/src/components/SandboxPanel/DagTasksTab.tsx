import { formatInt } from "@/lib/formatters";
import type { DagTaskMetrics } from "@/features/sandbox/sandboxApi.types";
import { Kpi, TabEmpty } from "./MetricAtoms";
import styles from "./DagTasksTab.module.css";

/**
 * DAG / Tasks tab -- query acceptance breakdown with a stacked bar showing
 * completed vs rejected vs failed distribution.
 *
 * Ported from the Vite app's `components/SandboxPanel/DagTasksTab.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 *
 * Deviation from source (documented): `total_queries`/`completed_count`/
 * `success_count`/`rejected_count`/`failed_count`/`error_count` aren't part
 * of the canonical `DagTaskMetrics` interface's named fields (it declares
 * DAG-graph-shaped fields like `total_dags_created`/`avg_nodes_per_dag`
 * plus a `[k: string]: unknown` catch-all -- the query-acceptance fields
 * this component actually reads appear to be a second, query-level shape
 * the backend returns under the same `dag_task` metric family in practice).
 * Narrowed here via a local `DagTaskMetricsExt` intersection type, matching
 * the `ReportSummary.tsx` precedent rather than widening the shared type or
 * using `any`.
 */

type DagTaskMetricsExt = DagTaskMetrics & {
  total_queries?: number;
  completed_count?: number;
  success_count?: number;
  rejected_count?: number;
  failed_count?: number;
  error_count?: number;
};

interface DagTasksTabProps {
  data: DagTaskMetrics | null | undefined;
}

export function DagTasksTab({ data }: DagTasksTabProps) {
  if (!data) return <TabEmpty />;

  const d = data as DagTaskMetricsExt;
  const total = d.total_queries ?? 0;
  const completed = d.completed_count ?? d.success_count ?? 0;
  const rejected = d.rejected_count ?? 0;
  const failed = d.failed_count ?? d.error_count ?? 0;
  const sum = Math.max(total, 1);

  return (
    <div className={styles.tabPanel}>
      <div className={styles.kpiGrid}>
        <Kpi label="Total Queries" value={formatInt(total)} />
        <Kpi label="Completed" value={formatInt(completed)} />
        <Kpi label="Rejected" value={formatInt(rejected)} />
        <Kpi label="Failed" value={formatInt(failed)} />
        <Kpi
          label="Acceptance Rate"
          value={total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : "--"}
        />
      </div>

      {total > 0 && (
        <>
          <div className={styles.metricSubtitle}>Query Outcome</div>
          <div className={styles.outcomeBar}>
            {completed > 0 && (
              <div
                className={styles.outcomeCompleted}
                style={{ width: `${(completed / sum) * 100}%` }}
                title={`Completed ${completed}`}
              >
                completed {completed}
              </div>
            )}
            {rejected > 0 && (
              <div
                className={styles.outcomeRejected}
                style={{ width: `${(rejected / sum) * 100}%` }}
                title={`Rejected ${rejected}`}
              >
                rejected {rejected}
              </div>
            )}
            {failed > 0 && (
              <div
                className={styles.outcomeFailed}
                style={{ width: `${(failed / sum) * 100}%` }}
                title={`Failed ${failed}`}
              >
                failed {failed}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DagTasksTab;
