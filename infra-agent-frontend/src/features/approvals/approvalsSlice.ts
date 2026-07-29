import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

/**
 * Redux slice for HITL (Human-in-the-Loop) approval state.
 *
 * Partial Phase 8 pull-forward of the Vite app's
 * `store/slices/approvalsSlice.ts` (+ `types/approvals.ts`) ahead of its
 * real Phase 13 slot (`components/shared/ApprovalDialog.tsx`,
 * `ApprovalAlertBadge.tsx`) — same convention as Phase 6/7's
 * `rackLayout.types.ts` / `workflowCanvasSlice.ts` partial pull-forwards.
 * Pulled forward now because `useFlowStream`'s event router dispatches
 * `addApproval`/`addApprovals`/`removeApproval` for the plan-approval bell
 * icon (a real, live HITL gate — not dead code) and `flowStreamApi.ts`'s
 * `SubmitQueryResponse.pending_approvals` needs the `PendingApproval`
 * type. Ported in full (all reducers/selectors) since the source slice is
 * small and self-contained; reconcile with the real Phase 13 slice when
 * `ApprovalDialog`/`ApprovalAlertBadge` land instead of keeping two
 * definitions.
 */

/** Tool arguments for a pending approval; shape varies by tool. */
export interface ApprovalToolArgs {
  device_name?: string;
  attribute_name?: string;
  attribute_value?: string;
  [key: string]: unknown;
}

/** A pending approval request from the agent system. */
export interface PendingApproval {
  approval_id: string;
  tool_name: string;
  tool_args: ApprovalToolArgs;
  agent_name: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
  message: string;
}

export interface ApprovalsState {
  /** Map of approval_id to PendingApproval. */
  pendingApprovals: Record<string, PendingApproval>;
  /** Currently selected approval for dialog display. */
  selectedApprovalId: string | null;
  /** Whether the approval dialog is open. */
  isDialogOpen: boolean;
}

const initialState: ApprovalsState = {
  pendingApprovals: {},
  selectedApprovalId: null,
  isDialogOpen: false,
};

const approvalsSlice = createSlice({
  name: "approvals",
  initialState,
  reducers: {
    /** Add multiple pending approvals; existing IDs are updated. */
    addApprovals: (state, action: PayloadAction<PendingApproval[]>) => {
      for (const approval of action.payload) {
        state.pendingApprovals[approval.approval_id] = approval;
      }
    },

    /** Add a single pending approval. */
    addApproval: (state, action: PayloadAction<PendingApproval>) => {
      state.pendingApprovals[action.payload.approval_id] = action.payload;
    },

    /** Remove a pending approval by ID (after approve/deny is processed). */
    removeApproval: (state, action: PayloadAction<string>) => {
      delete state.pendingApprovals[action.payload];
      if (state.selectedApprovalId === action.payload) {
        state.selectedApprovalId = null;
        state.isDialogOpen = false;
      }
    },

    /** Clear all pending approvals. */
    clearAllApprovals: (state) => {
      state.pendingApprovals = {};
      state.selectedApprovalId = null;
      state.isDialogOpen = false;
    },

    /** Open the approval dialog for a specific approval. */
    openApprovalDialog: (state, action: PayloadAction<string>) => {
      if (state.pendingApprovals[action.payload]) {
        state.selectedApprovalId = action.payload;
        state.isDialogOpen = true;
      }
    },

    /** Close the approval dialog. */
    closeApprovalDialog: (state) => {
      state.isDialogOpen = false;
      state.selectedApprovalId = null;
    },

    /** Update the status of a pending approval. */
    updateApprovalStatus: (
      state,
      action: PayloadAction<{
        approval_id: string;
        status: PendingApproval["status"];
      }>,
    ) => {
      const { approval_id, status } = action.payload;
      const approval = state.pendingApprovals[approval_id];
      if (approval) {
        approval.status = status;
      }
    },
  },
});

export const {
  addApprovals,
  addApproval,
  removeApproval,
  clearAllApprovals,
  openApprovalDialog,
  closeApprovalDialog,
  updateApprovalStatus,
} = approvalsSlice.actions;

export default approvalsSlice.reducer;
