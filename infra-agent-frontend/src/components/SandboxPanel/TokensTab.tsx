"use client";

import { useMemo } from "react";
import { formatInt, formatNum } from "@/lib/formatters";
import type { QueryScore, TokenMetrics } from "@/features/sandbox/sandboxApi.types";
import { BarRow, Kpi, TabEmpty } from "./MetricAtoms";
import styles from "./TokensTab.module.css";

/**
 * Tokens tab -- input/output stacked bar plus KPI grid covering all token
 * metric fields documented in the API guide.
 *
 * When per-query `token_usage` is available from `QueryScore`, it is
 * aggregated and displayed alongside the standard `TokenMetrics`.
 *
 * Ported from the Vite app's `components/SandboxPanel/TokensTab.tsx`.
 * No type-narrowing deviation needed: every field this component reads is
 * already a named field on the canonical `TokenMetrics` interface.
 */

interface TokensTabProps {
  data: TokenMetrics | null | undefined;
  queryScores?: QueryScore[];
}

export function TokensTab({ data, queryScores }: TokensTabProps) {
  const perQueryAgg = useMemo(() => {
    if (!queryScores || queryScores.length === 0) return null;
    const withTokens = queryScores.filter((q) => q.token_usage);
    if (withTokens.length === 0) return null;
    const totals = withTokens.reduce(
      (acc, q) => {
        const t = q.token_usage!;
        return {
          prompt: acc.prompt + t.prompt_tokens,
          completion: acc.completion + t.completion_tokens,
          total: acc.total + t.total_tokens,
        };
      },
      { prompt: 0, completion: 0, total: 0 },
    );
    return {
      ...totals,
      count: withTokens.length,
      avgPerQuery: totals.total / withTokens.length,
    };
  }, [queryScores]);

  if (!data && !perQueryAgg) return <TabEmpty />;

  const phaseTokens = data
    ? {
        Atomizer: data.atomizer_tokens_est || 0,
        Planner: data.planner_tokens_est || 0,
        Execution: data.execution_tokens_est || 0,
        Aggregation: data.aggregation_tokens_est || 0,
      }
    : null;
  const maxPhase = phaseTokens ? Math.max(...Object.values(phaseTokens), 1) : 0;

  const inTotal = data?.total_input_tokens || 0;
  const outTotal = data?.total_output_tokens || 0;
  const reason = data?.total_reasoning_tokens || 0;
  const sumIO = inTotal + outTotal + reason;

  return (
    <div className={styles.tabPanel}>
      {perQueryAgg && (
        <>
          <div className={styles.metricSubtitle}>Per-Query Token Aggregation</div>
          <div className={styles.kpiGrid}>
            <Kpi label="Total Tokens" value={formatInt(perQueryAgg.total)} />
            <Kpi label="Prompt Tokens" value={formatInt(perQueryAgg.prompt)} />
            <Kpi label="Completion Tokens" value={formatInt(perQueryAgg.completion)} />
            <Kpi label="Avg/Query" value={formatNum(perQueryAgg.avgPerQuery)} />
          </div>
          {perQueryAgg.total > 0 && (
            <div className={styles.stackBar}>
              <div
                className={styles.stackSegmentPrompt}
                style={{ width: `${(perQueryAgg.prompt / perQueryAgg.total) * 100}%` }}
                title={`Prompt ${perQueryAgg.prompt}`}
              >
                {perQueryAgg.prompt > 0 && `prompt ${formatInt(perQueryAgg.prompt)}`}
              </div>
              <div
                className={styles.stackSegmentCompletion}
                style={{ width: `${(perQueryAgg.completion / perQueryAgg.total) * 100}%` }}
                title={`Completion ${perQueryAgg.completion}`}
              >
                {perQueryAgg.completion > 0 && `completion ${formatInt(perQueryAgg.completion)}`}
              </div>
            </div>
          )}
        </>
      )}

      {data && (
        <div className={styles.kpiGrid}>
          <Kpi label="Total Tokens" value={formatInt(data.total_tokens)} />
          <Kpi label="Input Tokens" value={formatInt(inTotal)} />
          <Kpi label="Output Tokens" value={formatInt(outTotal)} />
          <Kpi label="Reasoning Tokens" value={formatInt(reason)} />
          <Kpi label="Avg/Query" value={formatNum(data.avg_tokens_per_query)} />
          <Kpi label="Avg Input/Query" value={formatNum(data.avg_input_tokens_per_query)} />
          <Kpi label="Avg Output/Query" value={formatNum(data.avg_output_tokens_per_query)} />
          <Kpi label="Peak/Query" value={formatInt(data.peak_tokens_per_query)} />
          <Kpi label="Tokens/Task" value={formatNum(data.tokens_per_task)} />
          <Kpi label="Efficiency" value={formatNum(data.token_efficiency)} />
        </div>
      )}

      {sumIO > 0 && (
        <>
          <div className={styles.metricSubtitle}>Input vs Output (stacked)</div>
          <div className={styles.stackBar}>
            <div
              className={styles.stackSegmentPrompt}
              style={{ width: `${(inTotal / sumIO) * 100}%` }}
              title={`Input ${inTotal}`}
            >
              {inTotal > 0 && `in ${formatInt(inTotal)}`}
            </div>
            <div
              className={styles.stackSegmentCompletion}
              style={{ width: `${(outTotal / sumIO) * 100}%` }}
              title={`Output ${outTotal}`}
            >
              {outTotal > 0 && `out ${formatInt(outTotal)}`}
            </div>
            <div
              className={styles.stackSegmentReasoning}
              style={{ width: `${(reason / sumIO) * 100}%` }}
              title={`Reasoning ${reason}`}
            >
              {reason > 0 && `r ${formatInt(reason)}`}
            </div>
          </div>
        </>
      )}

      {phaseTokens && (
        <>
          <div className={styles.metricSubtitle}>Tokens by Phase (estimated)</div>
          <div className={styles.barChart}>
            {Object.entries(phaseTokens).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={maxPhase} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TokensTab;
