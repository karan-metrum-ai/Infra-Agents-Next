/**
 * Redux Toolkit slice for the v1 SSE flow-stream state (plan bundle,
 * trace metadata, queryStatus, flows list, HITL gating).
 *
 * Partial pull-forward of the Vite app's
 * `store/flowStream/flowStreamSlice.ts` (610 LOC). That file combined
 * two unrelated concerns: (1) this genuinely-used flow/plan state, read
 * by `TeamsDashboard.tsx`, `QueryTracePanel.tsx`, `PhaseTimelineBar.tsx`,
 * `PlanApprovalCard.tsx`, and the `SubAgentTile*` components, and (2) a
 * second, dead duplicate of the `agent_frame`/block-streaming reducers
 * (`blocks`, `todoList`, `interruption`, `applyAgentFrame`, `blockCreated`,
 * `blockUpdated`, `blockLocked`, `streamStarted/Connected/Error/Closed`,
 * `rememberEventId`, `resetStream`) — confirmed to have zero consumers
 * anywhere in the Vite app outside that slice file itself (the real v2
 * block state lives in `components/QueryTrace/blockStream/blockStore.ts`,
 * already ported). Group (2) is intentionally NOT ported here.
 *
 * Also dropped: `activeConversationSessionId`/`activeConversationQuery`
 * + their `setActiveConversation`/`clearActiveConversation` actions — a
 * "reserved for future multi-turn UI" feature whose only write call site
 * (`TeamsDashboard.tsx`) is fully block-commented out (`// Chat
 * continuation — reserved for future multi-turn UI`), so the field can
 * never become non-null in production. Same "confirmed dead, disabled
 * feature" precedent as `DarkVeil`/`GhostTechnician` elsewhere in this
 * migration (see `CLAUDE.md`'s resolved-conflicts table). `lastEventId`
 * is dropped too: its only two mutators (`streamStarted`, `rememberEventId`)
 * are both part of the confirmed-dead group (1) above, so with those
 * gone the field would never be written.
 *
 * `queryResponse`, `queryReasoning`, `telemetry`, and `viewingQuery` are
 * KEPT even though no current UI component reads them (grepped the whole
 * Vite tree) — unlike the cases above, their write paths are real, live,
 * uncommented business logic in `useFlowStream`'s event router (not a
 * disabled feature or a superseded duplicate), so they are preserved as
 * genuine flow state a future consumer may read.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { mergeFlowListItems } from "../../components/QueryTrace/flowListMerge";
import type {
  DAGExport,
  FlowListItem,
  FlowPayload,
  PlanBundle,
  QueryStatus,
  TaskNode,
} from "../../components/QueryTrace/flowPayload.types";

/** Phase event in the execution lifecycle. */
export interface PhaseEvent {
  phase_name: string;
  phase_status: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** Telemetry entry for execution observability. */
export interface TelemetryEntry {
  event_type: string;
  timestamp: string;
  task_id?: string;
  agent_name?: string;
  phase_name?: string;
  phase_status?: string;
  goal?: string;
  response_preview?: string;
  duration_ms?: number;
  tool_name?: string;
  status?: string;
  error_preview?: string;
}

/** Incremental state update operation (from `flow_delta` SSE events). */
export interface FlowDeltaOp {
  op: string;
  phase?: PhaseEvent;
  plan?: PlanBundle;
  fields?: Record<string, unknown>;
  dag_export?: DAGExport;
  task_id?: string;
  status?: string;
  response?: string;
  final_response?: string;
  reasoning?: string;
  error?: string;
}

/** Payload for cluster-scoped recent-flow list updates. */
export interface SetFlowsListPayload {
  teamId: string;
  flows: FlowListItem[];
  /** Replace the list instead of merge-upsert (cluster switch fetch). */
  replace?: boolean;
  /** Cursor for loading the next page, or null when exhausted. */
  nextCursor?: string | null;
}

/** Payload for optimistic / SSE flow row inserts. */
export interface AddFlowToListPayload {
  teamId: string;
  flow: FlowListItem;
}

export interface FlowStreamState {
  // Connection
  connected: boolean;
  error: string | null;

  // Flow identifiers
  correlationId: string | null;
  sessionId: string | null;

  // Query lifecycle
  queryStatus: QueryStatus;
  queryResponse: string | null;
  queryReasoning: string | null;
  lastSeq: string | null;

