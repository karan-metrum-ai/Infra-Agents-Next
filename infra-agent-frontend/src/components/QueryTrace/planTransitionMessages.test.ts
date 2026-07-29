import { describe, expect, it } from "vitest";
import {
  isApprovedExecutingMessage,
  isAwaitingApprovalMessage,
  isAwaitingPlanApproval,
  isFinalResponsePlaceholder,
  isPlanExecuting,
  isPlanTransitionMessage,
} from "./planTransitionMessages";

describe("planTransitionMessages", () => {
  it("detects awaiting approval copy", () => {
    const msg =
      "Plan created and awaiting approval. Approve or reject via the " + "streaming channel.";
    expect(isAwaitingApprovalMessage(msg)).toBe(true);
    expect(isPlanTransitionMessage(msg)).toBe(true);
  });

  it("detects plan awaiting human approval placeholder", () => {
    const msg = "Plan awaiting human approval.";
    expect(isAwaitingApprovalMessage(msg)).toBe(true);
    expect(isPlanTransitionMessage(msg)).toBe(true);
    expect(isFinalResponsePlaceholder(msg)).toBe(true);
  });

  it("detects approved executing copy", () => {
    expect(isApprovedExecutingMessage("Plan approved. Execution starting…")).toBe(true);
    expect(isApprovedExecutingMessage("Plan approved. Execution starting...")).toBe(true);
  });

  it("detects running assigned tasks placeholder", () => {
    const msg = "Running assigned tasks. Live updates will appear below.";
    expect(isPlanTransitionMessage(msg)).toBe(true);
    expect(isFinalResponsePlaceholder(msg)).toBe(true);
  });

  it("derives awaiting plan approval state", () => {
    expect(isAwaitingPlanApproval("pending_approval", null, null)).toBe(true);
    expect(isAwaitingPlanApproval(null, "awaiting_decision", null)).toBe(true);
    expect(isAwaitingPlanApproval(null, null, "pending_approval")).toBe(true);
    expect(isAwaitingPlanApproval("completed", "pending", null)).toBe(false);
  });

  it("derives executing plan state", () => {
    expect(isPlanExecuting("executing", null)).toBe(true);
    expect(isPlanExecuting(null, "approved")).toBe(true);
    expect(isPlanExecuting(null, "running")).toBe(true);
    expect(isPlanExecuting("pending_approval", "pending")).toBe(false);
  });

  it("treats transition copy as final-response placeholders", () => {
    expect(isFinalResponsePlaceholder("Plan approved. Execution starting…")).toBe(true);
    expect(isFinalResponsePlaceholder("All tasks completed.")).toBe(false);
  });
});
