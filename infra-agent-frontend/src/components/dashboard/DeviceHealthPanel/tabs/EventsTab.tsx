"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import type { LiveDeviceDetailResponse } from "@/features/digitalTwin/digitalTwinApi.types";
import { cn } from "@/lib/utils";
import {
  eventsForSubTab,
  formatEventTimestamp,
  logTypeBadge,
  normalizeSeverity,
  severityColor,
  type BmcDeviceEvent,
  type BmcEventsSubTab,
} from "@/utils/bmcEventsView";
import { safeString } from "../deviceHealthHelpers";
import styles from "../DeviceHealthPanel.module.css";

const EVENTS_SUB_TABS: { id: BmcEventsSubTab; label: string }[] = [
  { id: "alerts", label: "Alerts" },
  { id: "hardware", label: "Hardware" },
  { id: "lifecycle", label: "Lifecycle" },
];

function eventMeta(event: BmcDeviceEvent): string | null {
  const parts: string[] = [];
  if (event.id) parts.push(`#${event.id}`);
  if (event.component) parts.push(event.component);
  if (event.message_id) parts.push(event.message_id);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** BMC alerts, hardware SEL, and lifecycle audit streams. */
export function EventsTab({ data }: { data: LiveDeviceDetailResponse }) {
  const [subTab, setSubTab] = useState<BmcEventsSubTab>("alerts");
  const [showRoutineLifecycle, setShowRoutineLifecycle] = useState(false);

  const eventsSummary = data?.events_summary;
  const visibleEvents = eventsForSubTab(
    {
      events_alerts: data?.events_alerts,
      events_sel: data?.events_sel,
      events_lifecycle: data?.events_lifecycle,
      events: data?.events,
    },
    subTab,
    showRoutineLifecycle,
  );

  return (
    <div className={styles.tabContent}>
      <div className={styles.eventsSummary}>
        <div className={styles.eventSummaryCard}>
          <span className={styles.eventSummaryValue}>{eventsSummary?.total_events ?? 0}</span>
          <span className={styles.eventSummaryLabel}>Total (7d)</span>
        </div>
        <div className={styles.eventSummaryCard} data-severity="critical">
          <span className={styles.eventSummaryValue}>{eventsSummary?.critical_count ?? 0}</span>
          <span className={styles.eventSummaryLabel}>Critical</span>
        </div>
        <div className={styles.eventSummaryCard} data-severity="warning">
          <span className={styles.eventSummaryValue}>{eventsSummary?.warning_count ?? 0}</span>
          <span className={styles.eventSummaryLabel}>Warning</span>
        </div>
        <div className={styles.eventSummaryCard} data-severity="info">
          <span className={styles.eventSummaryValue}>
            {eventsSummary?.informational_count ?? 0}
          </span>
          <span className={styles.eventSummaryLabel}>Info</span>
        </div>
      </div>

      <div className={styles.eventsSubTabs}>
        {EVENTS_SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={subTab === tab.id ? styles.eventsSubTabActive : styles.eventsSubTab}
            onClick={() => setSubTab(tab.id)}
            aria-pressed={subTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "lifecycle" && (
        <label className={styles.eventsRoutineToggle}>
          <input
            type="checkbox"
            checked={showRoutineLifecycle}
            onChange={(event) => setShowRoutineLifecycle(event.target.checked)}
          />
          <span>Show routine logins and duplicate notices</span>
        </label>
      )}

      {subTab === "alerts" && (
        <p className={styles.eventsTabHint}>
          Critical and warning events from hardware SEL and lifecycle logs. Routine audit noise is
          hidden.
        </p>
      )}
      {subTab === "hardware" && (
        <p className={styles.eventsTabHint}>
          System Event Log (SEL) entries from the BMC — hardware faults, power, thermal, and PCIe
          events.
        </p>
      )}
      {subTab === "lifecycle" && (
        <p className={styles.eventsTabHint}>
          BMC lifecycle and audit log. Login events are hidden unless you enable the toggle above.
        </p>
      )}

      <div className={styles.eventsList}>
        <h4 className={styles.sectionTitle}>
          <Activity size={14} aria-hidden="true" />
          {subTab === "alerts" && "Actionable Alerts"}
          {subTab === "hardware" && "Hardware Event Log"}
          {subTab === "lifecycle" && "Lifecycle Log"}
        </h4>
        {visibleEvents.length === 0 ? (
          <div className={styles.noEvents}>
            {subTab === "alerts"
              ? "No critical or warning events in the last 7 days."
              : "No events in this view."}
          </div>
        ) : (
          visibleEvents.map((event, index) => {
            const meta = eventMeta(event);
            return (
              <div key={event?.id || `${subTab}-${index}`} className={styles.eventItem}>
                <div
                  className={styles.eventSeverityDot}
                  style={{ backgroundColor: severityColor(event?.severity) }}
                />
                <div className={styles.eventContent}>
                  <div className={styles.eventHeader}>
                    <div className={styles.eventBadges}>
                      <span className={styles.eventCategory}>{safeString(event?.category)}</span>
                      <span className={styles.eventTypeBadge}>{logTypeBadge(event?.log_type)}</span>
                      <span
                        className={cn(styles.eventSeverityBadge)}
                        data-severity={normalizeSeverity(event?.severity).toLowerCase()}
                      >
                        {normalizeSeverity(event?.severity)}
                      </span>
                    </div>
                    <span className={styles.eventTime}>{formatEventTimestamp(event)}</span>
                  </div>
                  <p className={styles.eventMessage}>{safeString(event?.message)}</p>
                  {meta && <span className={styles.eventComponent}>{meta}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EventsTab;
