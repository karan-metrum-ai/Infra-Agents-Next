/** Resolve agent portrait URLs from known public/agents assets. */

const AGENT_AVATAR_BY_NAME: Record<string, string> = {
  operations_manager: "/agents/operations-manager.webp",
  operations_manager_mop: "/agents/operations-manager.webp",
  level1_support: "/agents/level-1-support.webp",
  systems_admin_hw: "/agents/systems-admin-agent-hw.webp",
  systems_admin_os: "/agents/systems-admin-agent-os.webp",
  storage_operation: "/agents/Storage Operation Agent.webp",
  report_generator: "/agents/report-generator-agent.webp",
  database_agent: "/agents/database-agent.webp",
  liquid_cooling: "/agents/Liquid Cooling Agent.webp",
  virtualization: "/agents/Virtualization_Agent.webp",
  vastai: "/agents/vastai-agent.webp",
  wlan_network: "/agents/wlan-network-agent.webp",
  knowledge_manager: "/agents/knowledge-manager.webp",
  metrumai_insights: "/agents/metrumai-insights-agent.webp",
};

const FALLBACK_AVATAR = "/agents/operations-manager.webp";

/** Returns a public avatar path for an agent_name slug. */
export function agentAvatarUrl(agentName: string | null | undefined): string {
  if (!agentName) return FALLBACK_AVATAR;
  const key = agentName
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return AGENT_AVATAR_BY_NAME[key] || FALLBACK_AVATAR;
}
