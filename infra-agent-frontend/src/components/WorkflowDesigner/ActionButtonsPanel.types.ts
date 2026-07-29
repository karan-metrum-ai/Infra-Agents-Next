import type { Edge, Node } from "@xyflow/react";
import type { AgentNodeData } from "./AgentNode.types";

/** Fired once `deployTeam` succeeds, so a later orchestrator can persist the
 * canvas snapshot + deployment record wherever Phase 11's deployed-teams
 * feature ends up living — this panel doesn't own that store slice. */
export interface TeamDeployedInfo {
  teamId: string;
  teamName: string;
  clusterId: string;
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
}

export interface ActionButtonsPanelProps {
  onRecommendTeam: () => void;
  onTestPlayground: () => void;
  onSandboxEval?: () => void;
  onDeploySavedTeam?: () => void;
  onSaveTeam?: () => void;
  onTeamCreated?: (teamId: string) => void;
  onTeamDeployed?: (info: TeamDeployedInfo) => void;
  currentTeamId?: string | null;
  currentClusterId?: string | null;
  isExecuting?: boolean;
  canExecute?: boolean;
  nodes?: Node<AgentNodeData>[];
  edges?: Edge[];
  teamName?: string;
}
