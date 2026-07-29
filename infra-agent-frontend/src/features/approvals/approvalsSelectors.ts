import type { ApprovalsState, PendingApproval } from "./approvalsSlice";

interface ApprovalsRootState {
  approvals: ApprovalsState;
}

export const selectPendingApprovals = (state: ApprovalsRootState): PendingApproval[] =>
  Object.values(state.approvals.pendingApprovals);

export const selectPendingApprovalCount = (state: ApprovalsRootState): number =>
  Object.keys(state.approvals.pendingApprovals).length;

export const selectApprovalById = (
  state: ApprovalsRootState,
  approvalId: string,
): PendingApproval | undefined => state.approvals.pendingApprovals[approvalId];

export const selectSelectedApproval = (state: ApprovalsRootState): PendingApproval | null => {
  const { selectedApprovalId, pendingApprovals } = state.approvals;
  if (selectedApprovalId && pendingApprovals[selectedApprovalId]) {
    return pendingApprovals[selectedApprovalId];
  }
  return null;
};

export const selectIsDialogOpen = (state: ApprovalsRootState): boolean =>
  state.approvals.isDialogOpen;
