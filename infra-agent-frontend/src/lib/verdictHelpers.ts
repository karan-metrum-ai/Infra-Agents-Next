/**
 * Direction-aware helpers for rendering Verdict cards.
 *
 * The sandbox evaluator emits a `direction` ("min" or "max") for
 * every verdict. "min" means the actual must be >= target, "max"
 * means the actual must be <= target. The progress bar fills from
 * 0 toward target and turns amber when the metric is barely meeting
 * the threshold (within 10% of failing).
 *
 * Ported verbatim from the Vite app's `lib/verdictHelpers.ts` (Phase 13
 * scope, pulled forward — Phase 9's Verdict components are hard
 * dependents). `Verdict` is imported from the canonical Sandbox type home,
 * `@/features/sandbox/sandboxApi.types`, not redeclared here.
 */

import type { Verdict } from "@/features/sandbox/sandboxApi.types";

/** Verdict states used to drive bar / badge color. */
export type VerdictState = "pass" | "amber" | "fail";

/** Threshold (10%) at which a passing verdict warns "barely passing". */
const AMBER_MARGIN = 0.1;

/**
 * Compute the visual state of a verdict.
 *
 * - fail  : verdict.passed is false
 * - amber : passing but within AMBER_MARGIN of failing
 * - pass  : passing comfortably
 */
export function verdictState(v: Verdict): VerdictState {
  if (!v.passed) return "fail";
  if (v.direction === "min") {
    if (v.target <= 0) return "pass";
    const ratio = v.actual / v.target;
    if (ratio < 1 + AMBER_MARGIN) return "amber";
    return "pass";
  }
  if (v.target <= 0) {
    return v.actual === 0 ? "pass" : "amber";
  }
  const ratio = v.actual / v.target;
  if (ratio > 1 - AMBER_MARGIN) return "amber";
  return "pass";
}

/**
 * Compute the fill width (0..100) and overshoot (0..100, >0 only
 * when the metric has crossed the target on the failing side).
 *
 * `direction = "min"` -> bar fills from 0 toward target, overshoots
 * when actual exceeds target generously.
 * `direction = "max"` -> bar fills from 0 toward target, overshoots
 * (in red) when actual is greater than target.
 */
export interface VerdictBarLayout {
  /** Width of the primary fill (0..100). */
  fillPct: number;
  /** Width of the overshoot segment past the target (0..100). */
  overshootPct: number;
  /** Position of the target marker (0..100). */
  targetPct: number;
}

export function verdictBarLayout(v: Verdict): VerdictBarLayout {
  const target = v.target;
  const actual = v.actual;

  if (v.direction === "min") {
    if (target <= 0) {
      return { fillPct: actual > 0 ? 100 : 0, overshootPct: 0, targetPct: 0 };
    }
    if (actual <= target) {
      const fill = Math.max(0, Math.min((actual / target) * 100, 100));
      return { fillPct: fill, overshootPct: 0, targetPct: 100 };
    }
    const total = Math.max(actual, target * 1.5);
    return {
      fillPct: (target / total) * 100,
      overshootPct: ((actual - target) / total) * 100,
      targetPct: (target / total) * 100,
    };
  }

  if (target <= 0) {
    return { fillPct: 0, overshootPct: actual > 0 ? 100 : 0, targetPct: 0 };
  }

  if (actual <= target) {
    const fill = Math.max(0, Math.min((actual / target) * 100, 100));
    return { fillPct: fill, overshootPct: 0, targetPct: 100 };
  }

  const total = Math.max(actual, target * 1.5);
  return {
    fillPct: (target / total) * 100,
    overshootPct: ((actual - target) / total) * 100,
    targetPct: (target / total) * 100,
  };
}

/**
 * Map a verdict name to the metric tab whose card produced it.
 * The Verdict card uses this to scroll-link to the appropriate
 * deep-dive tab.
 */
export function verdictMetricTab(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("latency")) return "latency";
  if (n.includes("throughput") || n.includes("qps")) return "throughput";
  if (n.includes("atomizer") || n.includes("completion") || n.includes("accuracy")) {
    return "accuracy";
  }
  if (n.includes("error") || n.includes("timeout")) return "errors";
  if (n.includes("token")) return "tokens";
  if (n.includes("task") || n.includes("dag")) return "dag_task";
  if (n.includes("optimization")) return "optimization";
  return "throughput";
}

/**
 * Human-readable direction operator.
 */
export function verdictDirectionLabel(v: Verdict): string {
  return v.direction === "min" ? ">=" : "<=";
}

/**
 * Split a verdict array into failed-first ordering for the grid.
 */
export function orderVerdicts(verdicts: Verdict[]): Verdict[] {
  const failed = verdicts.filter((v) => !v.passed);
  const passed = verdicts.filter((v) => v.passed);
  return [...failed, ...passed];
}
