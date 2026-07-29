import type { WorkflowCanvasState } from "./workflowCanvasSlice";

interface WorkflowCanvasRootState {
  workflowCanvas: WorkflowCanvasState;
}

export const selectNodes = (state: WorkflowCanvasRootState) => state.workflowCanvas.nodes;
export const selectEdges = (state: WorkflowCanvasRootState) => state.workflowCanvas.edges;
export const selectHasDeployedTeams = (state: WorkflowCanvasRootState) =>
  state.workflowCanvas.hasDeployedTeams;
