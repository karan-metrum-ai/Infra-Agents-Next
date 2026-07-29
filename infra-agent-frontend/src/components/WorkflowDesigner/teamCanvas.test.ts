import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import {
  buildTeamCanvas,
  DEFAULT_OM_NODE_ID,
  filterPersistedAgentNodes,
  filterPersistedEdges,
  isOperationsManagerNode,
  normalizeTeamAgents,
  PLACEHOLDER_NODE_ID,
} from "./teamCanvas";

const viewport = { width: 1200, height: 800 };

const makeAgent = (id: string, agentType: string, label: string): Node => ({
  id,
  type: "agent",
  position: { x: 0, y: 0 },
  data: {
    label,
    agentType,
    status: "idle",
    description: `${label} description`,
  },
});

describe("teamCanvas", () => {
  it("builds default canvas with OM and placeholder", () => {
    const om = makeAgent(DEFAULT_OM_NODE_ID, "operations-manager", "Operations Manager");
    const { nodes, edges } = buildTeamCanvas([om], viewport);

    expect(nodes).toHaveLength(2);
    expect(nodes.some((node) => node.id === PLACEHOLDER_NODE_ID)).toBe(true);
    expect(filterPersistedAgentNodes(nodes)).toHaveLength(1);
    expect(edges.some((edge) => edge.target === PLACEHOLDER_NODE_ID)).toBe(true);
  });

  it("lays out specialists and keeps trailing placeholder", () => {
    const om = makeAgent(DEFAULT_OM_NODE_ID, "operations-manager", "Operations Manager");
    const specialist = makeAgent("level1-support-1", "level1-support", "Level 1 Support");

    const { nodes, edges } = buildTeamCanvas([om, specialist], viewport);
    const placeholder = nodes.find((node) => node.id === PLACEHOLDER_NODE_ID);

    expect(filterPersistedAgentNodes(nodes)).toHaveLength(2);
    expect(placeholder).toBeDefined();
    expect(edges).toHaveLength(2);
    expect(edges.some((edge) => edge.target === specialist.id)).toBe(true);
  });

  it("creates OM when missing and attaches orphan agents", () => {
    const orphans = [
      makeAgent("agent-a", "level1-support", "Level 1 Support"),
      makeAgent("agent-b", "hardware-operations", "Hardware Operations"),
      makeAgent("agent-c", "database-agent", "Database Agent"),
    ];

    const normalized = normalizeTeamAgents(orphans);
    expect(normalized).toHaveLength(4);
    expect(isOperationsManagerNode(normalized[0])).toBe(true);
  });

  it("demotes duplicate Operations Manager nodes to specialists", () => {
    const agents = [
      makeAgent("om-1", "operations-manager", "Operations Manager"),
      makeAgent("om-2", "operations-manager", "Operations Manager Copy"),
      makeAgent("l1", "level1-support", "Level 1 Support"),
    ];

    const normalized = normalizeTeamAgents(agents);
    const omCount = normalized.filter(isOperationsManagerNode).length;
    expect(omCount).toBe(1);
    expect(normalized).toHaveLength(3);
  });

  it("filters placeholder nodes and edges from persistence", () => {
    const om = makeAgent(DEFAULT_OM_NODE_ID, "operations-manager", "Operations Manager");
    const { nodes, edges } = buildTeamCanvas([om], viewport);

    const persistedNodes = filterPersistedAgentNodes(nodes);
    const persistedEdges = filterPersistedEdges(edges);

    expect(persistedNodes.every((node) => node.type !== "placeholder")).toBe(true);
    expect(persistedEdges.every((edge) => edge.target !== PLACEHOLDER_NODE_ID)).toBe(true);
  });
});
