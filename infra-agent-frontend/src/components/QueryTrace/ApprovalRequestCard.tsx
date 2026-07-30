"use client";

/**
 * ApprovalRequestCard Component
 *
 * Displays a pending approval request within the QueryTracePanel.
 * Shows tool details and provides approve/deny actions.
 */

import { useState, useCallback } from "react";
import { ShieldAlert, Check, X, Loader2, CheckCircle2, XOctagon, Bot, Wrench } from "lucide-react";
import type { PendingApproval } from "@/features/approvals/approvalsSlice";
import styles from "./ApprovalRequestCard.module.css";

interface ApprovalRequestCardProps {
  /** The pending approval to display */
  approval: PendingApproval;
  /** Called when user clicks approve */
  onApprove: (approvalId: string, reason?: string) => Promise<void>;
  /** Called when user clicks deny */
  onDeny: (approvalId: string, reason?: string) => Promise<void>;
  /** Whether actions are disabled (e.g., during submission) */
  disabled?: boolean;
}

/**
 * Formats agent name for display.
 */
function formatAgentName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Formats tool name for display.
 */
function formatToolName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ApprovalRequestCard({
  approval,
  onApprove,
  onDeny,
  disabled = false,
}: ApprovalRequestCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState<"approve" | "deny" | null>(null);

  const handleApprove = useCallback(async () => {
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);
    setSubmitType("approve");

    try {
      await onApprove(approval.approval_id);
    } finally {
      setIsSubmitting(false);
      setSubmitType(null);
    }
  }, [approval.approval_id, isSubmitting, disabled, onApprove]);

  const handleDeny = useCallback(async () => {
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);
    setSubmitType("deny");

    try {
      await onDeny(approval.approval_id);
    } finally {
      setIsSubmitting(false);
      setSubmitType(null);
    }
  }, [approval.approval_id, isSubmitting, disabled, onDeny]);

  const toolArgs = approval.tool_args || {};
  const argEntries = Object.entries(toolArgs).filter(
    ([, value]) => value !== undefined && value !== null,
  );

  const isPending = approval.status === "pending";
  const isApproved = approval.status === "approved";
  const isDenied = approval.status === "denied";

  // Card class (no animation if not pending)
  const cardClass = `${styles.card} ${!isPending ? styles.resultCard : ""}`;

  return (
    <div className={cardClass}>
      {/* Top Section: Title + Status */}
      <div className={styles.topSection}>
        <div className={styles.titleRow}>
          <div className={styles.iconBadge}>
            <ShieldAlert size={16} />
          </div>
          <span className={styles.title}>Approval Required</span>
        </div>
        <div className={styles.statusChip} data-status={approval.status}>
          {isPending && <span className={styles.statusDot} />}
          {isApproved && <CheckCircle2 size={10} />}
          {isDenied && <XOctagon size={10} />}
          <span>{approval.status}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Left: Agent & Tool Info */}
        <div className={styles.infoColumn}>
          <div className={styles.infoItem}>
            <div className={styles.infoIcon}>
              <Bot size={14} />
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Agent</span>
              <span className={styles.infoValue}>{formatAgentName(approval.agent_name)}</span>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoIcon}>
              <Wrench size={14} />
            </div>
            <div className={styles.infoContent}>
              <span className={styles.infoLabel}>Tool</span>
              <span className={styles.infoValue}>{formatToolName(approval.tool_name)}</span>
            </div>
          </div>
        </div>

        {/* Right: Parameters */}
        {argEntries.length > 0 && (
          <div className={styles.parametersColumn}>
            <span className={styles.parametersLabel}>Parameters</span>
            <div className={styles.parametersList}>
              {argEntries.map(([key, value]) => (
                <div key={key} className={styles.paramRow}>
                  <span className={styles.paramKey}>{key}</span>
                  <span className={styles.paramValue}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result States */}
      {isApproved && (
        <div className={styles.resultBanner} data-result="approved">
          <CheckCircle2 size={14} />
          <span>Action approved</span>
        </div>
      )}

      {isDenied && (
        <div className={styles.resultBanner} data-result="denied">
          <XOctagon size={14} />
          <span>Action denied</span>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.denyBtn}
            onClick={handleDeny}
            disabled={isSubmitting || disabled}
          >
            {isSubmitting && submitType === "deny" ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <X size={14} />
            )}
            <span>Deny</span>
          </button>
          <button
            type="button"
            className={styles.approveBtn}
            onClick={handleApprove}
            disabled={isSubmitting || disabled}
          >
            {isSubmitting && submitType === "approve" ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <Check size={14} />
            )}
            <span>Approve</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ApprovalRequestCard;
