"use client";

import { ArrowDown, ArrowUp, CheckCircle, XCircle } from "lucide-react";
import { formatNum, humanize } from "@/lib/formatters";
import { verdictBarLayout, verdictDirectionLabel, verdictState } from "@/lib/verdictHelpers";
import type { Verdict } from "@/features/sandbox/sandboxApi.types";
import styles from "./VerdictCard.module.css";

/**
 * VerdictCard -- a single direction-aware verdict tile.
 *
 * Hierarchy: the actual value is the headline (large, semibold). The
 * target is supporting context (smaller, muted). A thin status bar at
 * the bottom anchors the relationship visually without stealing focus
 * from the number. The card also carries a 3px left-edge rail that
 * takes its color from the verdict state, so a row of cards
 * immediately reads as "where did we fail?".
 *
 * Ported from the Vite app's `components/SandboxPanel/VerdictCard.tsx`.
 */
export interface VerdictCardProps {
  verdict: Verdict;
  onClick?: (verdict: Verdict) => void;
}

export function VerdictCard({ verdict, onClick }: VerdictCardProps) {
  const state = verdictState(verdict);
  const layout = verdictBarLayout(verdict);

  const cardClass =
    state === "fail"
      ? styles.verdictCardFail
      : state === "amber"
        ? styles.verdictCardAmber
        : styles.verdictCardPass;

  const pillClass =
    state === "fail"
      ? styles.verdictPillFail
      : state === "amber"
        ? styles.verdictPillAmber
        : styles.verdictPillPass;

  const barFillClass =
    state === "fail"
      ? styles.verdictBarFillFail
      : state === "amber"
        ? styles.verdictBarFillAmber
        : "";

  return (
    <button
      type="button"
      className={`${styles.verdictCard} ${cardClass}`}
      onClick={() => onClick?.(verdict)}
    >
      <div className={styles.verdictCardTop}>
        <span className={styles.verdictName}>{humanize(verdict.name)}</span>
        <span className={`${styles.verdictPill} ${pillClass}`}>
          {state === "fail" ? <XCircle size={10} /> : <CheckCircle size={10} />}
          {state === "amber" ? "Near threshold" : verdict.passed ? "Pass" : "Fail"}
        </span>
      </div>

      <div className={styles.verdictValues}>
        <div className={styles.verdictActual}>
          <span className={styles.verdictActualLabel}>Actual</span>
          <span>
            <span className={styles.verdictActualValue}>{formatNum(verdict.actual)}</span>
            {verdict.unit && <span className={styles.verdictActualUnit}>{verdict.unit}</span>}
          </span>
        </div>
        <div className={styles.verdictTarget}>
          <span className={styles.verdictTargetLabel}>Target</span>
          <span className={styles.verdictTargetValue}>
            {verdict.direction === "min" ? (
              <ArrowUp size={11} className={styles.directionIcon} />
            ) : (
              <ArrowDown size={11} className={styles.directionIcon} />
            )}
            {verdictDirectionLabel(verdict)} {formatNum(verdict.target)}
            {verdict.unit ? ` ${verdict.unit}` : ""}
          </span>
        </div>
      </div>

      <div className={styles.verdictBar} aria-hidden="true">
        <div
          className={`${styles.verdictBarFill} ${barFillClass}`}
          style={{ width: `${layout.fillPct}%` }}
        />
        {layout.overshootPct > 0 && (
          <div
            className={styles.verdictBarOvershoot}
            style={{ left: `${layout.targetPct}%`, width: `${layout.overshootPct}%` }}
          />
        )}
        <div className={styles.verdictBarTarget} style={{ left: `${layout.targetPct}%` }} />
      </div>
    </button>
  );
}

export default VerdictCard;
