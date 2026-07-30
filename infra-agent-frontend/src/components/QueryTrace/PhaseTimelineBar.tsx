"use client";

/**
 * PhaseTimelineBar - Compact horizontal bar showing all query
 * execution phases with live progression.
 *
 * Phases flow:
 *   atomize -> plan -> verify -> plan_ready -> decision -> execution -> complete
 *
 * Status is driven by deriveFlowLifecycleStatus so the stepper stays aligned
 * with plan bundle + agent_frame phase even when Redux queryStatus is stale.
 */
import { Fragment } from "react";

import { useAppSelector } from "@/hooks/useAppSelector";
import type { PhaseEvent } from "../../features/queryTrace/flowStreamSlice";
import { deriveFlowLifecycleStatus } from "./deriveTraceStatus";
import { useBlockStream } from "./blockStream/useBlockStream";
import { useCompactWidthObserver } from "./useCompactWidthObserver";
import styles from "./PhaseTimelineBar.module.css";

/** Canonical phase order for the progress bar. */
const PHASE_ORDER = [
  { key: "atomize", label: "Atomizing", shortLabel: "Atomize" },
  { key: "plan", label: "Planning", shortLabel: "Plan" },
  { key: "verify", label: "Verifying", shortLabel: "Verify" },
  { key: "plan_ready", label: "Plan Ready", shortLabel: "Ready" },
  { key: "decision", label: "Decision", shortLabel: "Decide" },
  { key: "execution", label: "Executing", shortLabel: "Execute" },
  { key: "complete", label: "Complete", shortLabel: "Done" },
] as const;

type PhaseStatus = "pending" | "active" | "completed" | "failed";

/** Width (px) below which compact labels activate. */
const COMPACT_THRESHOLD = 900;

/* ── Phase status derivation ───────────────────────────────────── */

function derivePhaseStatus(phaseKey: string, events: PhaseEvent[]): PhaseStatus {
  const matching = events.filter((e) => e.phase_name === phaseKey);
  if (matching.length === 0) return "pending";

  const last = matching[matching.length - 1];
  if (
    last.phase_status === "completed" ||
    last.phase_status === "approve" ||
    last.phase_status === "approved"
  ) {
    return "completed";
  }
  if (
    last.phase_status === "failed" ||
    last.phase_status === "reject" ||
    last.phase_status === "rejected" ||
    last.phase_status === "denied"
  ) {
    return "failed";
  }
  return "active";
}

function resolvePhaseStatuses(events: PhaseEvent[]): PhaseStatus[] {
  const statuses: PhaseStatus[] = PHASE_ORDER.map((p) => derivePhaseStatus(p.key, events));

  const extraPhases = events.map((e) => e.phase_name);
  if (extraPhases.includes("query_submitted") && statuses[0] === "pending") {
    statuses[0] = "active";
  }

  let lastActiveIdx = -1;
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (statuses[i] === "active" || statuses[i] === "completed" || statuses[i] === "failed") {
      lastActiveIdx = i;
      break;
    }
  }
  for (let i = 0; i < lastActiveIdx; i++) {
    if (statuses[i] === "pending" || statuses[i] === "active") {
      statuses[i] = "completed";
    }
  }

  return statuses;
}

function applyLifecycleToStatuses(
  statuses: PhaseStatus[],
  lifecycle: ReturnType<typeof deriveFlowLifecycleStatus>,
): void {
  const planReadyIdx = PHASE_ORDER.findIndex((p) => p.key === "plan_ready");
  const decisionIdx = PHASE_ORDER.findIndex((p) => p.key === "decision");
  const execIdx = PHASE_ORDER.findIndex((p) => p.key === "execution");
  const completeIdx = PHASE_ORDER.findIndex((p) => p.key === "complete");

  if (lifecycle === "planning") {
    if (statuses.every((s) => s === "pending")) {
      // TS narrows `statuses`'s element type from the `.every` check above;
      // cast back to the full union to allow reassigning a different status.
      (statuses as PhaseStatus[])[0] = "active";
    }
    return;
  }

  if (lifecycle === "awaiting_approval") {
    if (planReadyIdx !== -1) {
      for (let i = 0; i <= planReadyIdx; i++) {
        statuses[i] = "completed";
      }
    }
    if (decisionIdx !== -1) {
      statuses[decisionIdx] = "active";
    }
    return;
  }

  if (lifecycle === "executing") {
    if (decisionIdx !== -1) {
      for (let i = 0; i <= decisionIdx; i++) {
        statuses[i] = "completed";
      }
    }
    if (execIdx !== -1) {
      statuses[execIdx] = "active";
    }
    return;
  }

  if (lifecycle === "completed") {
    for (let i = 0; i < statuses.length; i++) {
      statuses[i] = "completed";
    }
    return;
  }

  if (lifecycle === "failed") {
    const activeIdx = statuses.findIndex((s) => s === "active");
    if (activeIdx !== -1) {
      statuses[activeIdx] = "failed";
    } else if (decisionIdx !== -1) {
      statuses[decisionIdx] = "failed";
    }
    if (completeIdx !== -1 && statuses[completeIdx] === "pending") {
      statuses[completeIdx] = "pending";
    }
  }
}

/* ── Component ─────────────────────────────────────────────────── */

function PhaseTimelineBar() {
  const phases = useAppSelector((s) => s.flowStream.phases);
  const queryStatus = useAppSelector((s) => s.flowStream.queryStatus);
  const planStatus = useAppSelector((s) => s.flowStream.planBundle?.status);
  const blockSnapshot = useBlockStream();

  const { containerRef, compact } = useCompactWidthObserver(COMPACT_THRESHOLD);

  if (phases.length === 0 && queryStatus === "idle") {
    return null;
  }

  const lifecycle = deriveFlowLifecycleStatus({
    queryStatus,
    planStatus,
    blockPhase: blockSnapshot.phase,
  });

  const statuses = resolvePhaseStatuses(phases);
  applyLifecycleToStatuses(statuses, lifecycle);

  const renderIndicator = (status: PhaseStatus, isActive: boolean) => (
    <div className={styles.indicatorWrap}>
      {isActive && <div className={styles.spinnerRing} />}
      <div className={styles.phaseIndicator}>
        {status === "completed" && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5L4.5 7.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {isActive && <div className={styles.phasePulse} />}
        {status === "failed" && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 3L7 7M7 3L3 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`${styles.phaseBar} ${compact ? styles.phaseBarCompact : ""}`}
    >
      <div className={styles.phaseTrack}>
        {PHASE_ORDER.map((phase, idx) => {
          const status = statuses[idx];
          const isActive = status === "active";

          return (
            <Fragment key={phase.key}>
              <div
                className={`${styles.phaseNode} ${styles[`phase_${status}`]}`}
                title={`${phase.label} - ${status}`}
              >
                {renderIndicator(status, isActive)}
              </div>
              {idx < PHASE_ORDER.length - 1 && (
                <div
                  className={`${styles.phaseConnector} ${statuses[idx] === "completed" ? styles.connectorCompleted : ""}`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
      <div className={styles.phaseLabels}>
        {PHASE_ORDER.map((phase, idx) => {
          const status = statuses[idx];
          return (
            <span
              key={phase.key}
              className={`${styles.phaseLabel} ${styles[`phase_${status}`]}`}
              title={`${phase.label} - ${status}`}
            >
              {compact ? phase.shortLabel : phase.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default PhaseTimelineBar;
