"use client";

import { Loader2 } from "lucide-react";
import agentStyles from "./agentSection.module.css";

interface PlanExecutionNoticeProps {
  /** Optional override for the status line. */
  message?: string;
}

/**
 * Inline notice shown while approved plan tasks are running.
 *
 * Replaces backend placeholder copy such as
 * "Plan approved. Execution starting…".
 */
function PlanExecutionNotice({
  message = "Running assigned tasks. Live updates will appear below.",
}: PlanExecutionNoticeProps) {
  return (
    <div className={agentStyles.responseBlock} data-variant="executing">
      <div className={agentStyles.responseExecutingHint}>
        <Loader2 size={12} className={agentStyles.executingIcon} aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export default PlanExecutionNotice;
