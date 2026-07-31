import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveDeployedTeams,
  loadDeployedTeams,
  clearDeployedTeams,
  addAndPersistDeployedTeam,
  removeAndPersistDeployedTeam,
  getMostRecentDeployedTeamId,
} from "./deployedTeamsPersistence";
import type { DeployedTeam } from "@/features/workflows/workflowCanvasSlice";

const KEY = "infra-agent-deployed-teams";

const makeTeam = (id: string, deployedAt: string): DeployedTeam => ({
  id,
  name: `Team ${id}`,
  deployedAt,
  deploymentStatus: "deployed",
});

describe("deployedTeamsPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveDeployedTeams writes to localStorage", () => {
    const teams = [makeTeam("t1", "2026-04-13T00:00:00Z")];
    saveDeployedTeams(teams);
    const stored = localStorage.getItem(KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toHaveLength(1);
  });

  it("loadDeployedTeams reads from localStorage", () => {
    const teams = [makeTeam("t1", "2026-04-13T00:00:00Z")];
    localStorage.setItem(KEY, JSON.stringify(teams));
    const result = loadDeployedTeams();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t1");
  });

  it("loadDeployedTeams returns empty array when nothing stored", () => {
    expect(loadDeployedTeams()).toEqual([]);
  });

  it("loadDeployedTeams returns empty on corrupt data", () => {
    localStorage.setItem(KEY, "not-json{{{");
    expect(loadDeployedTeams()).toEqual([]);
  });

  it("clearDeployedTeams removes the key", () => {
    localStorage.setItem(KEY, "[]");
    clearDeployedTeams();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("addAndPersistDeployedTeam adds and saves", () => {
    const t1 = makeTeam("t1", "2026-04-13T00:00:00Z");
    const result = addAndPersistDeployedTeam(t1);
    expect(result).toHaveLength(1);

    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored).toHaveLength(1);
  });

  it("addAndPersistDeployedTeam replaces existing with same id", () => {
    const t1 = makeTeam("t1", "2026-04-13T00:00:00Z");
    addAndPersistDeployedTeam(t1);

    const t1Updated = makeTeam("t1", "2026-04-14T00:00:00Z");
    const result = addAndPersistDeployedTeam(t1Updated);
    expect(result).toHaveLength(1);
    expect(result[0].deployedAt).toBe("2026-04-14T00:00:00Z");
  });

  it("removeAndPersistDeployedTeam removes by id", () => {
    const t1 = makeTeam("t1", "2026-04-13T00:00:00Z");
    const t2 = makeTeam("t2", "2026-04-13T01:00:00Z");
    addAndPersistDeployedTeam(t1);
    addAndPersistDeployedTeam(t2);

    const result = removeAndPersistDeployedTeam("t1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t2");
  });

  it("getMostRecentDeployedTeamId returns null when empty", () => {
    expect(getMostRecentDeployedTeamId()).toBeNull();
  });

  it("getMostRecentDeployedTeamId returns the latest by deployedAt", () => {
    const t1 = makeTeam("t1", "2026-04-10T00:00:00Z");
    const t2 = makeTeam("t2", "2026-04-13T00:00:00Z");
    const t3 = makeTeam("t3", "2026-04-11T00:00:00Z");
    addAndPersistDeployedTeam(t1);
    addAndPersistDeployedTeam(t2);
    addAndPersistDeployedTeam(t3);

    expect(getMostRecentDeployedTeamId()).toBe("t2");
  });

  it("handles localStorage.setItem throwing (quota exceeded)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveDeployedTeams([makeTeam("t1", "2026-04-13T00:00:00Z")])).not.toThrow();
  });
});
