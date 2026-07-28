import { AgentActivityCard } from "./AgentActivityCard";
import { InfrastructureHealthCard } from "./InfrastructureHealthCard";
import { TicketsIncidentsCard } from "./TicketsIncidentsCard";
import styles from "./BottomStatsRow.module.css";
import type { BottomStatsRowProps } from "./BottomStatsRow.types";

/**
 * Command Center bottom row: agent team activity, infrastructure health, and
 * ticket/incident overview. Purely presentational — data comes from
 * GET /command-center/{agent-activity,infrastructure-health,tickets,incidents},
 * fetched by whichever parent renders this (the Live Dashboard overview).
 */
export function BottomStatsRow({
  agentActivity,
  infraHealth,
  tickets,
  incidents,
  isLoadingAgents,
  isLoadingHealth,
  isLoadingTickets,
  isLoadingIncidents,
  agentsError,
  healthError,
  ticketsError,
  incidentsError,
}: BottomStatsRowProps) {
  return (
    <div className={styles.row}>
      <AgentActivityCard
        agentActivity={agentActivity}
        isLoading={isLoadingAgents}
        hasError={agentsError}
      />
      <InfrastructureHealthCard
        infraHealth={infraHealth}
        isLoading={isLoadingHealth}
        hasError={healthError}
      />
      <TicketsIncidentsCard
        tickets={tickets}
        incidents={incidents}
        isLoadingTickets={isLoadingTickets}
        isLoadingIncidents={isLoadingIncidents}
        ticketsError={ticketsError}
        incidentsError={incidentsError}
      />
    </div>
  );
}

export default BottomStatsRow;
