export interface TeamsDashboardProps {
  /** Cluster to load. No cluster renders until this (or a most-recently-deployed fallback) resolves. */
  clusterId: string | null;
}
