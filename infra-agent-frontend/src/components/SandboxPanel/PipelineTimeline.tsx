"use client";

/**
 * PipelineTimeline -- vertical stepper with connected nodes.
 *
 * Shows the 3 pipeline phases (starter, runner, reporter) as a
 * connected stepper. Each phase expands to show sub-steps driven by
 * SSE `metric_update` events.
 *
 * Behaviour (ported verbatim from the Vite app):
 *  - Running phase: auto-expanded; first incomplete step shows spinner;
 *    spinning ring around phase node.
 *  - Completed phase: all sub-steps shown as done; panel auto-collapses
 *    with a toggle to re-expand.
 *  - Failed phase: auto-expanded; red styling; scrolled into view.
 *  - Pending phase: collapsed; no sub-steps shown.
 *
 * Adaptation notes:
 *  - The source used a bare `useEffect` keyed on `failedPhaseFocus` to
 *    call `scrollIntoView`. Per this app's zero-`useEffect` discipline
 *    (`.cursor/skills/sans-effect`), the same "jump to the failed phase"
 *    behavior is reproduced without an effect: the moment a phase becomes
 *    the failed-focus target its row is given a distinct `key`, forcing a
 *    one-time remount, and a plain callback `ref` (attached only to that
 *    row) calls `scrollIntoView` as soon as the new DOM node mounts —
 *    Pattern 4/5 (mount-time DOM sync via key-based remount), not a
 *    genuinely mount-only effect.
 *  - `PhaseDetailDrawer` is similarly given `key={openPhase ?? "none"}` so
 *    clicking directly from one open phase to another forces a clean
 *    remount (fresh focus-trap init) instead of silently mutating props
 *    on a still-mounted dialog.
 *  - Tailwind's `animate-spin` utility (banned in this app) is replaced by
 *    a co-located `.spinIcon` CSS Module class driving the app's global
 *    `spin` keyframe (see `globals.css`), matching `SandboxConfigForm.tsx`'s
 *    established `styles.spinIcon` convention.
 */

import { useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";

import { formatDuration } from "@/lib/formatters";
import {
  PHASE_LABELS,
  PHASE_ORDER,
  REPORTER_STEP_LABELS,
  REPORTER_STEPS,
  RUNNER_STEP_LABELS,
  RUNNER_STEPS,
  STARTER_STEP_LABELS,
  STARTER_STEPS,
  type SandboxPhase,
  type SandboxSseEvent,
} from "@/features/sandbox/sandboxApi.types";
import PhaseDetailDrawer from "./PhaseDetailDrawer";
import styles from "./PipelineTimeline.module.css";

interface PipelineTimelineProps {
  phases: SandboxPhase[];
  /** Accepted for parity with the Vite call site's prop shape; not read
   * here (the source component itself never used it either — it was
   * destructured as `_currentPhase` and discarded). */
  currentPhase?: string | null;
  failedPhaseFocus?: string | null;
  events?: SandboxSseEvent[];
}

type StepState = "done" | "running" | "pending";

function resolveStepState(
  step: string,
  orderedKeys: readonly string[],
  completedSteps: Set<string>,
  phaseStatus: string,
): StepState {
  if (completedSteps.has(step)) return "done";
  // If the phase completed, all steps are implicitly done even if
  // metric_update events weren't received for each one.
  if (phaseStatus === "completed") return "done";
  if (phaseStatus !== "running") return "pending";
  // Within a running phase, the first incomplete step is "running".
  const firstIncomplete = orderedKeys.find((s) => !completedSteps.has(s));
  return firstIncomplete === step ? "running" : "pending";
}

const PHASE_STEP_CONFIG: Record<
  string,
  { keys: readonly string[]; labels: Record<string, string> }
> = {
  starter: { keys: STARTER_STEPS, labels: STARTER_STEP_LABELS },
  runner: { keys: RUNNER_STEPS, labels: RUNNER_STEP_LABELS },
  reporter: { keys: REPORTER_STEPS, labels: REPORTER_STEP_LABELS },
};

/** Default expansion: running/failed = open, completed/pending = closed. */
function defaultExpanded(status: string): boolean {
  return status === "running" || status === "failed";
}

/** Mount-time DOM sync for whichever row is currently the failed-focus
 * target -- see the file-level doc comment for why this replaces a
 * `useEffect`. Attached only to that one row via a key-forced remount. */
function scrollFocusedPhaseIntoView(node: HTMLDivElement | null) {
  node?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Stable reference so the `events` default doesn't break referential
 * equality (and re-trigger the `useMemo`s below) on every render. */
const EMPTY_EVENTS: SandboxSseEvent[] = [];

export function PipelineTimeline({
  phases,
  failedPhaseFocus,
  events = EMPTY_EVENTS,
}: PipelineTimelineProps) {
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  // User-controlled overrides: undefined = use default, true/false = explicit.
  const [expandOverrides, setExpandOverrides] = useState<Record<string, boolean>>({});

  const phaseMap = useMemo(() => {
    const map: Record<string, SandboxPhase> = {};
    for (const p of phases) map[p.name] = p;
    return map;
  }, [phases]);

  const completedSteps = useMemo(() => {
    const steps = new Set<string>();
    for (const evt of events) {
      if (evt.event_type === "metric_update") {
        const step = evt.data?.step as string | undefined;
        if (step) steps.add(step);
      }
    }
    return steps;
  }, [events]);

  const queryProgress = useMemo(() => {
    let scored = 0;
    let total = 0;
    for (const evt of events) {
      if (evt.event_type === "query_scored") {
        const idx = (evt.data?.query_idx as number) ?? 0;
        const t = (evt.data?.total as number) ?? 0;
        if (idx + 1 > scored) scored = idx + 1;
        if (t > total) total = t;
      }
    }
    return { scored, total };
  }, [events]);

  const isExpanded = (key: string, status: string): boolean => {
    if (key in expandOverrides) return expandOverrides[key];
    return defaultExpanded(status);
  };

  const toggleExpand = (key: string, status: string) => {
    setExpandOverrides((prev) => ({
      ...prev,
      [key]: !isExpanded(key, status),
    }));
  };

  const renderSubsteps = (phaseKey: string, status: string) => {
    const config = PHASE_STEP_CONFIG[phaseKey];
    if (!config) return null;

    return (
      <div className={styles.stepperSubsteps}>
        {config.keys.map((step) => {
          const state = resolveStepState(step, config.keys, completedSteps, status);
          return (
            <div
              key={step}
              className={`${styles.stepperSubstepItem} ${
                state === "running" ? styles.stepperSubstepItemRunning : ""
              }`}
            >
              <div
                className={`${styles.stepperSubstepIcon} ${
                  state === "done"
                    ? styles.stepperSubstepIconDone
                    : state === "running"
                      ? styles.stepperSubstepIconRunning
                      : styles.stepperSubstepIconPending
                }`}
              >
                {state === "done" && <Check size={10} strokeWidth={3} aria-hidden="true" />}
                {state === "running" && (
                  <Loader2 size={10} className={styles.spinIcon} aria-hidden="true" />
                )}
              </div>
              <span
                className={`${styles.stepperSubstepLabel} ${
                  state === "done"
                    ? styles.stepperSubstepLabelDone
                    : state === "running"
                      ? styles.stepperSubstepLabelRunning
                      : ""
                }`}
              >
                {config.labels[step] ?? step}
              </span>
            </div>
          );
        })}

        {phaseKey === "runner" && queryProgress.total > 0 && (
          <div className={styles.stepperQueryProgress}>
            <div className={styles.stepperQueryProgressBar}>
              <div
                className={styles.stepperQueryProgressFill}
                style={{
                  width: `${Math.round((queryProgress.scored / queryProgress.total) * 100)}%`,
                }}
              />
            </div>
            <span className={styles.stepperQueryProgressLabel}>
              {queryProgress.scored}/{queryProgress.total} queries
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Pipeline</h3>
        <span className={styles.sectionSubtitle}>Execution</span>
      </div>

      <div className={styles.stepperWrap}>
        {PHASE_ORDER.map((key, idx) => {
          const isLast = idx === PHASE_ORDER.length - 1;
          const p = phaseMap[key];
          const status = p?.status ?? "pending";
          const isFailedFocus = failedPhaseFocus === key;
          const expanded = isExpanded(key, status);
          const hasSubsteps = status === "running" || status === "completed" || status === "failed";

          const dotClass =
            status === "completed"
              ? styles.stepperDotDone
              : status === "running"
                ? styles.stepperDotRunning
                : status === "failed"
                  ? styles.stepperDotFailed
                  : styles.stepperDotPending;

          const lineClass =
            status === "completed"
              ? styles.stepperLineDone
              : status === "running"
                ? styles.stepperLineRunning
                : "";

          return (
            <div
              key={isFailedFocus ? `${key}--focused` : key}
              className={styles.stepperItem}
              ref={isFailedFocus ? scrollFocusedPhaseIntoView : undefined}
            >
              {/* Left: node + connector line */}
              <div className={styles.stepperNodeCol}>
                <div className={`${styles.stepperDot} ${dotClass}`}>
                  {status === "completed" && (
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  )}
                  {status === "failed" && <X size={14} strokeWidth={2.5} aria-hidden="true" />}
                  {status === "running" && (
                    <span className={styles.stepperDotPulse} aria-hidden="true" />
                  )}
                </div>
                {!isLast && <div className={`${styles.stepperLine} ${lineClass}`} />}
              </div>

              {/* Right: phase header + collapsible sub-steps */}
              <div className={styles.stepperContent}>
                <div
                  className={styles.stepperPhaseRow}
                  onClick={() => setOpenPhase(key)}
                  // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- can't be a real `<button>`: it contains a nested `<button>` (the expand/collapse toggle below), which is invalid HTML. `role="button"` + `tabIndex`/`onKeyDown` reproduce full keyboard/screen-reader semantics instead.
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setOpenPhase(key);
                  }}
                >
                  <div className={styles.stepperPhaseInfo}>
                    <span className={styles.stepperPhaseName}>{PHASE_LABELS[key] ?? key}</span>
                    {status === "running" && (
                      <span
                        className={`${styles.stepperPhaseStatusPill} ${styles.stepperPhaseStatusPillRunning}`}
                      >
                        Running
                      </span>
                    )}
                    {status === "failed" && (
                      <span
                        className={`${styles.stepperPhaseStatusPill} ${styles.stepperPhaseStatusPillFailed}`}
                      >
                        Failed
                      </span>
                    )}
                  </div>

                  <div className={styles.stepperPhaseActions}>
                    {p?.duration_s != null && (
                      <span className={styles.ganttDuration}>{formatDuration(p.duration_s)}</span>
                    )}
                    {hasSubsteps && (
                      <button
                        type="button"
                        className={`${styles.stepperToggle} ${expanded ? styles.stepperToggleOpen : ""}`}
                        onClick={(e) => {
                          // Stop the click from bubbling to the phase row's
                          // own `onClick` (which opens the detail drawer) --
                          // only this button's own action should fire.
                          e.stopPropagation();
                          toggleExpand(key, status);
                        }}
                        aria-label={
                          expanded
                            ? `Collapse ${PHASE_LABELS[key] ?? key} steps`
                            : `Expand ${PHASE_LABELS[key] ?? key} steps`
                        }
                        aria-expanded={expanded}
                      >
                        <ChevronDown size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                {hasSubsteps && expanded && renderSubsteps(key, status)}
              </div>
            </div>
          );
        })}
      </div>

      <PhaseDetailDrawer
        key={openPhase ?? "none"}
        phaseKey={openPhase}
        phase={openPhase ? (phaseMap[openPhase] ?? null) : null}
        onClose={() => setOpenPhase(null)}
      />
    </section>
  );
}

export default PipelineTimeline;
