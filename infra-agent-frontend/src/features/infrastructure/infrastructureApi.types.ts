export interface CommandCenterAgentActivityMember {
  agent_name: string;
  display_name: string | null;
  role: string;
}

export interface CommandCenterAgentActivityTeam {
  team_id: string;
  team_name: string | null;
  cluster_id: number | null;
  agent_count: number;
  status: "live" | "idle";
  last_activity_at: string | null;
  members: CommandCenterAgentActivityMember[];
  activity_error: string | null;
}

export interface CommandCenterAgentActivitySummary {
  teams: number;
  agents: number;
  active: number;
  idle: number;
  issues: number;
}

export interface CommandCenterAgentActivityResponse {
  timestamp: string;
  summary: CommandCenterAgentActivitySummary;
  teams: CommandCenterAgentActivityTeam[];
}

export interface CommandCenterInfraHealthKpi {
  value: number;
  unit: "percent" | "minutes" | "count";
  trend: number;
}

export interface CommandCenterInfrastructureHealthResponse {
  overall_percent: number;
  total_nodes: number;
  nodes: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
  kpis: {
    uptime: CommandCenterInfraHealthKpi;
    mttr: CommandCenterInfraHealthKpi;
    resolved: CommandCenterInfraHealthKpi;
    sla: CommandCenterInfraHealthKpi;
  };
  timestamp: string;
}

export interface CommandCenterTicketWeeklyTrendItem {
  day: string;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface CommandCenterTicketsResponse {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  blocked: number;
  weekly_trend_percent: number;
  weekly_trend: CommandCenterTicketWeeklyTrendItem[];
}

export interface CommandCenterIncident {
  id: string;
  title: string;
  location: string | null;
  status: string;
  priority: string | null;
  occurred_at: string | null;
  url: string | null;
}

export interface CommandCenterIncidentsResponse {
  returned: number;
  incidents: CommandCenterIncident[];
}
