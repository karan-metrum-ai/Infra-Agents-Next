"use client";

import { useState } from "react";
import { AlertCircle, Ticket } from "lucide-react";
import type {
  CommandCenterIncident,
  CommandCenterTicketsResponse,
} from "@/features/infrastructure/infrastructureApi.types";
import { cn } from "@/lib/utils";
import { PanelEmpty, PanelLoading } from "./PanelStates";
import { TicketDonut } from "./TicketDonut";
import { formatRelativeTime, incidentPriorityMeta } from "./commandCenterFormatters";
import styles from "./BottomStatsRow.module.css";
import type { TicketSegmentKey } from "./BottomStatsRow.types";

interface TicketsIncidentsCardProps {
  tickets?: CommandCenterTicketsResponse | null;
  incidents?: CommandCenterIncident[] | null;
  isLoadingTickets?: boolean;
  isLoadingIncidents?: boolean;
  ticketsError?: boolean;
  incidentsError?: boolean;
}

const TICKET_LEGEND = [
  { key: "open" as const, label: "Open", leg: "legOpen" as const },
  { key: "inProgress" as const, label: "In-Progress", leg: "legProgress" as const },
  { key: "closed" as const, label: "Closed", leg: "legClosed" as const },
];

export function TicketsIncidentsCard({
  tickets,
  incidents,
  isLoadingTickets,
  isLoadingIncidents,
  ticketsError,
  incidentsError,
}: TicketsIncidentsCardProps) {
  const [ticketActive, setTicketActive] = useState<TicketSegmentKey | null>(null);

  const ticketOpen = tickets?.open ?? 0;
  const ticketInProgress = tickets?.in_progress ?? 0;
  const ticketClosed = (tickets?.resolved ?? 0) + (tickets?.closed ?? 0);
  const ticketTotal = tickets?.total ?? 0;
  const incidentList = incidents ?? [];
  const ticketValues = { open: ticketOpen, inProgress: ticketInProgress, closed: ticketClosed };

  const toggleTicket = (key: TicketSegmentKey) =>
    setTicketActive((prev) => (prev === key ? null : key));

  return (
    <div className={`${styles.card} ${styles.cardOverflowVisible}`}>
      <div className={styles.incidentSplit}>
        <div className={styles.ticketBlock}>
          <h3 className={styles.panelHeading}>
            <Ticket size={13} aria-hidden="true" />
            Ticket Overview
          </h3>
          {ticketsError ? (
            <PanelEmpty icon={<AlertCircle size={16} />} title="Could not load tickets" />
          ) : isLoadingTickets && !tickets ? (
            <PanelLoading message="Loading tickets..." />
          ) : (
            <div className={styles.ticketBody}>
              <TicketDonut
                open={ticketOpen}
                inProgress={ticketInProgress}
                closed={ticketClosed}
                total={ticketTotal}
                activeKey={ticketActive}
                onSelect={setTicketActive}
              />
              <div className={styles.ticketLegend}>
                {TICKET_LEGEND.map((row) => (
                  <button
                    type="button"
                    key={row.key}
                    className={cn(
                      styles.legendRow,
                      styles.glowButton,
                      ticketActive === row.key && styles.legendGlow,
                      ticketActive !== null && ticketActive !== row.key && styles.legendDimmed,
                    )}
                    aria-pressed={ticketActive === row.key}
                    onClick={() => toggleTicket(row.key)}
                  >
                    <i className={styles[row.leg]} aria-hidden="true" />
                    <span>{row.label}</span>
                    <b>{ticketValues[row.key]}</b>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className={styles.incidentList}>
          <h3 className={styles.panelHeading}>
            <AlertCircle size={13} aria-hidden="true" />
            Recent Incidents
          </h3>
          <div className={styles.incidentItems}>
            {incidentsError ? (
              <PanelEmpty icon={<AlertCircle size={16} />} title="Could not load incidents" />
            ) : isLoadingIncidents && incidentList.length === 0 ? (
              <PanelLoading message="Loading..." />
            ) : incidentList.length === 0 ? (
              <div className={styles.emptyStateInline}>
                <AlertCircle size={14} aria-hidden="true" style={{ opacity: 0.4 }} />
                <span>No open incidents</span>
              </div>
            ) : (
              incidentList.map((inc) => {
                const priority = incidentPriorityMeta(inc.priority, styles);
                const content = (
                  <>
                    <div className={styles.incidentBody}>
                      <span className={styles.incidentId}>INC-{inc.id}</span>
                      <span className={styles.incidentTitle}>{inc.title}</span>
                      <span className={styles.incidentMeta}>{inc.location || "—"}</span>
                    </div>
                    <div className={styles.incidentAside}>
                      <span className={cn(styles.statusTag, priority.className)}>
                        {priority.label}
                      </span>
                      <span className={styles.incidentTime}>
                        {formatRelativeTime(inc.occurred_at)}
                      </span>
                    </div>
                  </>
                );

                return inc.url ? (
                  <a
                    key={inc.id}
                    href={inc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.incidentItem}
                  >
                    {content}
                  </a>
                ) : (
                  <div key={inc.id} className={styles.incidentItem}>
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketsIncidentsCard;
