"use client";

/**
 * NodeDetailsModal – Full-screen overlay that shows detailed metadata
 * for a single task node in the execution plan DAG.
 *
 * Displayed when a user clicks on a "Task Assignment" card inside
 * PlanApprovalCard.
 */
import { Fragment, type MouseEvent } from "react";
import {
  X,
  Bot,
  Target,
  CheckCircle2,
  BarChart3,
  Wrench,
  ListOrdered,
  Code2,
  Brain,
} from "lucide-react";
import type { TaskNode, NodeVerification } from "./flowPayload.types";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { getAgentDisplayName, normalizeNodeStatus } from "./planNodeDisplay";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./NodeDetailsModal.module.css";

interface NodeDetailsModalProps {
  /** The task node from the DAG */
  node: TaskNode;
  /** The matching per-node verification (optional – may not exist) */
  verification?: NodeVerification;
  /** Close the modal */
  onClose: () => void;
}

function NodeDetailsModal({ node, verification, onClose }: NodeDetailsModalProps) {
  /* ─── Derived values ─────────────────────────────── */
  const score = verification?.score ?? node.verification_score;
  const scorePercent = score != null ? `${Math.round(score * 100)}%` : "—";
  const toolsPlanned = verification?.tools_planned ?? node.tools_used ?? [];
  const executionOrder = verification?.execution_order ?? toolsPlanned;
  const toolParams = verification?.tool_params ?? {};
  const reasoning = verification?.feedback ?? "";

  /* ─── Score color ────────────────────────────────── */
  const scoreColorClass =
    score == null
      ? styles.scoreNeutral
      : score >= 0.7
        ? styles.scoreGood
        : score >= 0.5
          ? styles.scoreWarning
          : styles.scoreBad;

  /* ─── Status colour ──────────────────────────────── */
  const normalizedStatus = normalizeNodeStatus(node.status);
  const statusColorClass =
    normalizedStatus === "completed"
      ? styles.scoreGood
      : normalizedStatus === "executing"
        ? styles.scoreWarning
        : normalizedStatus === "failed"
          ? styles.scoreBad
          : styles.scoreNeutral;

  /* ─── Close on backdrop click ────────────────────── */
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  /* ─── Focus trap + Escape-to-close (zero useEffect) ── */
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} role="presentation">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onKeyDown` is Escape-to-close/Tab-cycling via `useDialogFocusTrap`, supplemental to the close button, which remains fully keyboard/screen-reader operable. */}
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className={styles.modal}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled divs + `useDialogFocusTrap` rather than the native `<dialog>` element, for consistent theming/animation across every modal.
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-details-title"
        tabIndex={-1}
      >
        {/* ── Header ──────────────────────────── */}
        <div className={styles.header}>
          <span id="node-details-title" className={styles.headerTitle}>
            Node Details
          </span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* ── Body (scrollable) ───────────────── */}
        <div className={styles.body}>
          {/* Task ID */}
          <div className={styles.field}>
            <div className={styles.fieldIcon}>
              <Code2 size={14} />
            </div>
            <div className={styles.fieldContent}>
              <span className={styles.fieldLabel}>Task ID</span>
              <span className={styles.fieldValue}>{node.task_id}</span>
            </div>
          </div>

          {/* Agent */}
          <div className={styles.field}>
            <div className={styles.fieldIcon}>
              <Bot size={14} />
            </div>
            <div className={styles.fieldContent}>
              <span className={styles.fieldLabel}>Agent</span>
              <span className={styles.fieldValue}>
                {getAgentDisplayName(verification?.agent_name ?? node.target_agent ?? "")}
              </span>
            </div>
          </div>

          {/* Goal */}
          <div className={styles.field}>
            <div className={styles.fieldIcon}>
              <Target size={14} />
            </div>
            <div className={styles.fieldContent}>
              <span className={styles.fieldLabel}>Goal</span>
              <div className={styles.goalMarkdown}>
                <MarkdownRenderer content={node.goal ?? ""} context="task_goal" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={styles.field}>
            <div className={styles.fieldIcon}>
              <CheckCircle2 size={14} />
            </div>
            <div className={styles.fieldContent}>
              <span className={styles.fieldLabel}>Status</span>
              <span className={`${styles.fieldValueBadge} ${statusColorClass}`}>
                {normalizedStatus}
              </span>
            </div>
          </div>

          {/* Verification Score */}
          <div className={styles.field}>
            <div className={styles.fieldIcon}>
              <BarChart3 size={14} />
            </div>
            <div className={styles.fieldContent}>
              <span className={styles.fieldLabel}>Verification Score</span>
              <span className={`${styles.fieldValueHighlight} ${scoreColorClass}`}>
                {scorePercent}
              </span>
            </div>
          </div>

          {/* Tools Planned */}
          {toolsPlanned.length > 0 && (
            <div className={styles.field}>
              <div className={styles.fieldIcon}>
                <Wrench size={14} />
              </div>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>Tools Planned</span>
                <div className={styles.tagList}>
                  {toolsPlanned.map((t) => (
                    <span key={t} className={styles.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Execution Order */}
          {executionOrder.length > 0 && (
            <div className={styles.field}>
              <div className={styles.fieldIcon}>
                <ListOrdered size={14} />
              </div>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>Execution Order</span>
                <div className={styles.execOrder}>
                  {executionOrder.map((step, idx) => (
                    <Fragment key={step}>
                      <span className={styles.execStep}>
                        <span className={styles.execStepNum}>{idx + 1}.</span> {step}
                      </span>
                      {idx < executionOrder.length - 1 && (
                        <span className={styles.execArrow}>→</span>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tool Parameters */}
          {Object.keys(toolParams).length > 0 && (
            <div className={styles.field}>
              <div className={styles.fieldIcon}>
                <Code2 size={14} />
              </div>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>Tool Parameters</span>
                <pre className={styles.codeBlock}>{JSON.stringify(toolParams, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Agent Reasoning */}
          {reasoning && (
            <div className={styles.field}>
              <div className={styles.fieldIcon}>
                <Brain size={14} />
              </div>
              <div className={styles.fieldContent}>
                <span className={styles.fieldLabel}>Agent Reasoning</span>
                <p className={styles.reasoningText}>{reasoning}</p>
              </div>
            </div>
          )}

          {/* Error (if any) */}
          {node.error && (
            <div className={styles.field}>
              <div className={`${styles.fieldIcon} ${styles.errorIcon}`}>
                <X size={14} />
              </div>
              <div className={styles.fieldContent}>
                <span className={`${styles.fieldLabel} ${styles.errorLabel}`}>Error</span>
                <p className={styles.errorText}>{node.error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NodeDetailsModal;
