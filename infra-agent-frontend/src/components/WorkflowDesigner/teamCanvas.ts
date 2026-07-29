import { MarkerType, type Edge, type Node } from "@xyflow/react";

/**
 * Pure layout/graph-shaping logic for the Workflow Designer canvas.
 *
 * No React, no RTK Query, no side effects — this module only computes
 * `@xyflow/react` `Node`/`Edge` arrays from a list of persisted agent
 * nodes. The owning canvas component (a later Phase 7 piece) is
 * responsible for feeding this the current agent nodes and applying the
 * result via `useNodesState`/`useEdgesState`.
 */

export const PLACEHOLDER_NODE_ID = "team-add-placeholder";
export const DEFAULT_OM_NODE_ID = "operations-manager-default";
export const AGENT_NODE_WIDTH = 320;
export const AGENT_NODE_HEIGHT = 300;
export const PLACEHOLDER_NODE_WIDTH = AGENT_NODE_WIDTH;
export const PLACEHOLDER_NODE_HEIGHT = AGENT_NODE_HEIGHT;

export interface ViewportSize {
  width: number;
  height: number;
}

export interface TeamHierarchyNode {
  id: string;
  node: Node;
  children: TeamHierarchyNode[];
}

export interface BuildTeamCanvasOptions {
  isDropTarget?: boolean;
  placeholderData?: Record<string, unknown>;
}

/** Returns true when the node is a UI-only placeholder slot. */
export const isPlaceholderNode = (node: Node): boolean => {
  return node.type === "placeholder" || node.id === PLACEHOLDER_NODE_ID;
};

/** Returns true when the node is the Operations Manager orchestrator. */
export const isOperationsManagerNode = (node: Node): boolean => {
  if (node.type !== "agent") {
    return false;
  }

  const label = String(node.data.label ?? "").toLowerCase();
  if (label.includes("liquid cooling")) {
    return false;
  }

  return (
    node.data.agentType === "operations-manager" ||
    node.data.agentType === "orchestrator" ||
    label.includes("operations manager")
  );
};

/** Returns true for agent nodes that should be persisted. */
export const isPersistedAgentNode = (node: Node): boolean => {
  return node.type === "agent" && !isPlaceholderNode(node);
};

/** Strips placeholder nodes from a node list. */
export const filterPersistedAgentNodes = (nodes: Node[]): Node[] => {
  return nodes.filter(isPersistedAgentNode);
};

/** Strips UI-only placeholder edges from an edge list. */
export const filterPersistedEdges = (edges: Edge[]): Edge[] => {
  return edges.filter(
    (edge) => !edge.id.includes("placeholder") && edge.target !== PLACEHOLDER_NODE_ID,
  );
};

/** Creates a default Operations Manager node for an empty canvas. */
export const createDefaultOperationsManagerNode = (viewport: ViewportSize): Node => {
  const agentData = {
    type: "operations-manager",
    label: "Operations Manager",
    description: "Coordinates specialized agents and orchestrates workflows.",
    tagline: "Mission control for your infra",
    cost: "2.5$/h",
    capabilities: [
      "Cross-team orchestration",
      "Incident escalation",
      "Task dependencies",
      "Progress tracking",
    ],
    strengths: ["Synchronization", "Low downtime", "Force multiplier"],
    tools: [] as string[],
  };

  return {
    id: DEFAULT_OM_NODE_ID,
    type: "agent",
    position: {
      x: viewport.width / 2 - AGENT_NODE_WIDTH / 2,
      y: viewport.height * 0.15,
    },
    data: {
      label: agentData.label,
      agentType: agentData.type,
      description: agentData.description,
      tagline: agentData.tagline,
      cost: agentData.cost,
      capabilities: agentData.capabilities,
      strengths: agentData.strengths,
      tools: agentData.tools,
      status: "idle",
      agentMeta: { ...agentData },
    },
  };
};

/** Converts a duplicate orchestrator node into a specialist agent. */
const demoteOperationsManagerNode = (node: Node): Node => {
  const label = String(node.data.label ?? "Agent");
  return {
    ...node,
    data: {
      ...node.data,
      agentType: "level1-support",
      label: label.replace(/operations manager/i, "Team Agent"),
    },
  };
};

/**
 * Ensures exactly one Operations Manager exists and all agents are attached.
 *
 * Extra OM nodes are demoted to specialists. Orphan agents are kept.
 */
export const normalizeTeamAgents = (agentNodes: Node[], createDefaultOm?: () => Node): Node[] => {
  const agents = agentNodes.filter(isPersistedAgentNode);
  const omNodes = agents.filter(isOperationsManagerNode);
  const nonOmAgents = agents.filter((node) => !isOperationsManagerNode(node));

  if (omNodes.length > 0) {
    const primaryOm = omNodes[0];
    const demotedOms = omNodes.slice(1).map(demoteOperationsManagerNode);
    return [primaryOm, ...nonOmAgents, ...demotedOms];
  }

  const factory =
    createDefaultOm ??
    (() =>
      createDefaultOperationsManagerNode({
        width: 1200,
        height: 800,
      }));
  return [factory(), ...nonOmAgents];
};

