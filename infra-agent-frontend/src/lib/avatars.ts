/**
 * Agent avatar image mappings.
 * Images are stored in /public/agents/ as optimized WebP files.
 * Two sets available: Set 1 (default) and Set 2 (alternate).
 */

// Set 1: Original avatars (default)
export const AVATAR_SET_1: Record<string, string> = {
  "Operations Manager": "/agents/Operations Manager.webp",
  "Hardware Operations": "/agents/System Admin Hardware Agent.webp",
  "OS Operations": "/agents/Systems Admin OS Agent.webp",
  "Level 1 Support": "/agents/Level1 Support.webp",
  "WLAN Network Specialist": "/agents/WLAN Network Agent.webp",
  "NeoCloud Provisioning Agent": "/agents/VastAI Agent.webp",
  "MetrumAI Insights Agent": "/agents/MetrumAI Insights.webp",
  "Knowledge Manager": "/agents/Operations Manager-extra.webp",
  "Database Agent": "/agents/Database Agent.webp",
  "Report Generator Agent": "/agents/Report Generator Agent.webp",
  "Virtualization Agent": "/agents/Virtualization_Agent.webp",
  "Liquid Cooling Agent": "/agents/Liquid Cooling Agent.webp",
  storage_agent: "/agents/Storage Operation Agent.webp",
  "Storage Agent": "/agents/Storage Operation Agent.webp",

  "Operations Manager Agent": "/agents/Operations Manager.webp",
  "Level 1 Support Agent": "/agents/Level1 Support.webp",
  "Systems Admin Hardware Agent": "/agents/System Admin Hardware Agent.webp",
  "Systems Admin OS Agent": "/agents/Systems Admin OS Agent.webp",
  "WLAN Network Agent": "/agents/WLAN Network Agent.webp",
  "Vast.ai Agent": "/agents/VastAI Agent.webp",
};

// Set 2: Alternate avatars (lowercase hyphenated naming)
export const AVATAR_SET_2: Record<string, string> = {
  "Operations Manager": "/agents/operations-manager.webp",
  "Hardware Operations": "/agents/systems-admin-agent-hw.webp",
  "OS Operations": "/agents/systems-admin-agent-os.webp",
  "Level 1 Support": "/agents/level-1-support.webp",
  "WLAN Network Specialist": "/agents/wlan-network-agent.webp",
  "NeoCloud Provisioning Agent": "/agents/vastai-agent.webp",
  "MetrumAI Insights Agent": "/agents/metrumai-insights-agent.webp",
  "Knowledge Manager": "/agents/metrumai-insights-agent.webp",
  "Database Agent": "/agents/database-agent.webp",
  "Report Generator Agent": "/agents/report-generator-agent.webp",
  "Virtualization Agent": "/agents/Virtualization_Agent.webp",
  "Liquid Cooling Agent": "/agents/Liquid Cooling Agent.webp",
  storage_agent: "/agents/Storage Operation Agent.webp",
  "Storage Agent": "/agents/Storage Operation Agent.webp",

  "Operations Manager Agent": "/agents/operations-manager.webp",
  "Level 1 Support Agent": "/agents/level-1-support.webp",
  "Systems Admin Hardware Agent": "/agents/systems-admin-agent-hw.webp",
  "Systems Admin OS Agent": "/agents/systems-admin-agent-os.webp",
  "WLAN Network Agent": "/agents/wlan-network-agent.webp",
  "Vast.ai Agent": "/agents/vastai-agent.webp",
};

// LocalStorage key for avatar set preference
const AVATAR_SET_KEY = "metrum-avatar-set";

export type AvatarSet = 1 | 2;

/**
 * Get the current avatar set preference.
 * Defaults to Set 1 if not configured.
 */
export const getAvatarSet = (): AvatarSet => {
  if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem(AVATAR_SET_KEY);
  return stored === "2" ? 2 : 1;
};

/**
 * Set the avatar set preference.
 * Persists to localStorage.
 */
export const setAvatarSet = (set: AvatarSet): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVATAR_SET_KEY, String(set));
  // Dispatch custom event for components to react to change
  window.dispatchEvent(new CustomEvent("avatar-set-changed", { detail: set }));
};

/**
 * Toggle between avatar sets.
 * Returns the new set number.
 */
export const toggleAvatarSet = (): AvatarSet => {
  const current = getAvatarSet();
  const newSet: AvatarSet = current === 1 ? 2 : 1;
  setAvatarSet(newSet);
  return newSet;
};

// Legacy export for backward compatibility
export const AVATAR_BY_LABEL = AVATAR_SET_1;

export type AgentLabel = keyof typeof AVATAR_SET_1;

/**
 * Snake-case `agent_name` (from the device-agent-activity endpoint /
 * ReactFlow node ids) -> human-readable label used as the avatar /
 * display key. Used when only the snake_case form is available
 * (activity endpoint payload, rack card, etc.).
 */
export const AGENT_NAME_TO_LABEL: Record<string, string> = {
  operations_manager: "Operations Manager",
  level1_support: "Level 1 Support",
  systems_admin_hardware: "Hardware Operations",
  systems_admin_os: "OS Operations",
  wlan_network: "WLAN Network Specialist",
  vastai: "NeoCloud Provisioning Agent",
  metrumai_insights: "MetrumAI Insights Agent",
  virtualization: "Virtualization Agent",
  liquid_cooling: "Liquid Cooling Agent",
  storage_agent: "Storage Agent",
};

/**
 * Resolve an avatar for any agent identifier we might have — supports
 * both the API `display_name` (e.g. "Operations Manager Agent") and the
 * snake_case `agent_name` (e.g. "operations_manager"). Falls back to
 * the Operations Manager avatar so the slot is never empty.
 */
export const resolveAgentAvatar = (agentIdentifier?: string | null): string => {
  if (!agentIdentifier) {
    return "/agents/Operations Manager.webp";
  }
  const direct = getAvatar(agentIdentifier);
  if (direct) return direct;
  const mappedLabel = AGENT_NAME_TO_LABEL[agentIdentifier];
  if (mappedLabel) {
    const mapped = getAvatar(mappedLabel);
    if (mapped) return mapped;
  }
  return "/agents/Operations Manager.webp";
};

/**
 * Get avatar path for a given agent label.
 * Uses current set preference unless forceSet is provided.
 *
 * Args:
 *   label: The agent label/display name.
 *   forceSet: Optional - force a specific avatar set (1 or 2).
 *
 * Returns:
 *   Avatar image path or undefined if not found.
 */
export const getAvatar = (label?: string, forceSet?: AvatarSet): string | undefined => {
  if (!label) return undefined;
  const currentSet = forceSet ?? getAvatarSet();
  const avatarMap = currentSet === 2 ? AVATAR_SET_2 : AVATAR_SET_1;
  return avatarMap[label];
};
