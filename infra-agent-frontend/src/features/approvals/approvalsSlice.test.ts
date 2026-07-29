import { describe, it, expect } from "vitest";
import reducer, {
  addApprovals,
  addApproval,
  removeApproval,
  clearAllApprovals,
  openApprovalDialog,
  closeApprovalDialog,
  updateApprovalStatus,
  type PendingApproval,
} from "./approvalsSlice";
import {
  selectPendingApprovals,
  selectPendingApprovalCount,
  selectApprovalById,
  selectSelectedApproval,
  selectIsDialogOpen,
} from "./approvalsSelectors";

const makeApproval = (id: string, overrides?: Partial<PendingApproval>): PendingApproval => ({
  approval_id: id,
  tool_name: "restart_service",
  tool_args: { device_name: "srv-01" },
  agent_name: "hardware_ops",
  status: "pending",
  created_at: "2026-04-13T00:00:00Z",
  message: `Approval request ${id}`,
  ...overrides,
});

const INITIAL = {
  pendingApprovals: {},
  selectedApprovalId: null,
  isDialogOpen: false,
};

describe("approvalsSlice reducers", () => {
  it("returns initial state", () => {
    expect(reducer(undefined, { type: "unknown" })).toEqual(INITIAL);
  });

  it("addApproval inserts a single approval", () => {
    const a = makeApproval("a1");
    const state = reducer(undefined, addApproval(a));
    expect(state.pendingApprovals.a1).toEqual(a);
  });

  it("addApprovals inserts multiple approvals", () => {
    const approvals = [makeApproval("a1"), makeApproval("a2")];
    const state = reducer(undefined, addApprovals(approvals));
    expect(Object.keys(state.pendingApprovals)).toHaveLength(2);
  });

  it("addApprovals overwrites existing by same id", () => {
    const a1 = makeApproval("a1", { message: "original" });
    let state = reducer(undefined, addApproval(a1));

    const a1Updated = makeApproval("a1", { message: "updated" });
    state = reducer(state, addApprovals([a1Updated]));
    expect(state.pendingApprovals.a1.message).toBe("updated");
  });

  it("removeApproval deletes by id", () => {
    const a1 = makeApproval("a1");
    let state = reducer(undefined, addApproval(a1));
    state = reducer(state, removeApproval("a1"));
    expect(state.pendingApprovals.a1).toBeUndefined();
  });

  it("removeApproval closes dialog if removed approval was selected", () => {
    const a1 = makeApproval("a1");
    let state = reducer(undefined, addApproval(a1));
    state = reducer(state, openApprovalDialog("a1"));
    expect(state.isDialogOpen).toBe(true);

    state = reducer(state, removeApproval("a1"));
    expect(state.isDialogOpen).toBe(false);
    expect(state.selectedApprovalId).toBeNull();
  });

  it("clearAllApprovals resets everything", () => {
    let state = reducer(undefined, addApprovals([makeApproval("a1"), makeApproval("a2")]));
    state = reducer(state, openApprovalDialog("a1"));
    state = reducer(state, clearAllApprovals());
    expect(state).toEqual(INITIAL);
  });

  it("openApprovalDialog sets selected and opens", () => {
    const a1 = makeApproval("a1");
    let state = reducer(undefined, addApproval(a1));
    state = reducer(state, openApprovalDialog("a1"));
    expect(state.selectedApprovalId).toBe("a1");
    expect(state.isDialogOpen).toBe(true);
  });

  it("openApprovalDialog is a no-op if id does not exist", () => {
    const state = reducer(undefined, openApprovalDialog("nonexistent"));
    expect(state.isDialogOpen).toBe(false);
    expect(state.selectedApprovalId).toBeNull();
  });

  it("closeApprovalDialog resets dialog state", () => {
    const a1 = makeApproval("a1");
    let state = reducer(undefined, addApproval(a1));
    state = reducer(state, openApprovalDialog("a1"));
    state = reducer(state, closeApprovalDialog());
    expect(state.isDialogOpen).toBe(false);
    expect(state.selectedApprovalId).toBeNull();
  });

  it("updateApprovalStatus changes status of existing", () => {
    const a1 = makeApproval("a1");
    let state = reducer(undefined, addApproval(a1));
    state = reducer(state, updateApprovalStatus({ approval_id: "a1", status: "approved" }));
    expect(state.pendingApprovals.a1.status).toBe("approved");
  });

  it("updateApprovalStatus is a no-op if id not found", () => {
    const state = reducer(
      undefined,
      updateApprovalStatus({ approval_id: "ghost", status: "denied" }),
    );
    expect(Object.keys(state.pendingApprovals)).toHaveLength(0);
  });
});

describe("approvalsSelectors", () => {
  const a1 = makeApproval("a1");
  const a2 = makeApproval("a2");
  const root = {
    approvals: {
      pendingApprovals: { a1, a2 },
      selectedApprovalId: "a1",
      isDialogOpen: true,
    },
  };

  it("selectPendingApprovals returns array", () => {
    expect(selectPendingApprovals(root)).toHaveLength(2);
  });

  it("selectPendingApprovalCount", () => {
    expect(selectPendingApprovalCount(root)).toBe(2);
  });

  it("selectApprovalById returns matching", () => {
    expect(selectApprovalById(root, "a1")?.approval_id).toBe("a1");
  });

  it("selectApprovalById returns undefined for unknown", () => {
    expect(selectApprovalById(root, "nope")).toBeUndefined();
  });

  it("selectSelectedApproval returns the selected one", () => {
    expect(selectSelectedApproval(root)?.approval_id).toBe("a1");
  });

  it("selectSelectedApproval returns null if nothing selected", () => {
    const empty = { approvals: { ...root.approvals, selectedApprovalId: null } };
    expect(selectSelectedApproval(empty)).toBeNull();
  });

  it("selectIsDialogOpen", () => {
    expect(selectIsDialogOpen(root)).toBe(true);
  });
});
