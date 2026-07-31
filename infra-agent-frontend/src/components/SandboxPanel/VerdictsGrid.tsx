import { Target } from "lucide-react";
import { orderVerdicts, verdictMetricTab } from "@/lib/verdictHelpers";
import type { Verdict } from "@/features/sandbox/sandboxApi.types";
import { VerdictCard } from "./VerdictCard";
import styles from "./VerdictsGrid.module.css";

/**
 * VerdictsGrid -- Layer 2 of the Sandbox Panel.
 *
 * Renders the 10 verdicts that determine pass/fail. Failed verdicts
 * appear first so customers see what broke before what worked. Each
 * card scrolls/links to the appropriate metric tab.
 *
 * Ported from the Vite app's `components/SandboxPanel/VerdictsGrid.tsx`.
 * Presentational only (no hooks/state of its own -- click handling is
 * delegated to `VerdictCard`), so it does not need `"use client"`,
 * matching `MetricAtoms.tsx`'s convention.
 */
export interface VerdictsGridProps {
  verdicts: Verdict[];
  onVerdictClick?: (verdict: Verdict, metricTab: string) => void;
  isLoading?: boolean;
}

export function VerdictsGrid({ verdicts, onVerdictClick, isLoading = false }: VerdictsGridProps) {
  if (isLoading && verdicts.length === 0) {
    return (
      <div className={styles.verdictsGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key -- static placeholder count, list never reorders
          <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </div>
    );
  }

  if (verdicts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Target size={28} className={styles.emptyStateIcon} />
        <div className={styles.emptyStateTitle}>No verdicts yet</div>
        <div className={styles.emptyStateBody}>
          Verdicts arrive once the load test phase completes. Targets are evaluated against the
          configured thresholds.
        </div>
      </div>
    );
  }

  const ordered = orderVerdicts(verdicts);

  return (
    <div className={styles.verdictsGrid}>
      {ordered.map((v) => (
        <VerdictCard
          key={v.name}
          verdict={v}
          onClick={(verdict) => onVerdictClick?.(verdict, verdictMetricTab(verdict.name))}
        />
      ))}
    </div>
  );
}

export default VerdictsGrid;
