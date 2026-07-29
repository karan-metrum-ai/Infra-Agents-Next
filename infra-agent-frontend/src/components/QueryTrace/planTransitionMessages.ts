/**
 * Detects backend placeholder copy shown during plan approval transitions.
 *
 * Partial Phase 8 pull-forward of the Vite app's
 * `utils/planTransitionMessages.ts`, ahead of its real Phase 13 slot
 * (`components/shared/**`) — same convention as this file's sibling
 * pull-forwards (`flowPayload.types.ts`, `features/approvals/`). Pulled
 * forward now because `useFlowStream`'s v1 event router calls
 * `isPlanTransitionMessage` to suppress transient "awaiting approval" /
 * "execution starting" placeholder text from being dispatched as a real
 * final response. Depends only on `deriveTraceStatus.ts`, already ported
 * in this phase. Reconcile with the real Phase 13 module when it lands.
 */
import { deriveFlowLifecycleStatus, isPostApprovalPlanStatus } from "./deriveTraceStatus";

const RUNNING_PLACEHOLDER_RE = /running assigned tasks\.?\s*live updates will appear below/i;

/** True for the interim message shown while a plan waits for HITL. */
export function isAwaitingApprovalMessage(content: string): boolean {
  const text = content.trim();
  if (!text) {
    return false;
  }
  return (
    /plan created and awaiting approval/i.test(text) ||
    /plan awaiting human approval/i.test(text) ||
    (/awaiting approval/i.test(text) && /approve or reject/i.test(text))
  );
}

/** True for the short-lived message emitted right after plan approval. */
export function isApprovedExecutingMessage(content: string): boolean {
  const text = content.trim();
  if (!text) {
    return false;
  }
  return /plan approved\.?\s*execution starting/i.test(text);
}

/** True for backend placeholder copy that should not render as content. */
export function isPlanTransitionMessage(content: string): boolean {
  const text = content.trim();
  if (!text) {
    return false;
  }
  return (
    isAwaitingApprovalMessage(content) ||
    isApprovedExecutingMessage(content) ||
    RUNNING_PLACEHOLDER_RE.test(text)
  );
}

/**
 * True while the plan is created but the user has not approved or
 * rejected yet.
 */
export function isAwaitingPlanApproval(
  queryStatus: string | null | undefined,
  planStatus: string | undefined | null,
  finalResponseStatus: string | undefined | null,
  blockPhase?: string | null,
): boolean {
  if (
    deriveFlowLifecycleStatus({
      queryStatus,
      planStatus,
      blockPhase,
    }) === "awaiting_approval"
  ) {
    return true;
  }
  return (
    finalResponseStatus?.toLowerCase() === "pending_approval" &&
    !isPostApprovalPlanStatus(planStatus)
  );
}

/** True after approval while assigned tasks are still running. */
export function isPlanExecuting(
  queryStatus: string | null | undefined,
  planStatus: string | undefined | null,
  blockPhase?: string | null,
): boolean {
  return (
    deriveFlowLifecycleStatus({
      queryStatus,
      planStatus,
      blockPhase,
    }) === "executing"
  );
}

/** True when final-response content is not yet substantive. */
export function isFinalResponsePlaceholder(content: string): boolean {
  const text = content.trim();
  if (!text) {
    return true;
  }
  const lower = text.toLowerCase();
  if (lower === "processing" || lower === "processing...") {
    return true;
  }
  return isPlanTransitionMessage(text);
}
