export interface GhostTrailProps {
  /**
   * Numeric counter from the parent. Currently unused (kept for API
   * compatibility) — the visualization is purely continuous, never a
   * one-shot burst tied to this value.
   */
  trigger: number;
  /**
   * Whether an active agent is currently working. Controls whether the
   * ribbon flow is rendered at all.
   */
  active: boolean;
}
