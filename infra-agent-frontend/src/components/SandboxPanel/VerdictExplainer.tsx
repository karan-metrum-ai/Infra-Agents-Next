import type { Verdict } from "@/features/sandbox/sandboxApi.types";
import styles from "./VerdictExplainer.module.css";

/**
 * VerdictExplainer -- card grid showing each verdict with pass/fail
 * state, actual vs target values, a progress bar, and a plain-English
 * explanation sentence.
 *
 * Ported from the Vite app's `components/SandboxPanel/VerdictExplainer.tsx`.
 * Presentational only (no hooks/state), so it does not need
 * `"use client"`, matching `MetricAtoms.tsx`'s convention.
 */
export interface VerdictExplainerProps {
  verdicts: Verdict[];
}

function isLatency(name: string): boolean {
  return name.toLowerCase().includes("latency");
}

function isAccuracy(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("accuracy") || n.includes("match") || n.includes("rate");
}

function formatActual(v: Verdict): string {
  if (isLatency(v.name)) return `${(v.actual / 1000).toFixed(1)}s`;
  if (isAccuracy(v.name)) return `${(v.actual * 100).toFixed(1)}%`;
  return v.actual.toFixed(3);
}

function formatTarget(v: Verdict): string {
  if (isLatency(v.name)) return `${(v.target / 1000).toFixed(1)}s`;
  if (isAccuracy(v.name)) return `${(v.target * 100).toFixed(1)}%`;
  return `${v.target}${v.unit ? ` ${v.unit}` : ""}`;
}

function explain(v: Verdict): string {
  const actual = formatActual(v);
  const target = formatTarget(v);
  const n = v.name.toLowerCase();

  if (n === "latency_p95" || n === "latency_p99") {
    const lbl = n === "latency_p95" ? "P95" : "P99";
    return v.passed
      ? `${lbl} latency (${actual}) is within the ${target} target.`
      : `${lbl} latency (${actual}) exceeds the ${target} target.`;
  }
  if (n.includes("latency")) {
    const lbl = v.name.replace(/_/g, " ");
    return v.passed
      ? `${lbl} (${actual}) is within the ${target} target.`
      : `${lbl} (${actual}) exceeds the ${target} target.`;
  }
  if (n === "accuracy") {
    return v.passed
      ? `Mean accuracy (${actual}) meets the ${target} threshold.`
      : `Mean accuracy (${actual}) is below the ${target} threshold.`;
  }
  if (isAccuracy(v.name)) {
    const lbl = v.name.replace(/_/g, " ");
    return v.passed
      ? `${lbl} (${actual}) meets the ${target} threshold.`
      : `${lbl} (${actual}) is below the ${target} threshold.`;
  }
  return `${v.name}: ${actual} vs target ${target}`;
}

/**
 * Returns 0–100 percentage for the progress bar.
 * For min-direction metrics (lower is better), full bar = at or below target.
 */
function barPercent(v: Verdict): number {
  if (v.target === 0) return 0;
  const lowerIsBetter = v.direction === "min" || isLatency(v.name);
  if (lowerIsBetter) {
    return Math.min((v.target / Math.max(v.actual, 0.0001)) * 100, 100);
  }
  return Math.min((v.actual / v.target) * 100, 100);
}

export function VerdictExplainer({ verdicts }: VerdictExplainerProps) {
  if (!verdicts || verdicts.length === 0) return null;

  return (
    <div className={styles.verdictsGrid}>
      {verdicts.map((v) => {
        const pct = barPercent(v);
        const cardClass = [
          styles.verdictCard,
          v.passed ? styles.verdictCardPass : styles.verdictCardFail,
        ].join(" ");

        return (
          <div key={v.name} className={cardClass}>
            <div className={styles.verdictCardTop}>
              <span className={styles.verdictName}>{v.name.replace(/_/g, " ")}</span>
              <span
                className={[
                  styles.verdictPill,
                  v.passed ? styles.verdictPillPass : styles.verdictPillFail,
                ].join(" ")}
              >
                {v.passed ? "Pass" : "Fail"}
              </span>
            </div>

            <div className={styles.verdictValues}>
              <div className={styles.verdictActual}>
                <span className={styles.verdictActualValue}>{formatActual(v)}</span>
                <span className={styles.verdictActualLabel}>Actual</span>
              </div>
              <div className={styles.verdictTarget}>
                <span className={styles.verdictTargetValue}>{formatTarget(v)}</span>
                <span className={styles.verdictTargetLabel}>Target</span>
              </div>
            </div>

            <div className={styles.verdictBar}>
              <div
                className={[styles.verdictBarFill, !v.passed ? styles.verdictBarFillFail : ""].join(
                  " ",
                )}
                style={{ width: `${pct}%` }}
              />
              <div className={`${styles.verdictBarTarget} ${styles.verdictBarTargetEnd}`} />
            </div>

            <span className={styles.explainText}>{explain(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default VerdictExplainer;
