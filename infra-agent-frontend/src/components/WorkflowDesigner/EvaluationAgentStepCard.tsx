"use client";

import { cn } from "@/lib/utils";
import { formatDuration, formatTimestamp, getScoreColor } from "./evaluationModalFormatters";
import styles from "./EvaluationModal.module.css";
import type { AgentStep } from "./EvaluationModal.types";

const STEP_SCORE_DIMENSIONS = ["effectiveness", "efficiency", "quality", "progress"] as const;

interface EvaluationAgentStepCardProps {
  step: AgentStep;
  index: number;
}

/** One expanded agent's single execution step: operation summary, per-step
 * score breakdown, reasoning, token usage, and tool calls. Split out of
 * `EvaluationAgentsTab` since a step card is a self-contained rendering
 * unit repeated per step. */
export function EvaluationAgentStepCard({ step, index }: EvaluationAgentStepCardProps) {
  return (
    <div className={cn(styles.stepCard, styles[step.status])}>
      <div className={styles.stepIndicator}>
        <div className={styles.stepNumber}>{index + 1}</div>
        <div className={styles.stepConnector} aria-hidden="true" />
      </div>
      <div className={styles.stepContent}>
        <div className={styles.stepHeader}>
          <div className={styles.stepInfo}>
            <h4 className={styles.stepOperation}>{step.operation}</h4>
            <p className={styles.stepDescription}>{step.description}</p>
          </div>
          <div className={styles.stepMetrics}>
            <span className={styles.stepTime}>{formatTimestamp(step.timestamp)}</span>
            <span className={styles.stepDuration}>{formatDuration(step.duration_seconds)}</span>
            <span
              className={styles.stepScore}
              style={{ color: getScoreColor(step.llm_score.score) }}
            >
              {step.llm_score.score}/10
            </span>
          </div>
        </div>
        <div className={styles.stepDetails}>
          <div className={styles.scoreBreakdown}>
            {STEP_SCORE_DIMENSIONS.map((dimension) => {
              const value = step.llm_score[dimension];
              return (
                <div key={dimension} className={styles.scoreItem}>
                  <span>{dimension.charAt(0).toUpperCase() + dimension.slice(1)}</span>
                  <div className={styles.scoreBar}>
                    <div
                      className={styles.scoreBarFill}
                      style={{ width: `${value * 10}%`, backgroundColor: getScoreColor(value) }}
                    />
                  </div>
                  <span className={styles.scoreValue}>{value}</span>
                </div>
              );
            })}
          </div>
          {step.llm_score.reasoning && (
            <div className={styles.reasoningSection}>
              <h5 className={styles.reasoningTitle}>Analysis</h5>
              <p className={styles.reasoningText}>{step.llm_score.reasoning}</p>
            </div>
          )}
          <div className={styles.stepFooter}>
            {step.prompt_usage && (
              <div className={styles.tokenUsage}>
                <span className={styles.tokenLabel}>Tokens:</span>
                <span className={styles.tokenStat}>
                  {step.prompt_usage.total_tokens.toLocaleString()}
                </span>
              </div>
            )}
            {step.tool_calls?.length > 0 && (
              <div className={styles.toolsUsed}>
                <span className={styles.toolsLabel}>Tools:</span>
                <div className={styles.toolsList}>
                  {step.tool_calls.map((call, callIndex) => (
                    <span key={`${call.tool}-${callIndex}`} className={styles.toolTag}>
                      {call.tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EvaluationAgentStepCard;
