"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { BottomStatsRow } from "@/components/dashboard/BottomStatsRow/BottomStatsRow";
import { DataCenterGlobe } from "@/components/DigitalTwin/DataCenterGlobe";
import type { GlobeSite } from "@/components/DigitalTwin/types";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import {
  useGetCommandCenterAgentActivityQuery,
  useGetCommandCenterIncidentsQuery,
  useGetCommandCenterInfrastructureHealthQuery,
  useGetCommandCenterTicketsQuery,
} from "@/features/infrastructure/infrastructureApi";
import { useGetCommandCenterSitesQuery } from "@/features/digitalTwin/digitalTwinApi";
import { commandCenterSiteToGlobeSite } from "@/utils/commandCenterSites";
import styles from "./LiveDashboardOverview.module.css";

const AGENT_ACTIVITY_POLLING_INTERVAL = 8000;
const HEALTH_POLLING_INTERVAL = 12000;
const TICKETS_POLLING_INTERVAL = 60000;
const INCIDENTS_POLLING_INTERVAL = 45000;
const CC_SITES_POLLING_INTERVAL = 15000;

/** Live Dashboard overview: site globe (Phase 6 component, Phase 13 data) + Command Center summary row. */
export function LiveDashboardOverview() {
  const {
    data: ccSitesResponse,
    isLoading: isLoadingGlobe,
    isError: globeError,
  } = useGetCommandCenterSitesQuery(undefined, {
    pollingInterval: CC_SITES_POLLING_INTERVAL,
  });
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

  const router = useRouter();

  const sites = useMemo((): GlobeSite[] => {
    const rows = ccSitesResponse?.sites ?? [];
    return rows.map(commandCenterSiteToGlobeSite).filter((site) => Boolean(site.name));
  }, [ccSitesResponse]);

  // The Vite source's site click opens an inline split-view (SiteRoomView)
  // fed by `mergeTwinIntoCommandCenterSite` — that split-view isn't in scope
  // here (see digitalTwinApi.ts's doc comment). Neither `/digital-twin`'s
  // route (`app/digital-twin/page.tsx`) nor `DigitalTwinRoute`/
  // `DataCenterDigitalTwin` accept a site-id deep link today (confirmed: no
  // query-param/prop for it), so this is a simple "go explore the full
  // Digital Twin view" navigation rather than a targeted deep link.
  function handleSiteClick(_site: GlobeSite) {
    router.push("/digital-twin");
  }

  return (
    <div className={styles.overview}>
      {globeError ? (
        <div className={styles.globeStatus}>
          <AlertCircle size={32} aria-hidden="true" className={styles.globeStatusError} />
          <h2>Could not load site globe</h2>
          <p>Check connectivity and try again.</p>
        </div>
      ) : isLoadingGlobe && !ccSitesResponse ? (
        <div className={styles.globeStatus}>
          <Spinner size="lg" aria-hidden="true" />
          <p>Loading site globe…</p>
        </div>
      ) : (
        <div className={styles.globeContainer}>
          <DataCenterGlobe
            sites={sites}
            onSiteClick={handleSiteClick}
            hideStatsPanel
            hideInstructions
            enablePersistentTips
          />
        </div>
      )}

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
