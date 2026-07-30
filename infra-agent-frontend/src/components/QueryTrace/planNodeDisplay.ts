/**
 * Shared display-name/status mapping for a single DAG task node —
 * used by both `NodeDetailsModal.tsx` and `PlanApprovalCard.tsx`
 * (identical in both places in the Vite source; deduped here instead
 * of copy-pasted twice).
 */

/** Maps agent names to display-friendly labels; legacy NOC variants -> Level 1 Support. */
export function getAgentDisplayName(agentName: string): string {
  if (!agentName) return "Unknown";

  const normalized = agentName.toLowerCase().trim();

  if (
    normalized.includes("noc") ||
    normalized.includes("level1-support") ||
    normalized.includes("level1_support") ||
    normalized === "level 1 support" ||
    normalized === "level1support"
  ) {
    return "Level 1 Support";
  }

  const agentMap: Record<string, string> = {
    "operations-manager": "Operations Manager",
    operations_manager: "Operations Manager",
    "operations manager": "Operations Manager",
    "systems-admin-hw": "Hardware Operations",
    systems_admin_hw: "Hardware Operations",
    "systems admin hw": "Hardware Operations",
    "systems-admin-os": "OS Operations",
    "systems-admin-agent-os": "OS Operations",
    systems_admin_os: "OS Operations",
    systems_admin_agent_os: "OS Operations",
    "systems admin os": "OS Operations",
    "systems admin agent os": "OS Operations",
    "wlan-network-agent": "WLAN Network Specialist",
    wlan_network_agent: "WLAN Network Specialist",
    "wlan network agent": "WLAN Network Specialist",
    "vastai-agent": "NeoCloud Provisioning Agent",
    vastai_agent: "NeoCloud Provisioning Agent",
    "vastai agent": "NeoCloud Provisioning Agent",
    "metrumai-insights-agent": "MetrumAI Insights Agent",
    metrumai_insights_agent: "MetrumAI Insights Agent",
    "metrumai insights agent": "MetrumAI Insights Agent",
  };

  if (agentMap[normalized]) {
    return agentMap[normalized];
  }

  return agentName
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Normalizes node status for consistent display.
 * When a flow is completed (`flowTerminal`), every node shows "completed".
 */
export function normalizeNodeStatus(
  status: string | undefined | null,
  flowTerminal = false,
): string {
  if (flowTerminal) {
    return "completed";
  }
  if (!status) return "pending";

  const normalized = status.toLowerCase().trim();

  if (
    normalized === "completed" ||
    normalized === "done" ||
    normalized === "success" ||
    normalized === "succeeded"
  ) {
    return "completed";
  }
  if (normalized === "failed" || normalized === "error" || normalized === "errored") {
    return "failed";
  }
  if (
    normalized === "executing" ||
    normalized === "running" ||
    normalized === "in_progress" ||
    normalized === "in-progress"
  ) {
    return "executing";
  }
  if (normalized === "pending" || normalized === "waiting" || normalized === "queued") {
    return "pending";
  }

  return status;
}
