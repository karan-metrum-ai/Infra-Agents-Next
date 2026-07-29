import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Edge, Node } from "@xyflow/react";

/**
 * Partial Phase 13 pull-forward of the Vite app's `store/slices/workflowSlice.ts`
 * (369 LOC total). That slice mixes canvas mirror state (`nodes`/`edges`),
 * execution/status tracking, team-builder draft fields, and deployed-team
 * persistence into one reducer. Only the piece Phase 7's Workflow Designer
 * and the already-ported Phase 5 `dashboard/AgentTeamView`/`TeamsDashboard`
 * both touch is pulled forward here: a one-way mirror of the canvas's
 * persisted agent nodes/edges (written by `useWorkflowCanvas`, read by a
 * later phase wiring up `AgentTeamView`) plus a minimal `hasDeployedTeams`
 * flag (drives the Workflow Designer's "Move to Dashboard" button).
 *
 * Deliberately NOT pulled forward: execution status/progress/logs, the
 * team-builder draft fields (teamName/selectedAgents/selectedTools/
 * selectedModelClients — these live as local canvas-hook state instead,
 * since nothing outside this phase reads them), and the full
 * `deployedTeams` list + its `localStorage` persistence
 * (`utils/deployedTeamsPersistence.ts`) — that's real Phase 11 scope.
 * `hasDeployedTeams` here is a plain in-memory flag set once a deploy
 * succeeds; reconcile with the real `deployedTeams` array when Phase 11
 * lands.
 */
export interface WorkflowCanvasState {
  nodes: Node[];
  edges: Edge[];
  hasDeployedTeams: boolean;
}

const initialState: WorkflowCanvasState = {
  nodes: [],
  edges: [],
  hasDeployedTeams: false,
};

const workflowCanvasSlice = createSlice({
  name: "workflowCanvas",
  initialState,
  reducers: {
    setCanvasNodes: (state, action: PayloadAction<Node[]>) => {
      state.nodes = action.payload;
    },
    setCanvasEdges: (state, action: PayloadAction<Edge[]>) => {
      state.edges = action.payload;
    },
    setHasDeployedTeams: (state, action: PayloadAction<boolean>) => {
      state.hasDeployedTeams = action.payload;
    },
  },
});

export const { setCanvasNodes, setCanvasEdges, setHasDeployedTeams } = workflowCanvasSlice.actions;
export default workflowCanvasSlice.reducer;
