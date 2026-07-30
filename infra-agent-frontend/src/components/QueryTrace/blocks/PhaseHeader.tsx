"use client";

import { Fragment } from "react";
import { usePhase } from "../blockStream/useBlockStream";
import type { Phase } from "../blockStream/types";
import styles from "./phaseHeader.module.css";

/**
 * Pipeline breadcrumb strip showing all execution stages.
 *
 * Active stage is highlighted; completed stages show a check mark;
 * future stages are dimmed. Connecting lines fill left-to-right
 * as the flow progresses through phases.
 */
interface PipelineStage {
  id: Phase;
  label: string;
}

/** Ordered stages in the execution pipeline. */
const PIPELINE_STAGES: PipelineStage[] = [
  { id: "planning", label: "Planning" },
  { id: "executing", label: "Executing" },
  { id: "verification", label: "Verifying" },
  { id: "completed", label: "Complete" },
];

/** Fallback for phases outside the main pipeline flow. */
const PHASE_LABELS: Partial<Record<Phase, string>> = {
  idle: "Connecting",
  interruption_awaited: "Awaiting Approval",
  failed: "Failed",
};

function getStageIndex(phase: Phase): number {
  return PIPELINE_STAGES.findIndex((s) => s.id === phase);
}

function PhaseHeader() {
  const phase = usePhase();
  const activeIndex = getStageIndex(phase);

  // Off-pipeline phases (idle, interruption_awaited, failed) show
  // as a single pill rather than the breadcrumb strip.
  if (activeIndex === -1) {
    const label = PHASE_LABELS[phase] ?? phase;
    const isProblem = phase === "failed";
    const isWaiting = phase === "interruption_awaited";
    return (
      <output
        className={[
          styles.phasePill,
          isProblem ? styles.phasePillError : "",
          isWaiting ? styles.phasePillWarning : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      >
        {phase === "idle" && <span className={styles.connectingDot} aria-hidden="true" />}
        <span>{label}</span>
      </output>
    );
  }

  return (
    <output
      className={styles.pipelineStrip}
      aria-live="polite"
      aria-label={`Execution stage: ${PIPELINE_STAGES[activeIndex]?.label ?? phase}`}
    >
      {PIPELINE_STAGES.map((stage, idx) => {
        const isCompleted = idx < activeIndex;
        const isActive = idx === activeIndex;
        const isFuture = idx > activeIndex;
        const isLast = idx === PIPELINE_STAGES.length - 1;

        return (
          <Fragment key={stage.id}>
            <div
              className={[
                styles.stageNode,
                isCompleted ? styles.stageCompleted : "",
                isActive ? styles.stageActive : "",
                isFuture ? styles.stageFuture : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.stageDot} aria-hidden="true">
                {isCompleted ? "✓" : null}
              </span>
              <span className={styles.stageLabel}>{stage.label}</span>
            </div>
            {!isLast && (
              <div
                className={[
                  styles.stageConnector,
                  isCompleted || isActive ? styles.stageConnectorFilled : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              />
            )}
          </Fragment>
        );
      })}
    </output>
  );
}

export default PhaseHeader;
