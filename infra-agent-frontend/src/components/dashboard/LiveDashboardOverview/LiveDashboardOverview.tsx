"use client";

import { Globe2 } from "lucide-react";
import { BottomStatsRow } from "@/components/dashboard/BottomStatsRow/BottomStatsRow";
import {
  useGetCommandCenterAgentActivityQuery,
  useGetCommandCenterIncidentsQuery,
  useGetCommandCenterInfrastructureHealthQuery,
  useGetCommandCenterTicketsQuery,
} from "@/features/infrastructure/infrastructureApi";
import styles from "./LiveDashboardOverview.module.css";

const AGENT_ACTIVITY_POLLING_INTERVAL = 8000;
const HEALTH_POLLING_INTERVAL = 12000;
const TICKETS_POLLING_INTERVAL = 60000;
const INCIDENTS_POLLING_INTERVAL = 45000;

/** Live Dashboard overview: site globe (Phase 6) + Command Center summary row. */
export function LiveDashboardOverview() {
  const {
    data: agentActivity,
    isLoading: isLoadingAgents,
    isError: agentsError,
  } = useGetCommandCenterAgentActivityQuery(undefined, {
    pollingInterval: AGENT_ACTIVITY_POLLING_INTERVAL,
  });
  const {
    data: infraHealth,
    isLoading: isLoadingHealth,
    isError: healthError,
  } = useGetCommandCenterInfrastructureHealthQuery(undefined, {
    pollingInterval: HEALTH_POLLING_INTERVAL,
  });
  const {
    data: tickets,
    isLoading: isLoadingTickets,
    isError: ticketsError,
  } = useGetCommandCenterTicketsQuery(undefined, {
    pollingInterval: TICKETS_POLLING_INTERVAL,
  });
  const {
    data: incidentsData,
    isLoading: isLoadingIncidents,
    isError: incidentsError,
  } = useGetCommandCenterIncidentsQuery(
    { limit: 10, includeResolved: false },
    { pollingInterval: INCIDENTS_POLLING_INTERVAL },
  );

  return (
    <div className={styles.overview}>
      <div className={styles.globePlaceholder}>
        <Globe2 size={32} aria-hidden="true" />
        <h2>Site globe lands in Phase 6</h2>
        <p>
          The 3D digital-twin globe and rack visualization are built as part of the Infrastructure
          Topology & Digital Twin phase.
        </p>
      </div>

      <div className={styles.bottomStatsBar}>
        <BottomStatsRow
          agentActivity={agentActivity}
          infraHealth={infraHealth}
          tickets={tickets}
          incidents={incidentsData?.incidents}
          isLoadingAgents={isLoadingAgents}
          isLoadingHealth={isLoadingHealth}
          isLoadingTickets={isLoadingTickets}
          isLoadingIncidents={isLoadingIncidents}
          agentsError={agentsError}
          healthError={healthError}
          ticketsError={ticketsError}
          incidentsError={incidentsError}
        />
      </div>
    </div>
  );
}

export default LiveDashboardOverview;
