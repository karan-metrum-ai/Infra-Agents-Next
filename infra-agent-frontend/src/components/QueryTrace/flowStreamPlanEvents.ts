/**
 * Legacy v1 SSE event handling — dispatches into the `flowStream` and
 * `approvals` Redux slices. Split out of the Vite app's
 * `hooks/useFlowStream.ts` `handleFlowEvent` switch (every case except
 * the v2 `agent_frame`/`block_*` group, which lives in
 * `flowStreamBlockEvents.ts`). The `flow_state` case alone was ~250 LOC
 * in the original single switch, so it is further split into
 * `handleFlowStateEvent` below.
 */
import type { RefObject } from "react";
import type { AppDispatch } from "@/store/store";
import {
  addApproval,
  addApprovals,
  removeApproval,
  type PendingApproval,
} from "@/features/approvals/approvalsSlice";
import {
  addFlowToList,
  addPhase,
  addTelemetry,
  applyFlowDeltaOps,
  patchFlowInList,
  patchPlanBundle,
  setCorrelationId,
  setConnected,
  setError,
  setFlowData,
  setPlanBundle,
  setQueryReasoning,
  setQueryResponse,
  setQueryStatus,
  setSessionId,
  updateNodeStatus,
  type FlowDeltaOp,
  type TelemetryEntry,
} from "@/features/queryTrace/flowStreamSlice";
import { fetchPlanSnapshot } from "./flowStreamApi";
import {
  isFlowSnapshotCompleted,
  normalizeFlowSnapshot,
  reconcilePlanBundleForCompletedFlow,
} from "./flowSnapshotAdapter";
import { isPostApprovalPlanStatus } from "./deriveTraceStatus";
import { isPlanTransitionMessage } from "./planTransitionMessages";
import { mergeFlowPayload } from "./flowTraceMerge";
import {
  applyCompletedFlowUiState,
  makePlanApprovalEntry,
  PLAN_APPROVAL_ID,
  resolveExtractedPlanStatus,
} from "./flowStreamHelpers";
import type { FlowListItem, FlowPayload, PlanBundle } from "./flowPayload.types";

export interface FlowStreamPlanEventContext {
  dispatch: AppDispatch;
  teamIdRef: RefObject<string>;
  correlationIdRef: RefObject<string | null>;
  flowDataRef: RefObject<FlowPayload | null>;
  flowStateReceivedRef: RefObject<boolean>;
  hydrateBlocksForFlow: (correlationId: string) => void;
}

function asRecord(payload: FlowPayload): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>;
}

/** `PLAN_APPROVAL_ID` in this module refers to the shared helper constant. */
const PLAN_APPROVAL_BELL_ID = PLAN_APPROVAL_ID;