  // Plan and flow data
  planBundle: PlanBundle | null;
  flowData: FlowPayload | null;
  phases: PhaseEvent[];
  telemetry: Record<string, TelemetryEntry[]>;
  flowsList: FlowListItem[];
  /** Cluster/team that owns `flowsList`; null when cleared. */
  flowsListTeamId: string | null;
  /** Pagination cursor for Query History ("load more"). */
  flowsListNextCursor: string | null;
  /** True while the first page of flows is loading after cluster switch. */
  flowsListLoading: boolean;
  viewingQuery: string | null;
}

const initialState: FlowStreamState = {
  connected: false,
  error: null,

  correlationId: null,
  sessionId: null,

  queryStatus: "idle",
  queryResponse: null,
  queryReasoning: null,
  lastSeq: null,

  planBundle: null,
  flowData: null,
  phases: [],
  telemetry: {},
  flowsList: [],
  flowsListTeamId: null,
  flowsListNextCursor: null,
  flowsListLoading: false,
  viewingQuery: null,
};

function sortAndCapFlowList(flows: FlowListItem[]): FlowListItem[] {
  return flows
    .toSorted((a, b) => {
      const ta = a.created_at ?? "";
      const tb = b.created_at ?? "";
      return tb.localeCompare(ta);
    })
    .slice(0, 500);
}

const flowStreamSlice = createSlice({
  name: "flowStream",
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },

    setCorrelationId(state, action: PayloadAction<string | null>) {
      state.correlationId = action.payload;
    },

    setSessionId(state, action: PayloadAction<string | null>) {
      state.sessionId = action.payload;
    },

    setQueryStatus(state, action: PayloadAction<QueryStatus>) {
      state.queryStatus = action.payload;
    },

    setQueryResponse(state, action: PayloadAction<string | null>) {
      state.queryResponse = action.payload;
    },

    setQueryReasoning(state, action: PayloadAction<string | null>) {
      state.queryReasoning = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    setLastSeq(state, action: PayloadAction<string | null>) {
      state.lastSeq = action.payload;
    },

    setPlanBundle(state, action: PayloadAction<PlanBundle | null>) {
      state.planBundle = action.payload;
    },

    /** Shallow-merge fields into the existing plan bundle. */
    patchPlanBundle(state, action: PayloadAction<Partial<PlanBundle>>) {
      if (state.planBundle) {
        Object.assign(state.planBundle, action.payload);
        if (action.payload.status === "completed") {
          for (const node of state.planBundle.dag_export.nodes) {
            const st = (node.status || "").toLowerCase();
            if (st !== "failed" && st !== "error") {
              node.status = "completed";
            }
          }
        }
      }
    },

    setFlowData(state, action: PayloadAction<FlowPayload | null>) {
      state.flowData = action.payload;
    },

    addPhase(state, action: PayloadAction<PhaseEvent>) {
      state.phases.push(action.payload);
    },

    updateNodeStatus(
      state,
      action: PayloadAction<{
        taskId: string;
        status: string;
        result?: string;
        error?: string;
        duration_ms?: number;
        tools_used?: string[];
      }>,
    ) {
      if (!state.planBundle) return;
      const { taskId, status, result, error, duration_ms, tools_used } = action.payload;
      const node = state.planBundle.dag_export.nodes.find((n) => n.task_id === taskId);
      if (node) {
        node.status = status;
        if (result !== undefined) node.result = result;
        if (error !== undefined) node.error = error;
        if (duration_ms !== undefined) node.duration_ms = duration_ms;
        if (tools_used !== undefined) node.tools_used = tools_used;
      }
    },

    setFlowsList(state, action: PayloadAction<SetFlowsListPayload>) {
      const { teamId, flows: incoming, replace = false, nextCursor = null } = action.payload;

      if (replace) {
        if (state.flowsListTeamId !== null && state.flowsListTeamId !== teamId) {
          return;
        }
        state.flowsListTeamId = teamId;
        // Union-merge: API rows win on conflict, but keep local-only
        // flows (e.g. optimistic submit) until the server indexes them.
        const existingMap = new Map(
          state.flowsList.map((f) => [f.correlation_id ?? f.session_id, f]),
        );
        for (const flow of incoming) {
          const key = flow.correlation_id ?? flow.session_id;
          if (!key) {
            continue;
          }
          const existing = existingMap.get(key);
          existingMap.set(key, existing ? mergeFlowListItems(existing, flow) : flow);
        }
        state.flowsList = sortAndCapFlowList(Array.from(existingMap.values()));
        state.flowsListNextCursor = nextCursor ?? null;
        state.flowsListLoading = false;
        return;
      }

      if (state.flowsListTeamId !== null && state.flowsListTeamId !== teamId) {
        return;
      }

      state.flowsListTeamId = teamId;
      state.flowsListNextCursor = nextCursor ?? state.flowsListNextCursor;

      if (incoming.length === 0 && state.flowsList.length > 0) {
        state.flowsListLoading = false;
        return;
      }

      const existingMap = new Map(
        state.flowsList.map((f) => [f.correlation_id ?? f.session_id, f]),
      );
      for (const flow of incoming) {
        const key = flow.correlation_id ?? flow.session_id;
        if (!key) {
          continue;
        }
        const existing = existingMap.get(key);
        existingMap.set(key, existing ? mergeFlowListItems(existing, flow) : flow);
      }
      state.flowsList = sortAndCapFlowList(Array.from(existingMap.values()));
      state.flowsListLoading = false;
    },

    setFlowsListLoading(state, action: PayloadAction<boolean>) {
      state.flowsListLoading = action.payload;
    },

    addFlowToList(state, action: PayloadAction<AddFlowToListPayload>) {
      const { teamId, flow: incoming } = action.payload;

      if (state.flowsListTeamId !== null && state.flowsListTeamId !== teamId) {
        return;
      }

      state.flowsListTeamId = teamId;

      const incomingId = incoming.correlation_id ?? incoming.session_id;
      if (incomingId) {
        const existingIdx = state.flowsList.findIndex(
          (f) => (f.correlation_id ?? f.session_id) === incomingId,
        );
        if (existingIdx !== -1) {
          state.flowsList[existingIdx] = mergeFlowListItems(state.flowsList[existingIdx], incoming);
          return;
        }
      }
      state.flowsList.unshift(incoming);
    },

    patchFlowInList(
      state,
      action: PayloadAction<{
        teamId: string;
        correlationId: string;
        patch: Partial<FlowListItem>;
      }>,
    ) {
      const { teamId, correlationId, patch } = action.payload;
      if (state.flowsListTeamId !== null && state.flowsListTeamId !== teamId) {
        return;
      }
      const idx = state.flowsList.findIndex((f) => f.correlation_id === correlationId);
      if (idx === -1) {
        return;
      }
      state.flowsList[idx] = mergeFlowListItems(state.flowsList[idx], {
        ...state.flowsList[idx],
        ...patch,
      });
    },

    addTelemetry(state, action: PayloadAction<TelemetryEntry>) {
      const taskId = action.payload.task_id || "_global";
      if (!state.telemetry[taskId]) {
        state.telemetry[taskId] = [];
      }
      state.telemetry[taskId].push(action.payload);
    },

    setViewingQuery(state, action: PayloadAction<string | null>) {
      state.viewingQuery = action.payload;
    },

    /** Apply incremental flow_delta operations from the backend. */
    applyFlowDeltaOps(state, action: PayloadAction<FlowDeltaOp[]>) {
      for (const op of action.payload) {
        switch (op.op) {
          case "phase.add":
            if (op.phase) state.phases.push(op.phase);
            break;

          case "plan.set":
            if (op.plan) {
              state.planBundle = op.plan;
              const planStatus = (op.plan.status || "").toLowerCase();
              if (planStatus === "pending" || planStatus === "awaiting_decision") {
                state.queryStatus = "pending_approval";
              }
            }
            break;

          case "plan.patch":
            if (state.planBundle && op.fields) {
              Object.assign(state.planBundle, op.fields);
            }
            break;

          case "dag.set":
            if (op.dag_export && state.planBundle) {
              state.planBundle.dag_export = op.dag_export;
            }
            break;

          case "task.patch":
            if (op.task_id && op.fields && state.planBundle) {
              const node = state.planBundle.dag_export.nodes.find(
                (n: TaskNode) => n.task_id === op.task_id,
              );
              if (node) Object.assign(node, op.fields);
            }
            break;

          case "final.set":
            if (op.status === "completed") {
              state.queryStatus = "completed";
              state.queryResponse = (op.final_response ?? op.response) || null;
              state.queryReasoning = op.reasoning ?? null;
            } else if (op.status === "error") {
              state.queryStatus = "error";
              state.error = op.error || "Unknown error";
            }
            break;

          default:
        }
      }
    },

    /**
     * Reset session state while preserving connection and flows list.
     * Used when starting a new query on the same cluster.
     */
    resetSession(state) {
      state.correlationId = null;
      state.sessionId = null;
      state.queryStatus = "idle";
      state.queryResponse = null;
      state.queryReasoning = null;
      state.error = null;
      state.lastSeq = null;
      state.planBundle = null;
      state.flowData = null;
      state.phases = [];
      state.telemetry = {};
      state.viewingQuery = null;
      // Preserved: connected, flowsList*.
    },

    /**
     * Clear the flows list without touching other state. Used on cluster
     * switch so stale flows from the previous cluster are removed before
     * the new list is fetched.
     */
    clearFlowsList(state) {
      state.flowsList = [];
      state.flowsListTeamId = null;
      state.flowsListNextCursor = null;
      state.flowsListLoading = false;
    },

    /**
     * Full state reset including the flows list. Used when switching
     * clusters (different SSE endpoint).
     */
    resetFullState() {
      return { ...initialState };
    },
  },
});

export const {
  setConnected,
  setCorrelationId,
  setSessionId,
  setQueryStatus,
  setQueryResponse,
  setQueryReasoning,
  setError,
  setLastSeq,
  setPlanBundle,
  patchPlanBundle,
  setFlowData,
  addPhase,
  updateNodeStatus,
  setFlowsList,
  setFlowsListLoading,
  addFlowToList,
  patchFlowInList,
  addTelemetry,
  setViewingQuery,
  applyFlowDeltaOps,
  resetSession,
  clearFlowsList,
  resetFullState,
} = flowStreamSlice.actions;

export default flowStreamSlice.reducer;
