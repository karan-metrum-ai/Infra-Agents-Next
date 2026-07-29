import type { AgentMeta } from "./AgentNode.types";

/**
 * Raw model-client configuration as it comes off a live agent's API config
 * (provider name + nested `config.model`/`config.base_url`) — distinct
 * from `AgentSelectedModelClient` in `AgentNode.types.ts`, which is the
 * already-flattened `{ name, model }` shape the canvas node card renders.
 */
export interface AgentInspectorModelClientRaw {
  provider?: string;
  config?: {
    model?: string;
    base_url?: string;
    baseUrl?: string;
  };
}

/**
 * The agent the Inspector is currently editing. Extends the shared
 * `AgentMeta` (capabilities/strengths/cost/description — already typed for
 * the canvas node) with inspector-only fields: a stable `nodeId` (used to
 * detect a genuinely new agent selection vs. the same agent's props
 * changing) and the raw model-client config used to build `ModelOption`s.
 */
export interface AgentInspectorAgent extends AgentMeta {
  nodeId?: string;
  modelClient?: AgentInspectorModelClientRaw;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  description: string;
}

export type KnowledgeFileUploadStatus =
  | "pending"
  | "uploading"
  | "ingesting"
  | "completed"
  | "error";

export interface AgentInspectorKnowledgeFile {
  id: string;
  name: string;
  size: number;
  extension: string;
  uploadStatus?: KnowledgeFileUploadStatus;
  uploadProgress?: number;
  errorMessage?: string;
}

export interface CronJobConfig {
  interval: string;
  query: string;
}

export interface AgentInspectorPanelProps {
  selectedAgent?: AgentInspectorAgent | null;
  selectedTools?: string[];
  onToolToggle?: (toolType: string) => void;
  onModelSelect?: (config: ModelOption) => void;
  onClose?: () => void;
  userInstructions?: string;
  knowledgeFiles?: AgentInspectorKnowledgeFile[];
  cronJobConfig?: CronJobConfig;
  onUserInstructionsChange?: (instructions: string) => void;
  onFileUpload?: (files: File[]) => void;
  onFileDelete?: (fileId: string) => void;
  onCronJobConfigChange?: (config: CronJobConfig) => void;
  onPanelRef?: (element: HTMLDivElement | null) => void;
}
