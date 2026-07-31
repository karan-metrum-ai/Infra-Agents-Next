import { formatPct } from "@/lib/formatters";
import styles from "./KyaiScoreBreakdown.module.css";

/**
 * KyaiScoreBreakdown -- the 4-component KYAI confidence calculation.
 *
 * The KYAI evaluator emits four sub-scores per query (tool_match,
 * param_match, order_valid, reasoning) with fixed weights. This component
 * shows the weighted contribution of each component plus the weighted
 * overall aggregate.
 *
 * Ported from the Vite app's `components/SandboxPanel/KyaiScoreBreakdown.tsx`.
 * Purely a function of props -- no local state/hooks, so no `"use client"`.
 */
interface KyaiScoreBreakdownProps {
  toolMatch: number;
  paramMatch: number;
  orderValid: number;
  reasoning: number;
  weights?: {
    toolMatch?: number;
    paramMatch?: number;
    orderValid?: number;
    reasoning?: number;
  };
}

const DEFAULT_WEIGHTS = {
  toolMatch: 0.5,
  paramMatch: 0.3,
  orderValid: 0.1,
  reasoning: 0.1,
};

export function KyaiScoreBreakdown({
  toolMatch,
  paramMatch,
  orderValid,
  reasoning,
  weights = DEFAULT_WEIGHTS,
}: KyaiScoreBreakdownProps) {
  const components = [
    {
      label: "Tool Match",
      value: toolMatch,
      weight: weights.toolMatch ?? DEFAULT_WEIGHTS.toolMatch,
      tooltip: "Measures whether the planned tools match the expected tool set",
    },
    {
      label: "Param Match",
      value: paramMatch,
      weight: weights.paramMatch ?? DEFAULT_WEIGHTS.paramMatch,
      tooltip: "Measures whether tool parameters are correctly specified",
    },
    {
      label: "Order Valid",
      value: orderValid,
      weight: weights.orderValid ?? DEFAULT_WEIGHTS.orderValid,
      tooltip: "Measures whether tools are planned in the correct execution order",
    },
    {
      label: "Reasoning",
      value: reasoning,
      weight: weights.reasoning ?? DEFAULT_WEIGHTS.reasoning,
      tooltip: "LLM-based evaluation of plan reasoning quality",
    },
  ];

  const overallValue =
    toolMatch * (weights.toolMatch ?? DEFAULT_WEIGHTS.toolMatch) +
    paramMatch * (weights.paramMatch ?? DEFAULT_WEIGHTS.paramMatch) +
    orderValid * (weights.orderValid ?? DEFAULT_WEIGHTS.orderValid) +
    reasoning * (weights.reasoning ?? DEFAULT_WEIGHTS.reasoning);

  return (
    <div className={styles.grid}>
      {components.map((c) => (
        <div className={styles.component} key={c.label} title={c.tooltip}>
          <span className={styles.label}>{c.label}</span>
          <span className={styles.tooltip}>{c.tooltip}</span>
          <span className={styles.weight}>{formatPct(c.weight)} weight</span>
          <span className={styles.value}>{formatPct(c.value)}</span>
        </div>
      ))}
      <div className={styles.component} title="Weighted aggregate of all scoring dimensions">
        <span className={styles.label}>Overall</span>
        <span className={styles.tooltip}>Weighted aggregate of all dimensions</span>
        <span className={styles.weight}>combined</span>
        <span className={styles.value}>{formatPct(overallValue)}</span>
      </div>
    </div>
  );
}

export default KyaiScoreBreakdown;
