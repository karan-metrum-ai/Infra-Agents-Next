import type { AvailableAgentsResponse } from "@/features/teams/teamsApi.types";

export interface AgentDisplayInfo {
  /** This canvas's UI agent type (e.g. `"hardware-operations"`). */
  agentType: string;
  label: string;
  description: string;
  tagline: string;
  cost: string;
  capabilities: string[];
  strengths: string[];
}

/**
 * Maps a backend registered-agent `agent_name` (e.g. `"systems-admin-agent-hw"`,
 * `"vastai-agent"`) or an older category/provider key (e.g. `"hardware"`,
 * `"coordinator"`) to this canvas's UI agent type. Consolidates what the Vite
 * source (`WorkflowDesigner.tsx`) duplicated three times nearly verbatim
 * across `getFullAgentData`'s `typeMapping`, `loadRecommendedTeamOnCanvas`'s
 * `providerMapping`, and `handleLoadTeam`'s (larger) `providerMapping` into
 * one canonical table.
 */
const AGENT_NAME_TO_UI_TYPE: Record<string, string> = {
  // Category/provider keys
  coordinator: "operations-manager",
  monitoring: "level1-support",
  hardware: "hardware-operations",
  operating_system: "operating-system-management",
  network: "wlan-network-specialist",
  machine_setup: "neoforge-gpu-agent",
  ai_workload: "metrumai-insights-agent",
  database: "database-agent",
  reporting: "report-generator",
  virtualization: "virtualization-agent",
  // Backend registered agent_name keys
  "operations-manager": "operations-manager",
  "level1-support": "level1-support",
  "systems-admin-hw": "hardware-operations",
  "systems-admin-os": "operating-system-management",
  "systems-admin-agent-hw": "hardware-operations",
  "systems-admin-agent-os": "operating-system-management",
  "wlan-network-agent": "wlan-network-specialist",
  "vastai-agent": "neoforge-gpu-agent",
  "metrumai-insights-agent": "metrumai-insights-agent",
  "database-agent": "database-agent",
  "report-generator": "report-generator",
  "virtualization-agent": "virtualization-agent",
  "hardware-operations": "hardware-operations",
  "operating-system-management": "operating-system-management",
  "knowledge-management": "knowledge-management",
  "wlan-network-specialist": "wlan-network-specialist",
  "neoforge-gpu-agent": "neoforge-gpu-agent",
  // Legacy underscore variants
  operations_manager: "operations-manager",
  level1_support: "level1-support",
  hardware_operations: "hardware-operations",
  operating_system_operations: "operating-system-management",
  knowledge_management: "knowledge-management",
  wlan_network_specialist: "wlan-network-specialist",
  neoforge_gpu_agent: "neoforge-gpu-agent",
  metrumai_insights_agent: "metrumai-insights-agent",
  database_agent: "database-agent",
  report_generator: "report-generator",
};

/** Static display fallback, keyed by UI agent type — used when the live
 * agent catalog (`GET /agents`) doesn't have a matching entry (offline
 * catalog, agent since deregistered, etc). */
