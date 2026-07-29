import type { Edge, Node } from "@xyflow/react";
import type { RecommendedTeamResponse } from "@/features/teams/teamsApi.types";
import type { AgentNodeData, AgentSelectedModelClient } from "./AgentNode.types";

export interface SaveTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamSaved: (teamId: string, clusterId: string, teamName: string) => void;
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
  teamName: string;
  selectedTools?: Record<string, string[]>;
  selectedModelClients?: Record<string, AgentSelectedModelClient | undefined>;
  /** Pre-built payload from the recommend-team flow, saved as-is with an updated name/cluster. */
  recommendedTeamPayload?: RecommendedTeamResponse | null;
}
