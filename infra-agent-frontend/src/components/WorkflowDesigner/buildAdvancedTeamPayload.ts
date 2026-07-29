import type { Node } from "@xyflow/react";
import type {
  AdvancedDatabaseTeamCreate,
  AdvancedTeamCompositionAgent,
  RecommendedTeamCompositionAgent,
  RecommendedTeamResponse,
} from "@/features/teams/teamsApi.types";
import type { AgentNodeData, AgentSelectedModelClient } from "./AgentNode.types";

/**
 * Canvas agent-type → backend agent-name mapping and default env vars,
 * ported from the Vite app's `utils/jsonGenerator.ts` (`generateAdvancedTeamPayload`,
 * 1568 LOC total in that file — most of it unrelated JSON-generation/
 * localStorage/debugging helpers that `SaveTeamModal` doesn't need). Only
 * the slice this modal actually calls is ported here, scoped to this
 * component rather than pulled into `src/utils/` — the full file lands in
 * Phase 11 when the rest of its consumers (bulk upload, team export) do.
 */
const UI_TO_BACKEND_AGENT_NAME: Record<string, string> = {
  "operations-manager": "operations-manager",
  "level1-support": "level1-support",
  "hardware-operations": "systems-admin-agent-hw",
  "operating-system-management": "systems-admin-agent-os",
  "knowledge-management": "knowledge-management",
  "systems-admin": "systems-admin",
  "wlan-network-specialist": "wlan-network-agent",
  "neoforge-gpu-agent": "vastai-agent",
  "metrumai-insights-agent": "metrumai-insights-agent",
  "database-agent": "database-agent",
  "report-generator": "report-generator",
  "virtualization-agent": "virtualization-agent",
};

const DEFAULT_MODEL = "Qwen/Qwen3-30B-A3B-Thinking-2507";
const DEFAULT_API_KEY = "sk-not-needed";

function getDefaultEnvVars(agentName: string): Record<string, string> {
  const base: Record<string, string> = {
    LOG_LEVEL: "INFO",
    UVICORN_WORKERS: "1",
    LLM_TIMEOUT: "60",
  };

  if (agentName === "operations-manager") {
    return { ...base, TEAM_ID: "1", TEAM_NAME: "generated-team" };
  }

  return { ...base, USE_MCP_TOOLS: "true" };
}

function toToolsString(tools: string[] | undefined): string | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.join(",");
}

function buildAgent(
  node: Node<AgentNodeData>,
  teamName: string,
  selectedTools: Record<string, string[]>,
  selectedModelClients: Record<string, AgentSelectedModelClient | undefined>,
  isOrchestrator: boolean,
): AdvancedTeamCompositionAgent {
  const agentType = node.data.agentType;
  const backendAgentName = UI_TO_BACKEND_AGENT_NAME[agentType] ?? agentType;
  const nodeTools = selectedTools[node.id] ?? node.data.tools ?? [];
  const modelClient = selectedModelClients[node.id];

  return {
    agent_name: backendAgentName,
    replicas: 1,
    base_url: null,
    model: modelClient?.model ?? DEFAULT_MODEL,
    api_key: DEFAULT_API_KEY,
    tools: toToolsString(nodeTools),
    environment_variables: {
      ...getDefaultEnvVars(backendAgentName),
      ...(isOrchestrator
        ? { TEAM_NAME: teamName.toLowerCase().replace(/\s+/g, "-") }
        : { ADVERTISED_HOST: backendAgentName }),
    },
  };
}

/**
 * Builds the `POST /teams/advanced` payload from the canvas's current
 * agent nodes. Mirrors the Vite app's `generateAdvancedTeamPayload`
 * (edges aren't used — the backend derives topology from
 * orchestrator/specialists role, not the canvas's visual connections).
 */
export function buildAdvancedTeamPayload(
  nodes: Node<AgentNodeData>[],
  teamName: string,
  clusterId: string,
  description: string | undefined,
  selectedTools: Record<string, string[]>,
  selectedModelClients: Record<string, AgentSelectedModelClient | undefined>,
): AdvancedDatabaseTeamCreate {
  const agentNodes = nodes.filter((node) => node.type === "agent");

  if (agentNodes.length === 0) {
    throw new Error("No agents found on canvas. Please add agents to generate team configuration.");
  }

  const orchestratorNode = agentNodes.find(
    (node) =>
      node.data.agentType === "operations-manager" || node.data.agentType === "orchestrator",
  );
  const specialistNodes = agentNodes.filter(
    (node) =>
      node.data.agentType !== "operations-manager" && node.data.agentType !== "orchestrator",
  );

  const orchestrator = orchestratorNode
    ? buildAgent(orchestratorNode, teamName, selectedTools, selectedModelClients, true)
    : {
        agent_name: "operations-manager",
        replicas: 1,
        base_url: null,
        model: DEFAULT_MODEL,
        api_key: DEFAULT_API_KEY,
        environment_variables: {
          ...getDefaultEnvVars("operations-manager"),
          TEAM_NAME: teamName.toLowerCase().replace(/\s+/g, "-"),
        },
      };

  const specialists: Record<string, AdvancedTeamCompositionAgent> = {};
  specialistNodes.forEach((node) => {
    const agent = buildAgent(node, teamName, selectedTools, selectedModelClients, false);
    specialists[agent.agent_name] = agent;
  });

  const teamDescription =
    description ||
    `Team with ${agentNodes.length} agents: ${agentNodes.map((n) => n.data.label).join(", ")}`;

  return {
    name: teamName,
    description: teamDescription,
    cluster_id: clusterId,
    team_composition: { orchestrator, specialists },
    auto_deploy: false,
  };
}

function normalizeRecommendedAgent(
  agent: RecommendedTeamCompositionAgent,
): AdvancedTeamCompositionAgent {
  const rawTools = agent.tools;
  const tools = Array.isArray(rawTools) ? rawTools.join(",") : rawTools;
  const envVars = agent.environment_variables ?? {};
  const environmentVariables: Record<string, string> = {};
  Object.entries(envVars).forEach(([key, value]) => {
    environmentVariables[key] = String(value);
  });

  return {
    agent_name: agent.agent_name,
    replicas: agent.replicas ?? 1,
    base_url: agent.base_url ?? null,
    model: agent.model,
    api_key: agent.api_key,
    tools,
    environment_variables: environmentVariables,
  };
}

/**
 * Normalizes the recommend-team flow's pre-built payload (looser optional
 * types, since it comes straight off the backend's "recommended" endpoint)
 * into the strict `AdvancedDatabaseTeamCreate` shape `POST /teams/advanced`
 * expects, applying the user's final name/cluster/description choice from
 * the save dialog.
 */
export function normalizeRecommendedTeamPayload(
  recommended: RecommendedTeamResponse,
  teamName: string,
  clusterId: string,
  description: string | undefined,
): AdvancedDatabaseTeamCreate {
  const specialists: Record<string, AdvancedTeamCompositionAgent> = {};
  Object.entries(recommended.team_composition.specialists).forEach(([key, agent]) => {
    specialists[key] = normalizeRecommendedAgent(agent);
  });

  return {
    name: teamName,
    description: description || recommended.description || undefined,
    cluster_id: clusterId,
    team_composition: {
      orchestrator: recommended.team_composition.orchestrator
        ? normalizeRecommendedAgent(recommended.team_composition.orchestrator)
        : undefined,
      specialists,
    },
    base_url: recommended.base_url,
    model: recommended.model,
    api_key: recommended.api_key,
    tools: recommended.tools,
    auto_deploy: recommended.auto_deploy ?? false,
  };
}
