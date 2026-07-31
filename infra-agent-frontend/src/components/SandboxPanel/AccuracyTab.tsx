import { formatPct } from "@/lib/formatters";
import type { AccuracyMetrics } from "@/features/sandbox/sandboxApi.types";
import { Kpi, Ring, TabEmpty } from "./MetricAtoms";
import styles from "./AccuracyTab.module.css";

/**
 * Accuracy tab -- ring charts for primary accuracy metrics from completed
 * queries, plus a KPI grid with all scoring dimensions.
 *
 * Ported from the Vite app's `components/SandboxPanel/AccuracyTab.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 *
 * Deviation from source (documented): `mean_score`/`tool_call_match_rate`/
 * `param_match_rate`/`order_valid_rate`/`reasoning_rate`/`completed_queries`/
 * `total_queries` aren't part of the canonical `AccuracyMetrics` interface's
 * named fields (it declares `atomizer_*`/`planner_*`/`task_completion_rate`/
 * `query_success_rate` plus a `[k: string]: unknown` catch-all for the rest
 * of the real wire shape). Narrowed here via a local `AccuracyMetricsExt`
 * intersection type, matching the `ReportSummary.tsx` precedent rather than
 * widening the shared type or using `any`.
 */

type AccuracyMetricsExt = AccuracyMetrics & {
  mean_score?: number;
  tool_call_match_rate?: number;
  param_match_rate?: number;
  order_valid_rate?: number;
  reasoning_rate?: number;
  completed_queries?: number;
  total_queries?: number;
};

interface AccuracyTabProps {
  data: AccuracyMetrics | null | undefined;
}

export function AccuracyTab({ data }: AccuracyTabProps) {
  if (!data) return <TabEmpty />;

  const d = data as AccuracyMetricsExt;

  const meanScore = d.mean_score ?? d.atomizer_accuracy ?? 0;
  const toolMatch = d.tool_call_match_rate ?? d.planner_agent_match_rate ?? 0;
  const paramMatch = d.param_match_rate ?? 0;
  const orderValid = d.order_valid_rate ?? 0;
  const reasoning = d.reasoning_rate ?? 0;
  const successRate = d.query_success_rate ?? 0;
  const completionRate = d.task_completion_rate ?? 0;
  const completedQueries = d.completed_queries ?? 0;
  const totalQueries = d.total_queries ?? 0;

  return (
    <div className={styles.tabPanel}>
      {totalQueries > 0 && completedQueries < totalQueries && (
        <div className={styles.scopeNote}>
          Scores computed from {completedQueries} completed queries out of {totalQueries} total (
          {totalQueries - completedQueries} rejected/failed)
        </div>
      )}

      <div className={styles.ringRow}>
        <Ring label="Mean Score" value={meanScore} color="var(--primary)" />
        <Ring label="Tool Match" value={toolMatch} color="var(--success)" />
        <Ring label="Param Match" value={paramMatch} color="var(--warning)" />
        <Ring
          label="Acceptance Rate"
          value={totalQueries > 0 ? completedQueries / totalQueries : 0}
          color="var(--success)"
        />
      </div>

      <div className={styles.kpiGrid}>
        <Kpi label="Order Valid" value={formatPct(orderValid)} />
        <Kpi label="Reasoning" value={formatPct(reasoning)} />
        <Kpi label="Success Rate" value={formatPct(successRate)} />
        <Kpi label="Task Completion" value={formatPct(completionRate)} />
        <Kpi label="Completed" value={`${completedQueries}`} />
        <Kpi label="Total Submitted" value={`${totalQueries}`} />
      </div>
    </div>
  );
}

export default AccuracyTab;