const FALLBACK_CATALOG: Record<string, AgentDisplayInfo> = {
  "operations-manager": {
    agentType: "operations-manager",
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
  },
  "level1-support": {
    agentType: "level1-support",
    label: "Level 1 Support",
    description: "Eyes on logs, KPIs, alerts, and anomalies 24/7.",
    tagline: "Real-time health and alerts",
    cost: "1.8$/h",
    capabilities: ["Log analysis", "Monitoring", "Trend detection"],
    strengths: ["Vigilant", "Lower MTTD", "Proactive hints"],
  },
  "hardware-operations": {
    agentType: "hardware-operations",
    label: "Hardware Operations",
    description: "Diagnostics, firmware, and power operations.",
    tagline: "System Administrator Level 2 support",
    cost: "2.8$/h",
    capabilities: ["Health checks", "FW mgmt", "Diagnostics"],
    strengths: ["Failure prevention", "Lifecycle", "Uptime"],
  },
  "operating-system-management": {
    agentType: "operating-system-management",
    label: "OS Operations",
    description: "OS deploy, patch management, license tracking.",
    tagline: "System Administrator Level 2 support",
    cost: "2.6$/h",
    capabilities: ["Deploy", "Patch", "License"],
    strengths: ["Security", "Compliance", "Standardization"],
  },
  "wlan-network-specialist": {
    agentType: "wlan-network-specialist",
    label: "WLAN Network Specialist",
    description: "Manages WLAN infrastructure, performance tuning, and connectivity.",
    tagline: "Wireless network optimization expert",
    cost: "2.4$/h",
    capabilities: ["AP configuration", "Signal optimization", "Roaming analysis"],
    strengths: ["Coverage planning", "Interference mitigation", "Throughput optimization"],
  },
  "neoforge-gpu-agent": {
    agentType: "neoforge-gpu-agent",
    label: "NeoCloud Provisioning Agent",
    description: "Configures, optimizes, and onboards GPU clusters to decentralized clouds.",
    tagline: "Decentralized GPU cloud orchestrator",
    cost: "3.5$/h",
    capabilities: [
      "GPU cluster configuration",
      "Cloud onboarding automation",
      "Performance optimization",
    ],
    strengths: ["Vast.ai integration", "Multi-cloud orchestration", "Cost efficiency"],
  },
  "metrumai-insights-agent": {
    agentType: "metrumai-insights-agent",
    label: "MetrumAI Insights Agent",
    description:
      "Analyzes data, provides insights, creates projects, and generates AI-powered reports.",
    tagline: "AI-powered infrastructure analytics",
    cost: "2.9$/h",
    capabilities: ["Hardware catalog analysis", "Workload optimization", "AI-powered insights"],
    strengths: ["Predictive analytics", "Report generation", "RAG-powered search"],
  },
  "database-agent": {
    agentType: "database-agent",
    label: "Database Agent",
    description: "PostgreSQL remediation for connection pool exhaustion and deadlock resolution.",
    tagline: "Database remediation specialist",
    cost: "2.5$/h",
    capabilities: [
      "Connection pool management",
      "Deadlock resolution",
      "Blocking session management",
    ],
    strengths: ["Database health", "Performance optimization", "ServiceNow integration"],
  },
  "report-generator": {
    agentType: "report-generator",
    label: "Report Generator Agent",
    description: "Generates branded PDF infrastructure reports with cluster health and analytics.",
    tagline: "Automated infrastructure reporting",
    cost: "2.3$/h",
    capabilities: ["PDF report generation", "Metrics aggregation", "Data visualization"],
    strengths: ["Automated reporting", "ServiceNow analytics", "Performance tracking"],
  },
  "virtualization-agent": {
    agentType: "virtualization-agent",
    label: "Virtualization Agent",
    description: "Manages virtual machines, hypervisors, and container platforms.",
    tagline: "Virtualization and workload isolation",
    cost: "2.4$/h",
    capabilities: ["VM lifecycle management", "Hypervisor configuration", "Resource allocation"],
    strengths: ["Isolation", "Resource efficiency", "Multi-tenant support"],
  },
};

const GENERIC_CAPABILITIES = [
  "Infrastructure management",
  "Automated operations",
  "System monitoring",
];
const GENERIC_STRENGTHS = ["Reliable", "Efficient", "Automated"];

/**
 * Resolves a raw backend agent identifier (registered `agent_name` or an
 * older category key) into full display metadata for the canvas — label,
 * description, tagline, cost, capabilities, strengths. Prefers a live match
 * from the registered-agent catalog (`GET /agents`, already fetched via
 * `useListAgentsQuery` elsewhere and shared through RTK Query's cache);
 * falls back to the static catalog above when no live entry matches (agent
 * catalog offline, or the agent has since been deregistered).
 */
export function resolveAgentDisplay(
  agentsResponse: AvailableAgentsResponse | undefined,
  rawAgentName: string,
): AgentDisplayInfo | null {
  const uiType = AGENT_NAME_TO_UI_TYPE[rawAgentName] ?? rawAgentName;

  const liveAgent = agentsResponse?.agents.find((agent) => {
    const mappedType = AGENT_NAME_TO_UI_TYPE[agent.agent_type] ?? agent.agent_type;
    return agent.name === rawAgentName || mappedType === uiType;
  });

  if (liveAgent) {
    const capabilities = liveAgent.capabilities ? Object.keys(liveAgent.capabilities) : [];
    const description = liveAgent.description || "Infrastructure management agent";
    return {
      agentType: uiType,
      label: liveAgent.display_name,
      description,
      tagline: description,
      cost: "2.5$/h",
      capabilities: capabilities.length > 0 ? capabilities : GENERIC_CAPABILITIES,
      strengths: GENERIC_STRENGTHS,
    };
  }

  return FALLBACK_CATALOG[uiType] ?? null;
}

/** Extracts a tool-name array from a team-composition agent entry. Tools may
 * arrive as a comma-separated string in `environment_variables.TOOLS` /
 * `.MCP_ALLOWED_TOOLS`, or already as a string/string[] on the entry itself
 * (the shape `GET /teams/recommended` uses). */
export function extractAgentTools(agent: {
  tools?: string | string[];
  environment_variables?: Record<string, unknown>;
}): string[] {
  const envTools =
    agent.environment_variables?.TOOLS ?? agent.environment_variables?.MCP_ALLOWED_TOOLS;
  const raw = envTools ?? agent.tools;

  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((tool) => tool.trim())
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw
      .flatMap((tool) =>
        typeof tool === "string" && tool.includes(",")
          ? tool.split(",").map((t) => t.trim())
          : [tool],
      )
      .filter((tool): tool is string => typeof tool === "string" && tool.length > 0);
  }

  return [];
}
