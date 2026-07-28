/**
 * Display data needed to render the active agent's card replica.
 * Resolved by the parent (LiveDashboard) from the team-config endpoint.
 */
export interface ActiveAgentCardData {
  /** Raw agent_name from the API (matches active_agent.agent_name). */
  agentName: string;
  /** Human-readable display name shown on the card. */
  displayName: string;
  /** Description / tagline shown under the agent name. */
  description: string | null;
  /** Formatted tool names (already mapped through TOOL_LABELS). */
  tools: string[];
  /** Skill / capability strings shown as the bulleted list. */
  capabilities: string[];
  /** Number of tools (drives the "N tools" chip). */
  toolsCount: number;
}

export interface TravelingTeamCardProps {
  /**
   * Counter that fires the one-shot animation. Each new value replays
   * the journey. Should be bumped only on new active-agent transitions.
   */
  trigger: number;
  /**
   * Resolved metadata for the currently active agent. Pass `null`
   * while no agent is active or the team config is still loading.
   */
  agentData: ActiveAgentCardData | null;
  /**
   * Status of the active agent. Drives the accent color (cyan for
   * processing, amber for waiting approval).
   */
  status: "processing" | "waiting_approval" | "completed" | "failed" | null;
}
