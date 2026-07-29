export type AgentStatus = "idle" | "running" | "completed" | "error";

export interface AgentKnowledgeBankFile {
  type: "pdf" | "image" | "text" | "json" | "csv" | "other";
  name: string;
  description: string;
}

export interface AgentUserConfig {
  userInstructions?: string;
  knowledgeBank?: AgentKnowledgeBankFile[];
  customSettings?: Record<string, unknown>;
}

export interface AgentSelectedModelClient {
  name?: string;
  model?: string;
}

/** Snapshot of the catalog entry a canvas agent node was created from. */
export interface AgentMeta {
  type?: string;
  label?: string;
  description?: string;
  tagline?: string;
  cost?: string;
  capabilities?: string[];
  strengths?: string[];
  tools?: string[];
  avatar?: string;
}

/**
 * The `data` payload carried by every `@xyflow/react` node of type
 * `"agent"`. This is canvas-local rendering data — constructed by the
 * canvas orchestrator (from `teamCanvas.ts` helpers or the agent catalog)
 * and passed straight into `AgentNode` as node data, never fetched
 * directly by this component.
 */
export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  agentType: string;
  status: AgentStatus;
  description?: string;
  cost?: string;
  capabilities?: string[];
  strengths?: string[];
  tagline?: string;
  tools?: string[];
  userConfig?: AgentUserConfig;
  selectedModelClient?: AgentSelectedModelClient;
  agentMeta?: AgentMeta;
  /** True while this agent is the one currently "traveling" to a device (ghost aura). */
  isLiveAgent?: boolean;
  isActive?: boolean;
  apiConnected?: boolean;
}

export interface AgentNodeProps {
  data: AgentNodeData;
  id?: string;
  onSettingsClick?: (nodeId: string, nodeData: AgentNodeData) => void;
}
