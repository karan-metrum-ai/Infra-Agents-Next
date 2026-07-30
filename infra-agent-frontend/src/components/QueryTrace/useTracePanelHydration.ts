import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { AppDispatch } from "@/store/store";
import { parseTraceData, type ParsedTraceData, type RawTraceInput } from "./traceDataParser";
import { isFlowSnapshotCompleted } from "./flowSnapshotAdapter";
import {
  addApprovals,
  removeApproval,
  type PendingApproval,
} from "@/features/approvals/approvalsSlice";
import { PLAN_APPROVAL_ID } from "./useFlowStream";

interface UseTracePanelHydrationParams {
  correlationId: string;
  wsFlowData: Record<string, unknown> | null;
  dispatch: AppDispatch;
  /** True once the v2 block store has renderable blocks for this correlation id. */
  v2Ready: boolean;
}

interface TracePanelHydration {
  traceData: ParsedTraceData | null;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  snapshotHydrated: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  pendingApprovals: PendingApproval[];
  setPendingApprovals: Dispatch<SetStateAction<PendingApproval[]>>;
}

/**
 * Owns `QueryTracePanel`'s per-correlation-id local trace state, hydrated
 * from the SSE-mirrored `flowStream` Redux slice.
 *
 * Two `.cursor/skills/sans-effect` decisions worth calling out:
 *
 * 1. Resetting local state when `correlationId` changes is done via the
 *    React-documented "adjust state during render when a prop changes"
 *    pattern (compare against a ref, call `setState` directly in the
 *    render body) instead of `useEffect(() => reset(), [correlationId])`
 *    — no extra render, no effect. This intentionally does NOT use a
 *    `key`-remount (Pattern 5's usual answer) because `QueryTracePanel`
 *    has no current mount-site to add a `key` to yet (Phase 5's
 *    `TeamsDashboard.tsx` isn't ported); revisit when it lands.
 * 2. The one real `useEffect` below is a genuine "latch external
 *    streamed data + notify a separate global slice" sync: `traceData`
 *    must persist across renders even after `wsFlowData` stops matching
 *    (there is no pure function of current props that reproduces "the
 *    last valid parse"), and dispatching `addApprovals`/`removeApproval`
 *    writes into `approvalsSlice` — a store other components (the
 *    approvals bell) read — which is an external-system side effect,
 *    not a value a render can just return.
 */
export function useTracePanelHydration({
  correlationId,
  wsFlowData,
  dispatch,
  v2Ready,
}: UseTracePanelHydrationParams): TracePanelHydration {
  const [lastCorrelationId, setLastCorrelationId] = useState(correlationId);
  const [traceData, setTraceData] = useState<ParsedTraceData | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotHydrated, setSnapshotHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (correlationId !== lastCorrelationId) {
    setLastCorrelationId(correlationId);
    setTraceData(null);
    setPendingApprovals([]);
    setLoading(true);
    setSnapshotHydrated(false);
    setError(null);
  }

  useEffect(() => {
    if (!wsFlowData) return;

    const flowCorrelationId = wsFlowData.correlation_id as string | undefined;
    if (!flowCorrelationId || flowCorrelationId !== correlationId) {
      return;
    }

    const rawTrace = wsFlowData.trace;
    if (!rawTrace || !Array.isArray(rawTrace)) return;

    const parsed = parseTraceData(wsFlowData as RawTraceInput);
    setTraceData(parsed);
    setLoading(false);
    setSnapshotHydrated(true);
    setError(null);

    const approvals = wsFlowData.pending_approvals as PendingApproval[] | undefined;
    const flowCompleted = isFlowSnapshotCompleted(wsFlowData);
    if (approvals && approvals.length > 0 && !flowCompleted) {
      setPendingApprovals(approvals);
      dispatch(addApprovals(approvals));
    } else {
      setPendingApprovals([]);
      if (flowCompleted) {
        dispatch(removeApproval(PLAN_APPROVAL_ID));
      }
    }
  }, [wsFlowData, correlationId, dispatch]);

  return {
    traceData,
    loading: v2Ready ? false : loading,
    setLoading,
    snapshotHydrated: snapshotHydrated || v2Ready,
    error,
    setError,
    pendingApprovals,
    setPendingApprovals,
  };
}
