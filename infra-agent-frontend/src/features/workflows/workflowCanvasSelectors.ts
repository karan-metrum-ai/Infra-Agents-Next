import { createSelector } from "@reduxjs/toolkit";
import type { DeployedTeam, WorkflowCanvasState } from "./workflowCanvasSlice";

interface WorkflowCanvasRootState {
  workflowCanvas: WorkflowCanvasState;
}

export const selectNodes = (state: WorkflowCanvasRootState) => state.workflowCanvas.nodes;
export const selectEdges = (state: WorkflowCanvasRootState) => state.workflowCanvas.edges;
export const selectHasDeployedTeams = (state: WorkflowCanvasRootState) =>
  state.workflowCanvas.hasDeployedTeams;
export const selectDeployedTeams = (state: WorkflowCanvasRootState) =>
  state.workflowCanvas.deployedTeams;

/**
 * Mirrors the Vite app's `getMostRecentDeployedTeamId()` (sort by
 * `deployedAt` descending), as a memoized Redux selector reading from
 * `state.workflowCanvas.deployedTeams` — components should read via this
 * selector rather than calling `deployedTeamsPersistence.ts`'s own
 * `getMostRecentDeployedTeamId` free function directly (that one remains
 * for the slice's own initial-seed / non-React use).
 */
const selectMostRecentDeployedTeam = createSelector(
  [selectDeployedTeams],
  (deployedTeams): DeployedTeam | null => {
    if (deployedTeams.length === 0) {
      return null;
    }
    const sorted = deployedTeams.toSorted(
      (a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
    );
    return sorted[0];
  },
);

export const selectMostRecentDeployedTeamId = createSelector(
  [selectMostRecentDeployedTeam],
  (team): string | null => team?.id ?? null,
);

/** The most-recently-deployed team's `clusterId` — the shape `AgentTeamView`'s
 * cluster-fallback needs. */
export const selectMostRecentDeployedClusterId = createSelector(
  [selectMostRecentDeployedTeam],
  (team): string | null => team?.clusterId ?? null,
);
