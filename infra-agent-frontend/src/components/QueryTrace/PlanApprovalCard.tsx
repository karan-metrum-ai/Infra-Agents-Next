"use client";

/**
 * PlanApprovalCard - Shows plan metadata (verification score, DAG stats, status)
 * and provides Approve / Reject buttons that send decisions via REST.
 *
 * Only renders when a planBundle is available in the SSE flowStream Redux state.
 */
import { useState, useCallback, useMemo } from "react";
import { Check, X, Loader2, MoreHorizontal } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import type { TaskNode, NodeVerification } from "./flowPayload.types";
import { useBlockStream } from "./blockStream/useBlockStream";
import { mergeDelegatedTaskNodes } from "./flowTraceMerge";
import { getAgentDisplayName, normalizeNodeStatus } from "./planNodeDisplay";
import { useElementWidth } from "./useElementWidth";
import NodeDetailsModal from "./NodeDetailsModal";
import PlanApprovalQuery from "./PlanApprovalQuery";
import styles from "./PlanApprovalCard.module.css";

interface PlanApprovalCardProps {
  /** Called when user approves the plan */
  onApprove: () => void | Promise<void>;
  /** Called when user rejects the plan */
  onReject: (reason?: string) => void | Promise<void>;
}

function PlanApprovalCard({ onApprove, onReject }: PlanApprovalCardProps) {
  const planBundle = useAppSelector((s) => s.flowStream.planBundle);
  const queryStatus = useAppSelector((s) => s.flowStream.queryStatus);
  const blockSnapshot = useBlockStream();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState<"approve" | "reject" | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  /** Node details modal state */
  const [selectedNode, setSelectedNode] = useState<TaskNode | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<NodeVerification | undefined>(
    undefined,
  );

  /** Pagination/truncation state for narrow panels */
  const { ref: containerRef, width: containerWidth } = useElementWidth<HTMLDivElement>();
  const [isExpanded, setIsExpanded] = useState(false);

  // Truncate when panel is less than 400px wide
  const shouldTruncate = containerWidth > 0 && containerWidth < 400;
  const maxVisibleTasks = shouldTruncate && !isExpanded ? 2 : undefined;

  const handleApprove = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitType("approve");
    try {
      await onApprove();
    } finally {
      setIsSubmitting(false);
      setSubmitType(null);
    }
  }, [isSubmitting, onApprove]);

  const handleReject = useCallback(async () => {
    if (isSubmitting) return;
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setIsSubmitting(true);
    setSubmitType("reject");
    try {
      await onReject(rejectReason || undefined);
    } finally {
      setIsSubmitting(false);
      setSubmitType(null);
      setShowRejectInput(false);
      setRejectReason("");
    }
  }, [isSubmitting, showRejectInput, rejectReason, onReject]);

  /** Open node detail modal for a task assignment card */
  const handleNodeClick = useCallback(
    (node: TaskNode) => {
      const match = planBundle?.verification_result?.node_verifications?.find(
        (nv) => nv.task_id === node.task_id,
      );
      setSelectedVerification(match);
      setSelectedNode(node);
    },
    [planBundle],
  );

  const handleCloseNodeModal = useCallback(() => {
    setSelectedNode(null);
    setSelectedVerification(undefined);
  }, []);

  const taskNodes = useMemo(() => {
    const baseNodes = planBundle?.dag_export?.nodes ?? [];
    const planCorrelationId = planBundle?.correlation_id;
    let nodes = baseNodes;
    if (planCorrelationId && blockSnapshot.correlation_id === planCorrelationId) {
      nodes = mergeDelegatedTaskNodes(baseNodes, blockSnapshot);
    }
    const flowTerminal = queryStatus === "completed" || queryStatus === "error";
    if (!flowTerminal) {
      return nodes;
    }
    return nodes.map((node) => ({
      ...node,
      status: "completed",
    }));
  }, [planBundle?.dag_export?.nodes, planBundle?.correlation_id, blockSnapshot, queryStatus]);

  if (!planBundle) return null;

  const { verification_result, status, query, decision } = planBundle;

  const score = verification_result?.overall_score ?? 0;

  // Normalize status: the backend may send different values so we check broadly
  const normalizedStatus = status?.toLowerCase() ?? "";
  const flowTerminal = queryStatus === "completed" || queryStatus === "error";
  const isPending =
    !flowTerminal && (normalizedStatus === "pending" || normalizedStatus === "awaiting_decision");
  const isApproved =
    normalizedStatus === "approve" ||
    normalizedStatus === "approved" ||
    normalizedStatus === "decision_accepted" ||
    normalizedStatus === "accepted" ||
    (normalizedStatus === "decided" && decision === "approve") ||
    (normalizedStatus === "ready" && decision === "approve");
  const isRejected =
    normalizedStatus === "reject" ||
    normalizedStatus === "rejected" ||
    normalizedStatus === "denied" ||
    (normalizedStatus === "decided" && decision === "reject");
  const isExecuting =
    normalizedStatus === "executing" ||
    normalizedStatus === "in_progress" ||
    normalizedStatus === "running";
  const isCompleted =
    normalizedStatus === "completed" || normalizedStatus === "done" || queryStatus === "completed";
  const isFailed = normalizedStatus === "failed" || normalizedStatus === "error";

  const showApprovedBanner =
    (isApproved || decision === "approve") &&
    !isExecuting &&
    !isCompleted &&
    !isFailed &&
    !isPending;

  const totalTasks = taskNodes.length;
  const flowTerminalForNodes =
    queryStatus === "completed" || queryStatus === "error" || isCompleted;
  const completedTasks = taskNodes.filter(
    (node) => normalizeNodeStatus(node.status, flowTerminalForNodes) === "completed",
  ).length;
  const failedTasks = taskNodes.filter(
    (node) => normalizeNodeStatus(node.status, flowTerminalForNodes) === "failed",
  ).length;

  // Score color logic
  const scoreColorClass =
    score >= 0.7 ? styles.scoreGood : score >= 0.5 ? styles.scoreWarning : styles.scoreBad;

  // Status badge variant (stable mapping regardless of raw status string)
  const statusVariant = isCompleted
    ? "completed"
    : isFailed
      ? "failed"
      : isExecuting
        ? "executing"
        : isRejected
          ? "rejected"
          : isApproved
            ? "approved"
            : "pending";

  // Human-friendly status text
  const statusLabel = isCompleted
    ? "Completed"
    : isFailed
      ? "Failed"
      : isExecuting
        ? "Executing"
        : isRejected
          ? "Rejected"
          : isApproved
            ? "Approved"
            : "Pending";

  return (
    <div className={styles.card} ref={containerRef}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>Execution Plan</span>
        </div>
        <div className={styles.statusBadge} data-status={statusVariant}>
          {statusLabel}
        </div>
      </div>

      {/* Query */}
      {query && <PlanApprovalQuery key={query} query={query} />}

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {/* Verification Score */}
        <div className={styles.metricCard}>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Verification Score</span>
            <div className={styles.scoreRow}>
              <span className={`${styles.scoreValue} ${scoreColorClass}`}>
                {(score * 100).toFixed(0)}%
              </span>
              <div className={styles.scoreBar}>
                <div
                  className={`${styles.scoreBarFill} ${scoreColorClass}`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task Count */}
        <div className={styles.metricCard}>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Tasks</span>
            <span className={styles.metricValue}>
              {completedTasks}/{totalTasks}
              {failedTasks > 0 && (
                <span className={styles.failedCount}> ({failedTasks} failed)</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Rejection reason */}
      {verification_result?.rejection_reason && (
        <div className={styles.rejectionBanner}>{verification_result.rejection_reason}</div>
      )}

      {/* Post-approval states */}
      {showApprovedBanner && (
        <div className={styles.approvedSection}>
          <div className={styles.resultBanner} data-result="approved">
            <Check size={14} />
            <span className={styles.shineApproved}>Plan approved. Execution starting...</span>
          </div>
        </div>
      )}
      {isExecuting && (
        <div className={styles.resultBanner} data-result="executing">
          <Loader2 size={14} className={styles.spinner} />
          <span className={styles.shineExecuting}>Plan executing...</span>
        </div>
      )}
      {isCompleted && (
        <div className={styles.resultBanner} data-result="completed">
          <Check size={14} />
          <span>Execution completed</span>
        </div>
      )}
      {isRejected && (
        <div className={styles.rejectedSection}>
          <div className={styles.rejectedHeader}>
            <X size={14} />
            <span>Plan Rejected</span>
          </div>
          <p className={styles.rejectedBody}>
            This plan was not approved. You can modify the query and submit a new plan for review.
          </p>
        </div>
      )}
      {isFailed && (
        <div className={styles.resultBanner} data-result="failed">
          <X size={14} />
          <span>Execution failed</span>
        </div>
      )}

      {/* DAG Node Summary */}
      {taskNodes.length > 0 && (
        <div className={styles.dagSummary}>
          <span className={styles.dagSummaryTitle}>Task Assignments</span>
          <div className={styles.dagNodeList}>
            {taskNodes.map((node, index) => {
              // Use both task_id and index as key to ensure uniqueness
              // This handles edge cases where task_id might be duplicated
              const uniqueKey = `${node.task_id}-${index}`;

              // Skip rendering if truncated and beyond max visible
              if (maxVisibleTasks !== undefined && index >= maxVisibleTasks) {
                return null;
              }

              return (
                <button
                  key={uniqueKey}
                  type="button"
                  className={styles.dagNodeItem}
                  onClick={() => handleNodeClick(node)}
                  title="Click to view details"
                >
                  <div className={styles.dagNodeInfo}>
                    <span className={styles.dagNodeAgent}>
                      {getAgentDisplayName(node.target_agent ?? "")}
                    </span>
                    <span className={styles.dagNodeGoal}>
                      {node.goal && node.goal.length > 80
                        ? node.goal.slice(0, 80) + "..."
                        : node.goal}
                    </span>
                  </div>
                  <span
                    className={styles.dagNodeStatus}
                    data-status={normalizeNodeStatus(node.status, flowTerminalForNodes)}
                  >
                    {normalizeNodeStatus(node.status, flowTerminalForNodes)}
                  </span>
                </button>
              );
            })}

            {/* Pagination-like ellipsis bridge when truncated */}
            {shouldTruncate &&
              !isExpanded &&
              maxVisibleTasks !== undefined &&
              taskNodes.length > maxVisibleTasks && (
                <>
                  <div className={styles.dagNodeEllipsis} aria-hidden="true">
                    <MoreHorizontal size={16} />
                    <span className={styles.ellipsisText}>
                      {taskNodes.length - maxVisibleTasks} more
                    </span>
                  </div>
                  {/* Show last task as preview */}
                  <button
                    key={`${taskNodes[taskNodes.length - 1].task_id}-${taskNodes.length - 1}`}
                    type="button"
                    className={styles.dagNodeItem}
                    onClick={() => handleNodeClick(taskNodes[taskNodes.length - 1])}
                    title="Click to view details"
                  >
                    <div className={styles.dagNodeInfo}>
                      <span className={styles.dagNodeAgent}>
                        {getAgentDisplayName(taskNodes[taskNodes.length - 1].target_agent ?? "")}
                      </span>
                      <span className={styles.dagNodeGoal}>
                        {taskNodes[taskNodes.length - 1].goal &&
                        taskNodes[taskNodes.length - 1].goal.length > 80
                          ? taskNodes[taskNodes.length - 1].goal.slice(0, 80) + "..."
                          : taskNodes[taskNodes.length - 1].goal}
                      </span>
                    </div>
                    <span
                      className={styles.dagNodeStatus}
                      data-status={normalizeNodeStatus(
                        taskNodes[taskNodes.length - 1].status,
                        flowTerminalForNodes,
                      )}
                    >
                      {normalizeNodeStatus(
                        taskNodes[taskNodes.length - 1].status,
                        flowTerminalForNodes,
                      )}
                    </span>
                  </button>
                  {/* Expand button */}
                  <button
                    type="button"
                    className={styles.expandTasksBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(true);
                    }}
                    aria-label={`Show all ${taskNodes.length} tasks`}
                  >
                    <span>Show all {taskNodes.length} tasks</span>
                  </button>
                </>
              )}

            {/* Collapse button when expanded */}
            {isExpanded && shouldTruncate && (
              <button
                type="button"
                className={styles.collapseTasksBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                aria-label="Collapse tasks"
              >
                <span>Show less</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Approval Actions */}
      {isPending && (
        <div className={styles.actionsSection}>
          <div className={styles.actionsHeader}>
            <span className={styles.actionsTitle}>Approval Required</span>
          </div>

          {showRejectInput && (
            <input
              type="text"
              className={styles.rejectInput}
              placeholder="Rejection reason (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          )}

          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.rejectBtn}
              onClick={handleReject}
              disabled={isSubmitting}
            >
              {isSubmitting && submitType === "reject" && (
                <Loader2 size={14} className={styles.spinner} />
              )}
              <span>{showRejectInput ? "Confirm Reject" : "Reject"}</span>
            </button>
            <button
              type="button"
              className={styles.approveBtn}
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting && submitType === "approve" && (
                <Loader2 size={14} className={styles.spinner} />
              )}
              <span>Approve</span>
            </button>
          </div>

          {showRejectInput && (
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
              >
                Cancel
              </button>
              <span className={styles.actionsRowSpacer} aria-hidden="true" />
            </div>
          )}
        </div>
      )}

      {/* Node Details Modal */}
      {selectedNode && (
        <NodeDetailsModal
          node={selectedNode}
          verification={selectedVerification}
          onClose={handleCloseNodeModal}
        />
      )}
    </div>
  );
}

export default PlanApprovalCard;