/** Builds a hierarchy tree from normalized agent nodes. */
export const buildTeamHierarchy = (normalizedAgents: Node[]): TeamHierarchyNode => {
  const omNode = normalizedAgents.find(isOperationsManagerNode);
  if (!omNode) {
    throw new Error("Team hierarchy requires an Operations Manager node.");
  }

  const children = normalizedAgents.filter((node) => !isOperationsManagerNode(node));

  return {
    id: omNode.id,
    node: omNode,
    children: children.map((child) => ({
      id: child.id,
      node: child,
      children: [],
    })),
  };
};

/**
 * Computes automatic layout positions for OM, specialists, and placeholder.
 */
export const computeTeamLayout = (
  hierarchy: TeamHierarchyNode,
  viewport: ViewportSize,
): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const centerX = viewport.width / 2;
  const omY = viewport.height * 0.15;
  const childrenY = viewport.height * 0.55;

  positions.set(hierarchy.id, {
    x: centerX - AGENT_NODE_WIDTH / 2,
    y: omY,
  });

  const childCount = hierarchy.children.length;
  const slotCount = childCount + 1;
  const availableWidth = viewport.width * 0.85;
  const spacing = Math.min(380, availableWidth / Math.max(slotCount, 1));
  const totalWidth = (slotCount - 1) * spacing;
  const startX = centerX - totalWidth / 2 - AGENT_NODE_WIDTH / 2;

  hierarchy.children.forEach((child, index) => {
    positions.set(child.id, {
      x: startX + index * spacing,
      y: childrenY,
    });
  });

  positions.set(PLACEHOLDER_NODE_ID, {
    x: startX + childCount * spacing,
    y: childrenY,
  });

  return positions;
};

/** Creates the UI-only placeholder node. */
export const createPlaceholderNode = (
  position: { x: number; y: number },
  data: Record<string, unknown> = {},
): Node => ({
  id: PLACEHOLDER_NODE_ID,
  type: "placeholder",
  position,
  width: PLACEHOLDER_NODE_WIDTH,
  height: PLACEHOLDER_NODE_HEIGHT,
  draggable: false,
  selectable: true,
  data: {
    label: "Add Agent",
    isDropTarget: false,
    ...data,
  },
});

/** Derives hierarchy edges including an optional placeholder edge. */
export const deriveTeamEdges = (
  hierarchy: TeamHierarchyNode,
  includePlaceholderEdge = true,
): Edge[] => {
  const edges: Edge[] = [];
  const omId = hierarchy.id;

  hierarchy.children.forEach((child, index) => {
    edges.push({
      id: `edge-${omId}-${child.id}`,
      source: omId,
      target: child.id,
      sourceHandle: "output",
      targetHandle: "input",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: "var(--primary)", strokeWidth: 2 },
      className: "react-flow__edge-interaction",
      label: `Specialist ${index + 1}`,
    });
  });

  if (includePlaceholderEdge) {
    edges.push({
      id: `edge-${omId}-placeholder`,
      source: omId,
      target: PLACEHOLDER_NODE_ID,
      sourceHandle: "output",
      targetHandle: "input",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed },
      style: {
        stroke: "var(--border)",
        strokeWidth: 1.5,
        strokeDasharray: "6 4",
      },
      className: "react-flow__edge-placeholder",
    });
  }

  return edges;
};

/**
 * Builds the full React Flow display state from persisted agent nodes.
 */
export const buildTeamCanvas = (
  agentNodes: Node[],
  viewport: ViewportSize,
  options: BuildTeamCanvasOptions = {},
  createDefaultOm?: () => Node,
): { nodes: Node[]; edges: Edge[] } => {
  const normalized = normalizeTeamAgents(agentNodes, createDefaultOm);
  const hierarchy = buildTeamHierarchy(normalized);
  const positions = computeTeamLayout(hierarchy, viewport);

  const displayAgents = normalized.map((agent) => {
    const position = positions.get(agent.id);
    return {
      ...agent,
      position: position ?? agent.position,
      draggable: false,
    };
  });

  const placeholderPosition = positions.get(PLACEHOLDER_NODE_ID);
  if (!placeholderPosition) {
    throw new Error("Computed layout is missing a placeholder position.");
  }
  const placeholder = createPlaceholderNode(placeholderPosition, {
    isDropTarget: options.isDropTarget ?? false,
    ...options.placeholderData,
  });

  const edges = deriveTeamEdges(hierarchy, true);

  return {
    nodes: [...displayAgents, placeholder],
    edges,
  };
};

/** Returns true when a flow coordinate is inside the placeholder bounds. */
export const isPointInPlaceholder = (
  flowPosition: { x: number; y: number },
  placeholderPosition: { x: number; y: number },
  width = PLACEHOLDER_NODE_WIDTH,
  height = PLACEHOLDER_NODE_HEIGHT,
): boolean => {
  return (
    flowPosition.x >= placeholderPosition.x &&
    flowPosition.x <= placeholderPosition.x + width &&
    flowPosition.y >= placeholderPosition.y &&
    flowPosition.y <= placeholderPosition.y + height
  );
};
