// Deployed Teams Persistence Manager
import type { DeployedTeam } from "@/features/workflows/workflowCanvasSlice";

const DEPLOYED_TEAMS_STORAGE_KEY = "infra-agent-deployed-teams";

/**
 * Save deployed teams to localStorage
 */
export const saveDeployedTeams = (teams: DeployedTeam[]): void => {
  try {
    localStorage.setItem(DEPLOYED_TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {
    // Storage write failed - likely quota exceeded
  }
};

/**
 * Load deployed teams from localStorage
 */
export const loadDeployedTeams = (): DeployedTeam[] => {
  try {
    const stored = localStorage.getItem(DEPLOYED_TEAMS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as DeployedTeam[];
    }
  } catch {
    // Storage read or parse failed
  }
  return [];
};

/**
 * Clear deployed teams from localStorage
 */
export const clearDeployedTeams = (): void => {
  try {
    localStorage.removeItem(DEPLOYED_TEAMS_STORAGE_KEY);
  } catch {
    // Storage removal failed
  }
};

/**
 * Add a new deployed team and persist it
 */
export const addAndPersistDeployedTeam = (team: DeployedTeam): DeployedTeam[] => {
  const existingTeams = loadDeployedTeams();
  const filteredTeams = existingTeams.filter((t) => t.id !== team.id);
  const updatedTeams = [...filteredTeams, team];
  saveDeployedTeams(updatedTeams);
  return updatedTeams;
};

/**
 * Remove a deployed team and persist the change
 */
export const removeAndPersistDeployedTeam = (teamId: string): DeployedTeam[] => {
  const existingTeams = loadDeployedTeams();
  const filteredTeams = existingTeams.filter((t) => t.id !== teamId);
  saveDeployedTeams(filteredTeams);
  return filteredTeams;
};

/**
 * Get the most recently deployed team ID
 */
export const getMostRecentDeployedTeamId = (): string | null => {
  const teams = loadDeployedTeams();
  if (teams.length === 0) {
    return null;
  }

  const sortedTeams = teams.toSorted(
    (a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime(),
  );

  return sortedTeams[0].id;
};
