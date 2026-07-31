import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Edge, Node } from "@xyflow/react";
import {
  loadDeployedTeams,
  addAndPersistDeployedTeam,
  removeAndPersistDeployedTeam,
  clearDeployedTeams as clearPersistedDeployedTeams,
} from "@/utils/deployedTeamsPersistence";

/**
 * Partial Phase 13 pull-forward of the Vite app's `store/slices/workflowSlice.ts`
 * (369 LOC total). That slice mixes canvas mirror state (`nodes`/`edges`),
 * execution/status tracking, team-builder draft fields, and deployed-team
 * persistence into one reducer. Only the piece Phase 7's Workflow Designer
 * and the already-ported Phase 5 `dashboard/AgentTeamView`/`TeamsDashboard`
 * both touch is pulled forward here: a one-way mirror of the canvas's
 * persisted agent nodes/edges (written by `useWorkflowCanvas`, read by a
 * later phase wiring up `AgentTeamView`), a minimal `hasDeployedTeams`
 * flag (drives the Workflow Designer's "Move to Dashboard" button), and —
 * as of Phase 11 — the real `deployedTeams` list, seeded from and kept in
 * sync with `localStorage` via `utils/deployedTeamsPersistence.ts`
 * (mirrors the Vite slice's `addAndPersistDeployedTeam`/
 * `removeAndPersistDeployedTeam`/`clearPersistedDeployedTeams` reducers).
 *
 * Deliberately NOT pulled forward: execution status/progress/logs, the
 * team-builder draft fields (teamName/selectedAgents/selectedTools/
 * selectedModelClients — these live as local canvas-hook state instead,
 * since nothing outside this phase reads them).
 */
export interface DeployedTeam {
  id: string;
  name: string;
  deployedAt: string;
  deploymentStatus: string;
  message?: string;
  clusterId?: string;
}

export interface WorkflowCanvasState {
  nodes: Node[];
  edges: Edge[];
  hasDeployedTeams: boolean;
  deployedTeams: DeployedTeam[];
}

const initialState: WorkflowCanvasState = {
  nodes: [],
  edges: [],
  hasDeployedTeams: false,
  // Plain function call at module load (Redux initial-state seed) — not a
  // React effect, so this is outside the sans-effect skill's scope.
  deployedTeams: loadDeployedTeams(),
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
    addDeployedTeam: (state, action: PayloadAction<DeployedTeam>) => {
      state.deployedTeams = addAndPersistDeployedTeam(action.payload);
    },
    removeDeployedTeam: (state, action: PayloadAction<string>) => {
      state.deployedTeams = removeAndPersistDeployedTeam(action.payload);
    },
    clearDeployedTeams: (state) => {
      clearPersistedDeployedTeams();
      state.deployedTeams = [];
    },
  },
});

export const {
  setCanvasNodes,
  setCanvasEdges,
  setHasDeployedTeams,
  addDeployedTeam,
  removeDeployedTeam,
  clearDeployedTeams,
} = workflowCanvasSlice.actions;
export default workflowCanvasSlice.reducer;
