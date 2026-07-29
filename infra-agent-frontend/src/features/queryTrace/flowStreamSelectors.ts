import type { FlowStreamState } from "./flowStreamSlice";

interface FlowStreamRootState {
  flowStream: FlowStreamState;
}

export const selectFlowStreamConnected = (state: FlowStreamRootState) => state.flowStream.connected;
export const selectFlowStreamError = (state: FlowStreamRootState) => state.flowStream.error;
export const selectFlowStreamCorrelationId = (state: FlowStreamRootState) =>
  state.flowStream.correlationId;
export const selectFlowStreamSessionId = (state: FlowStreamRootState) => state.flowStream.sessionId;
export const selectFlowStreamQueryStatus = (state: FlowStreamRootState) =>
  state.flowStream.queryStatus;
export const selectFlowStreamQueryResponse = (state: FlowStreamRootState) =>
  state.flowStream.queryResponse;
export const selectFlowStreamQueryReasoning = (state: FlowStreamRootState) =>
  state.flowStream.queryReasoning;
export const selectFlowStreamLastSeq = (state: FlowStreamRootState) => state.flowStream.lastSeq;
export const selectFlowStreamPlanBundle = (state: FlowStreamRootState) =>
  state.flowStream.planBundle;
export const selectFlowStreamFlowData = (state: FlowStreamRootState) => state.flowStream.flowData;
export const selectFlowStreamPhases = (state: FlowStreamRootState) => state.flowStream.phases;
export const selectFlowStreamTelemetry = (state: FlowStreamRootState) => state.flowStream.telemetry;
export const selectFlowsList = (state: FlowStreamRootState) => state.flowStream.flowsList;
export const selectFlowsListTeamId = (state: FlowStreamRootState) =>
  state.flowStream.flowsListTeamId;
export const selectFlowsListNextCursor = (state: FlowStreamRootState) =>
  state.flowStream.flowsListNextCursor;
export const selectFlowsListLoading = (state: FlowStreamRootState) =>
  state.flowStream.flowsListLoading;
export const selectFlowStreamViewingQuery = (state: FlowStreamRootState) =>
  state.flowStream.viewingQuery;
