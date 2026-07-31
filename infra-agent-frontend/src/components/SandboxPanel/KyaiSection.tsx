import { Brain } from "lucide-react";
import { formatPct, humanize } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { KyaiEvaluation } from "@/features/sandbox/sandboxApi.types";
import { KyaiScoreBreakdown } from "./KyaiScoreBreakdown";
import styles from "./KyaiSection.module.css";

/**
 * KyaiSection -- KYAI sub-evaluator averages + per-query confidence table.
 *
 * KYAI is treated as an optional sub-evaluator of the sandbox run: only
 * render the full breakdown when `evaluation` (report.kyai_evaluation) is
 * non-null. When the run was started without a `kyai_url`, show a subtle
 * "not enabled" hint instead of hiding the section entirely, so customers
 * know the capability exists -- this empty/disabled-state messaging (incl.
 * the "Enable for re-run" action) is preserved verbatim from the source,
 * per the migration's explicit requirement not to drop it.
 *
 * Ported from the Vite app's `components/SandboxPanel/KyaiSection.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 */
interface KyaiSectionProps {
  evaluation: KyaiEvaluation | null;
  /** True when the run was submitted without a kyai_url. */
  configured: boolean;
  onEnableForRerun?: () => void;
}

function confidenceClass(confidence: number): string {
  if (confidence >= 0.8) return styles.confidenceHigh;
  if (confidence >= 0.5) return styles.confidenceMid;
  return styles.confidenceLow;
}

export function KyaiSection({ evaluation, configured, onEnableForRerun }: KyaiSectionProps) {
  if (!evaluation && !configured) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Brain size={16} className={styles.titleIcon} aria-hidden="true" />
            KYAI Evaluation
          </h3>
          <span className={styles.sectionSubtitle}>Sub-evaluator</span>
        </div>
        <div className={styles.emptyStateInline}>
          KYAI scoring not enabled for this run.
          <button type="button" className={styles.footerLink} onClick={onEnableForRerun}>
            Enable for re-run
          </button>
        </div>
      </section>
    );
  }

  if (!evaluation) return null;

  const perQuery = evaluation.per_query ?? [];
  const averages = (() => {
    if (perQuery.length === 0) return null;
    const sum = perQuery.reduce(
      (acc, q) => ({
        tool: acc.tool + (q.tool_match ?? 0),
        param: acc.param + (q.param_match ?? 0),
        order: acc.order + (q.order_valid ?? 0),
        reasoning: acc.reasoning + (q.reasoning ?? 0),
      }),
      { tool: 0, param: 0, order: 0, reasoning: 0 },
    );
    const n = perQuery.length;
    return {
      tool: sum.tool / n,
      param: sum.param / n,
      order: sum.order / n,
      reasoning: sum.reasoning / n,
    };
  })();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <Brain size={16} className={styles.titleIcon} aria-hidden="true" />
          KYAI Evaluation
        </h3>
        <span className={styles.sectionSubtitle}>
          Overall confidence{" "}
          <strong className={styles.confidenceValue}>
            {formatPct(evaluation.overall_confidence ?? 0)}
          </strong>
        </span>
      </div>

      {averages && (
        <>
          <div className={styles.groupLabel}>Average across {perQuery.length} queries</div>
          <KyaiScoreBreakdown
            toolMatch={averages.tool}
            paramMatch={averages.param}
            orderValid={averages.order}
            reasoning={averages.reasoning}
            weights={{
              toolMatch: evaluation.tool_match_weight,
              paramMatch: evaluation.param_match_weight,
              orderValid: evaluation.order_valid_weight,
              reasoning: evaluation.reasoning_weight,
            }}
          />
        </>
      )}

      {perQuery.length > 0 && (
        <>
          <div className={cn(styles.groupLabel, styles.groupLabelSpaced)}>Per-query confidence</div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Query</th>
                  <th scope="col">Tool</th>
                  <th scope="col">Param</th>
                  <th scope="col">Order</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {perQuery.map((q, i) => (
                  <tr key={q.query_id ?? i}>
                    <td className={cn(styles.cellMono, styles.queryCell)}>
                      {(q.query ?? humanize(q.query_id ?? `Q${i + 1}`)).slice(0, 100)}
                    </td>
                    <td className={styles.cellMono}>{formatPct(q.tool_match)}</td>
                    <td className={styles.cellMono}>{formatPct(q.param_match)}</td>
                    <td className={styles.cellMono}>{formatPct(q.order_valid)}</td>
                    <td className={styles.cellMono}>{formatPct(q.reasoning)}</td>
                    <td className={cn(styles.cellMono, confidenceClass(q.confidence))}>
                      {formatPct(q.confidence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default KyaiSection;
