import type {
  CommandCenterAgentActivityResponse,
  CommandCenterIncident,
  CommandCenterInfrastructureHealthResponse,
  CommandCenterTicketsResponse,
} from "@/features/infrastructure/infrastructureApi.types";

export type HealthSegmentKey = "healthy" | "warning" | "critical";
export type TicketSegmentKey = "open" | "inProgress" | "closed";

export interface BottomStatsRowProps {
  agentActivity?: CommandCenterAgentActivityResponse | null;
  infraHealth?: CommandCenterInfrastructureHealthResponse | null;
  tickets?: CommandCenterTicketsResponse | null;
  incidents?: CommandCenterIncident[] | null;
  isLoadingAgents?: boolean;
  isLoadingHealth?: boolean;
  isLoadingTickets?: boolean;
  isLoadingIncidents?: boolean;
  agentsError?: boolean;
  healthError?: boolean;
  ticketsError?: boolean;
  incidentsError?: boolean;
}
