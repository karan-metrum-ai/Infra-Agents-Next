import type { Node } from "@xyflow/react";
import type { AvailableAgentsResponse } from "@/features/teams/teamsApi.types";
import { extractAgentTools, resolveAgentDisplay } from "./resolveAgentDisplay";
import type { WorkflowAgentNodeData } from "./WorkflowDesigner.types";

/** Structural shape shared by `Team.orchestrator`/`.specialists[x]`
 * (`GET /teams/{id}`) and `RecommendedTeamComposition.orchestrator`/
 * `.specialists[x]` (`GET /teams/recommended`) — the only fields this
 * builder actually reads from either. */
export interface TeamCompositionAgentLike {
  agent_name: string;
  tools?: string | string[];
  environment_variables?: Record<string, unknown>;
}

export interface TeamCompositionLike {
  orchestrator?: TeamCompositionAgentLike;
  specialists?: Record<string, TeamCompositionAgentLike>;
}

const KNOWLEDGE_MANAGEMENT_NAMES = new Set(["knowledge-management", "knowledge_management"]);

/**
 * Builds canvas `agent` nodes from a saved or recommended team's
 * `team_composition` (orchestrator + specialists). Node positions are left
 * at the origin — `syncTeamCanvas` (via `teamCanvas.ts`'s `buildTeamCanvas`)
 * always recomputes the real OM/specialist/placeholder layout from scratch
 * on every call, so any position this builder assigned would be immediately
 * overwritten. This mirrors (and replaces) the Vite source's
 * `generateAdvancedTopologyPosition` and the inline specialist-spacing math
 * duplicated across `loadRecommendedTeamOnCanvas`/`handleLoadTeam` — both of
 * which computed positions that `syncTeamCanvas`'s own call at the end of
 * each function immediately discarded anyway.
 *
 * Consolidates what the Vite source implemented as two ~150-line
 * near-duplicate blocks (one per flow) into one shared function.
 */
export function buildTeamNodesFromComposition(
  composition: TeamCompositionLike,
  agentsResponse: AvailableAgentsResponse | undefined,
): Node<WorkflowAgentNodeData>[] {
  const participants: Array<{ agentName: string; tools: string[]; isOrchestrator: boolean }> = [];

  if (composition.orchestrator) {
    participants.push({
      agentName: composition.orchestrator.agent_name,
      tools: extractAgentTools(composition.orchestrator),
      isOrchestrator: true,
    });
  }

  Object.values(composition.specialists ?? {}).forEach((specialist) => {
    if (KNOWLEDGE_MANAGEMENT_NAMES.has(specialist.agent_name)) return;
    participants.push({
      agentName: specialist.agent_name,
      tools: extractAgentTools(specialist),
      isOrchestrator: false,
    });
  });

  const nodes: Node<WorkflowAgentNodeData>[] = [];

  participants.forEach((participant, index) => {
    const display = resolveAgentDisplay(agentsResponse, participant.agentName);
    if (!display) return;

    nodes.push({
      id: `agent-${participant.agentName}-${index}`,
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        label: display.label,
        agentType: display.agentType,
        status: "idle",
        description: display.description,
        tagline: display.tagline,
        cost: display.cost,
        capabilities: display.capabilities,
        strengths: display.strengths,
        tools: participant.tools,
        agentMeta: {
          type: display.agentType,
          label: display.label,
          description: display.description,
          tagline: display.tagline,
          cost: display.cost,
          capabilities: display.capabilities,
          strengths: display.strengths,
          tools: participant.tools,
        },
        teamApiConfig: { name: participant.agentName },
      },
    });
  });

  return nodes;
}
