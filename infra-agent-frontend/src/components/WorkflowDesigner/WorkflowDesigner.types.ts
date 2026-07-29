import type { Node } from "@xyflow/react";
import type {
  AgentInspectorAgent,
  AgentInspectorModelClientRaw,
} from "./AgentInspectorPanel.types";
import type { AgentNodeData } from "./AgentNode.types";

/**
 * Canvas agent-node `data`, extended with the raw API fields the Inspector
 * needs but `AgentNodeData` doesn't type explicitly. These extra keys are
 * already structurally permitted on `AgentNodeData` (it extends
 * `Record<string, unknown>`) — this interface just gives the orchestrator's
 * own hooks a type-safe, explicit read/write contract for them instead of
 * reading through an `unknown` index signature.
 */
export interface WorkflowAgentNodeData extends AgentNodeData {
  /** Raw model-client config, present only for agents loaded from a saved/recommended backend team. */
  modelClient?: AgentInspectorModelClientRaw;
  /** Backend registration name, used to target knowledge-file uploads at the right agent. */
  teamApiConfig?: { name?: string };
}

export type WorkflowAgentNode = Node<WorkflowAgentNodeData>;

/**
 * Minimal shape needed to add a node to the canvas — a structural subset of
 * `AgentsPanel.types.ts`'s `AgentCatalogEntry` (the catalog drag/click
 * payload), so one `addAgentToTeam` signature can serve both the drag-drop
 * path and the catalog click-to-add path without depending on that panel's
 * icon-carrying type.
 */
export interface WorkflowAgentDraft {
  type: string;
  label: string;
  description?: string;
  tagline?: string;
  cost?: string;
  capabilities?: string[];
  strengths?: string[];
  tools?: string[];
}

/** The agent currently open in the Agent Inspector side panel. Extends
 * `AgentInspectorAgent` (the panel's own prop type) with the backend
 * registration name needed to target knowledge-file uploads — an extra,
 * structurally-compatible field the panel itself never reads. */
export type SelectedWorkflowAgent = AgentInspectorAgent & {
  teamApiConfig?: { name?: string };
};
