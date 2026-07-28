export interface ClusterTeamSelectorProps {
  /**
   * Callback when cluster selection changes.
   * Passes clusterId and hasActiveTeam boolean.
   */
  onClusterChange?: (clusterId: string, hasActiveTeam: boolean) => void;
  /**
   * Default cluster ID to select on mount (uncontrolled mode).
   */
  defaultClusterId?: string;
  /**
   * Controlled cluster ID value. When provided, component is in controlled mode.
   */
  value?: string | null;
  /**
   * Disable the selector (prevents user interaction).
   */
  disabled?: boolean;
}