/** Route one legacy v1 flow-management event into the `flowStream`/`approvals` slices. */
export function handlePlanEvent(
  messageType: string,
  data: Record<string, unknown>,
  event: { correlation_id?: string; timestamp?: string },
  isStale: boolean,
  ctx: FlowStreamPlanEventContext,
): void {
  const { dispatch, teamIdRef, correlationIdRef } = ctx;

  switch (messageType) {
    case "connected":
      dispatch(setConnected(true));
      break;

    case "query_accepted": {
      const sid = data.session_id as string | undefined;
      const cid = data.correlation_id as string | undefined;
      if (sid) dispatch(setSessionId(sid));
      if (cid) dispatch(setCorrelationId(cid));
      dispatch(setQueryStatus("processing"));
      break;
    }

    case "flow_state":
      handleFlowStateEvent(data, isStale, ctx);
      break;

    case "flow_delta": {
      if (isStale) break;
      const ops = data.ops as FlowDeltaOp[] | undefined;
      if (ops && ops.length > 0) {
        dispatch(applyFlowDeltaOps(ops));

        // When plan.set arrives with pending status, trigger the
        // approval notification (the reducer handles queryStatus).
        const planSetOp = ops.find((o) => o.op === "plan.set");
        if (planSetOp?.plan) {
          const planStatus = (planSetOp.plan.status || "").toLowerCase();
          if (planStatus === "pending" || planStatus === "awaiting_decision") {
            dispatch(addApproval(makePlanApprovalEntry(planSetOp.plan)));
          }
        }
      }
      break;
    }

    case "telemetry_update": {
      const entry = data.entry as TelemetryEntry | undefined;
      if (entry) dispatch(addTelemetry(entry));
      break;
    }

    case "plan_state": {
      if (isStale) break;
      const plan = data.plan as PlanBundle | null;
      if (plan) {
        dispatch(setPlanBundle(plan));
        if (!plan.status || plan.status === "pending" || plan.status === "awaiting_decision") {
          dispatch(addApproval(makePlanApprovalEntry(plan)));
        }
      }
      break;
    }

    case "plan_ready": {
      if (isStale) break;
      const readyPlan = data as unknown as PlanBundle;
      const readyCid = readyPlan.correlation_id ?? event.correlation_id;
      if (readyCid) {
        correlationIdRef.current = readyCid;
        dispatch(setCorrelationId(readyCid));
      }
      dispatch(setPlanBundle(readyPlan));
      dispatch(
        addPhase({
          phase_name: "plan_ready",
          phase_status: "completed",
          timestamp: event.timestamp ?? new Date().toISOString(),
        }),
      );
      if (
        !readyPlan.status ||
        readyPlan.status === "pending" ||
        readyPlan.status === "awaiting_decision"
      ) {
        dispatch(addApproval(makePlanApprovalEntry(readyPlan)));
      }
      break;
    }

    case "phase_update":
      if (isStale) break;
      dispatch(
        addPhase({
          phase_name: data.phase_name as string,
          phase_status: data.phase_status as string,
          timestamp: event.timestamp ?? new Date().toISOString(),
          metadata: data.metadata as Record<string, unknown> | undefined,
        }),
      );
      break;

    case "task_update": {
      if (isStale) break;
      const taskId = data.task_id as string | undefined;
      const status = data.status as string | undefined;
      if (taskId && status) {
        dispatch(
          updateNodeStatus({
            taskId,
            status,
            result: data.result as string | undefined,
            error: data.error as string | undefined,
            duration_ms: data.duration_ms as number | undefined,
            tools_used: data.tools_used as string[] | undefined,
          }),
        );
      }
      break;
    }

    case "plan_decision":
      if (isStale) break;
      dispatch(removeApproval(PLAN_APPROVAL_BELL_ID));
      if (data.decision === "approve") {
        dispatch(patchPlanBundle({ status: "approved" }));
        dispatch(setQueryStatus("approved"));
      } else if (data.decision === "reject") {
        dispatch(patchPlanBundle({ status: "rejected" }));
        dispatch(setQueryStatus("completed"));
        dispatch(setQueryResponse((data.reason as string) ?? "Plan was rejected by the user."));
      }
      break;

    case "execution_started":
      if (isStale) break;
      dispatch(patchPlanBundle({ status: "executing" }));
      dispatch(setQueryStatus("executing"));
      dispatch(
        addPhase({
          phase_name: "execution",
          phase_status: "started",
          timestamp: event.timestamp ?? new Date().toISOString(),
        }),
      );
      break;

    case "execution_completed":
      if (isStale) break;
      dispatch(patchPlanBundle({ status: "completed" }));
      dispatch(setQueryStatus("completed"));
      dispatch(
        addPhase({
          phase_name: "execution",
          phase_status: "completed",
          timestamp: event.timestamp ?? new Date().toISOString(),
        }),
      );
      if (data.final_response) {
        dispatch(setQueryResponse(data.final_response as string));
      }
      if (data.reasoning) {
        dispatch(setQueryReasoning(data.reasoning as string));
      }
      break;

    case "execution_failed":
      if (isStale) break;
      dispatch(patchPlanBundle({ status: "failed" }));
      dispatch(setQueryStatus("error"));
      dispatch(setError((data.error as string) ?? "Execution failed"));
      dispatch(
        addPhase({
          phase_name: "execution",
          phase_status: "failed",
          timestamp: event.timestamp ?? new Date().toISOString(),
        }),
      );
      break;

    case "decision_accepted":
    case "execution_acknowledged":
      break;

    case "session_start":
      if (isStale) break;
      dispatch(setQueryStatus("processing"));
      if (data.correlation_id) {
        dispatch(setCorrelationId(data.correlation_id as string));
      }
      break;

    case "session_complete": {
      if (isStale) break;
      dispatch(setQueryStatus("completed"));
      if (data.response) {
        dispatch(setQueryResponse(data.response as string));
      }
      if (data.reasoning) {
        dispatch(setQueryReasoning(data.reasoning as string));
      }
      const completeCid =
        (data.correlation_id as string | undefined) ?? correlationIdRef.current ?? undefined;
      if (completeCid) {
        dispatch(
          patchFlowInList({
            teamId: teamIdRef.current,
            correlationId: completeCid,
            patch: {
              status: (data.status as string) ?? "completed",
              completed_at: (data.completed_at as string | undefined) ?? new Date().toISOString(),
            },
          }),
        );
      }
      break;
    }

    case "session_error": {
      if (isStale) break;
      dispatch(setQueryStatus("error"));
      dispatch(setError((data.error as string) ?? "Session error"));
      const errorCid =
        (data.correlation_id as string | undefined) ?? correlationIdRef.current ?? undefined;
      if (errorCid) {
        dispatch(
          patchFlowInList({
            teamId: teamIdRef.current,
            correlationId: errorCid,
            patch: { status: "error", completed_at: new Date().toISOString() },
          }),
        );
      }
      break;
    }

    case "flow_created": {
      // Always index new flow rows into the list (including cron ticks,
      // for the Cron Jobs panel) — this never touches the active
      // correlation subscription, so there is no additional guard needed
      // beyond the presence check.
      const flowItem = data as unknown as FlowListItem;
      if (flowItem?.correlation_id) {
        dispatch(addFlowToList({ teamId: teamIdRef.current, flow: flowItem }));
      }
      break;
    }

    case "error":
      dispatch(setError((data.message as string) ?? "Unknown server error"));
      break;

    default:
  }
}

/**
 * Handle the `flow_state` event — the richest, most stateful v1 event
 * (full flow snapshot: plan, DAG, phases, trace rows, pending approvals).
 * Extracted from `handlePlanEvent`'s switch purely for file-size/readability
 * reasons; behavior is unchanged from the Vite source.
 */
function handleFlowStateEvent(
  data: Record<string, unknown>,
  isStale: boolean,
  ctx: FlowStreamPlanEventContext,
): void {
  // `isStale` only fires when the top-level JSON has correlation_id.
  // flow_state nests it under flow.correlation_id so the generic guard
  // is blind to it. Explicitly check here.
  if (isStale) return;
  const {
    dispatch,
    teamIdRef,
    correlationIdRef,
    flowDataRef,
    flowStateReceivedRef,
    hydrateBlocksForFlow,
  } = ctx;

  const flow = data.flow as Record<string, unknown> | undefined;
  const flowEventCid = flow?.correlation_id as string | undefined;
  if (
    flowEventCid &&
    correlationIdRef.current !== null &&
    flowEventCid !== correlationIdRef.current
  ) {
    return; // late snapshot from a superseded flow
  }
  flowStateReceivedRef.current = true;
  const plan = data.plan as PlanBundle | null;
  const dag = data.dag as PlanBundle["dag_export"] | null;
  const phases = data.phases as Array<{
    phase_name: string;
    phase_status: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }> | null;
  let flowMarkedCompleted = false;

  if (flow) {
    const merged = mergeFlowPayload(flowDataRef.current, flow as FlowPayload);
    dispatch(setFlowData(merged));
    const normalizedFlow = normalizeFlowSnapshot(asRecord(merged));
    if (isFlowSnapshotCompleted(asRecord(normalizedFlow))) {
      flowMarkedCompleted = true;
      dispatch(setQueryStatus("completed"));
      applyCompletedFlowUiState(dispatch, asRecord(normalizedFlow));
    }
    const flowCid = flow.correlation_id as string | undefined;
    if (flowCid && !correlationIdRef.current) {
      correlationIdRef.current = flowCid;
      dispatch(setCorrelationId(flowCid));
    }
    const trace = flow.trace as Array<Record<string, unknown>> | undefined;

    if (trace) {
      if (!flowMarkedCompleted) {
        const hasPendingApproval = trace.some(
          (t) =>
            t.status === "pending_approval" ||
            (t.final_response as Record<string, unknown> | undefined)?.status ===
              "pending_approval",
        );

        if (hasPendingApproval) {
          const reconciledPlanStatus = plan?.status;
          if (!isPostApprovalPlanStatus(reconciledPlanStatus)) {
            dispatch(setQueryStatus("pending_approval"));
          }
        } else {
          const completed = trace.find(
            (t) =>
              t.status === "completed" &&
              !(t.final_response as Record<string, unknown> | undefined)?.status,
          );
          const finalEntry = trace.find((t) => !!t.final_response);
          const finalStatus = (finalEntry?.final_response as Record<string, unknown> | undefined)
            ?.status as string | undefined;

          if (finalStatus === "completed" || (completed && !finalEntry)) {
            dispatch(setQueryStatus("completed"));
            flowMarkedCompleted = true;
          } else if (!finalEntry && !completed) {
            dispatch(setQueryStatus("processing"));
          }
        }
      }

      if (flowMarkedCompleted && correlationIdRef.current) {
        hydrateBlocksForFlow(correlationIdRef.current);
      }

      const finalEntry = trace.find((t) => !!t.final_response);
      if (finalEntry) {
        const resp = (finalEntry.final_response as Record<string, unknown>)?.content as
          | string
          | undefined;
        if (resp && !isPlanTransitionMessage(resp)) {
          dispatch(setQueryResponse(resp));
        }
      } else {
        const agentEntry = trace.find((t) => {
          const response = t.agent_response as string | undefined;
          return !!response && !isPlanTransitionMessage(response);
        });
        if (agentEntry) {
          dispatch(setQueryResponse(agentEntry.agent_response as string));
        }
      }
    }

    const pendingApprovals = flow.pending_approvals as PendingApproval[] | undefined;
    if (pendingApprovals && pendingApprovals.length > 0 && !flowMarkedCompleted) {
      dispatch(addApprovals(pendingApprovals));
    }

    // Extract plan/DAG from sessions thread_state when the top-level
    // plan field is absent.
    if (!plan) {
      const sessions = flow.sessions as Array<Record<string, unknown>> | undefined;
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        let threadState: Record<string, unknown> | null = null;
        if (typeof session.thread_state === "string") {
          try {
            threadState = JSON.parse(session.thread_state) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
        } else if (session.thread_state && typeof session.thread_state === "object") {
          threadState = session.thread_state as Record<string, unknown>;
        }

        if (threadState?.last_dag_export) {
          const dagExport = threadState.last_dag_export as PlanBundle["dag_export"];
          const cid = flow.correlation_id as string | undefined;
          const extractedStatus = resolveExtractedPlanStatus(session);
          const extractedPlan: Partial<PlanBundle> = {
            correlation_id: cid,
            query: (session.initial_query as string) || "",
            dag_export: dagExport,
            status: flowMarkedCompleted ? "completed" : extractedStatus,
            created_at: session.created_at as string,
          };
          dispatch(setPlanBundle(extractedPlan as PlanBundle));
          if (
            !flowMarkedCompleted &&
            (extractedPlan.status === "pending" || extractedPlan.status === "awaiting_decision")
          ) {
            dispatch(addApproval(makePlanApprovalEntry(extractedPlan as PlanBundle)));
          }

          // Fetch full plan with verification_result from REST in the
          // background.
          if (cid) {
            fetchPlanSnapshot<PlanBundle>(teamIdRef.current, cid)
              .then((fullPlan) => {
                if (fullPlan) {
                  const reconciled = reconcilePlanBundleForCompletedFlow(
                    fullPlan,
                    flowMarkedCompleted || isFlowSnapshotCompleted(flow),
                  );
                  dispatch(setPlanBundle(reconciled));
                  if (reconciled?.status === "completed") {
                    dispatch(removeApproval(PLAN_APPROVAL_BELL_ID));
                  }
                }
              })
              .catch(() => {
                /* soft-fail */
              });
          }
        }
      }
    }

    if (!flowMarkedCompleted && isFlowSnapshotCompleted(asRecord(normalizedFlow))) {
      flowMarkedCompleted = true;
      dispatch(setQueryStatus("completed"));
      applyCompletedFlowUiState(dispatch, asRecord(normalizedFlow));
    }
    if (flowMarkedCompleted) {
      const listCid =
        (flow.correlation_id as string | undefined) ?? correlationIdRef.current ?? undefined;
      if (listCid) {
        dispatch(
          patchFlowInList({
            teamId: teamIdRef.current,
            correlationId: listCid,
            patch: { status: "completed", completed_at: new Date().toISOString() },
          }),
        );
      }
    }
  }
  if (plan) {
    const reconciledPlan = reconcilePlanBundleForCompletedFlow(plan, flowMarkedCompleted);
    dispatch(setPlanBundle(reconciledPlan));
    if (
      reconciledPlan &&
      (!reconciledPlan.status ||
        reconciledPlan.status === "pending" ||
        reconciledPlan.status === "awaiting_decision")
    ) {
      dispatch(addApproval(makePlanApprovalEntry(reconciledPlan)));
    }
  }
  if (dag && !plan) {
    dispatch(patchPlanBundle({ dag_export: dag }));
  }
  if (phases) {
    for (const p of phases) dispatch(addPhase(p));
  }
  if (flow) {
    applyCompletedFlowUiState(dispatch, asRecord(normalizeFlowSnapshot(flow)));
  }
}
