/** BMC event presentation helpers for Digital Twin device panels. */

export type BmcEventSeverity = "Critical" | "Warning" | "Informational";

export type BmcEventsSubTab = "alerts" | "hardware" | "lifecycle";

export interface BmcDeviceEvent {
  id: string;
  timestamp: string;
  event_ts?: string;
  severity: string;
  category: string;
  message: string;
  message_id?: string;
  component?: string;
  log_type?: string;
  is_routine?: boolean;
}

export interface BmcEventsSummary {
  total_events: number;
  critical_count: number;
  warning_count: number;
  informational_count: number;
}

export function normalizeSeverity(severity: string | undefined | null): BmcEventSeverity {
  const text = (severity || "").trim().toLowerCase();
  if (text.includes("critical") || text === "fatal" || text === "error") return "Critical";
  if (text.includes("warning") || text === "warn") return "Warning";
  return "Informational";
}

export function isRoutineLifecycleEvent(event: BmcDeviceEvent): boolean {
  if (event.is_routine) return true;
  const message = (event.message || "").trim().toLowerCase();
  if (!message) return false;
  return (
    message.includes("successfully logged in using") ||
    message.includes("previous log entry was repeated") ||
    message.startsWith("user ") ||
    message.startsWith("log cleared")
  );
}

export function formatEventTimestamp(event: BmcDeviceEvent): string {
  const raw = event.event_ts?.trim() || event.timestamp?.trim();
  if (!raw) return "N/A";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

export function filterLifecycleEvents(
  events: BmcDeviceEvent[],
  showRoutine: boolean,
): BmcDeviceEvent[] {
  if (showRoutine) return events;
  return events.filter((event) => !isRoutineLifecycleEvent(event));
}

export function eventsForSubTab(
  data: {
    events_alerts?: BmcDeviceEvent[];
    events_sel?: BmcDeviceEvent[];
    events_lifecycle?: BmcDeviceEvent[];
    events?: BmcDeviceEvent[];
  },
  subTab: BmcEventsSubTab,
  showRoutineLifecycle: boolean,
): BmcDeviceEvent[] {
  if (subTab === "alerts") {
    const alerts = data.events_alerts ?? [];
    if (alerts.length > 0) return alerts;
    const fallback = data.events ?? [];
    return fallback.filter((event) => normalizeSeverity(event.severity) !== "Informational");
  }
  if (subTab === "hardware") {
    const sel = data.events_sel ?? [];
    if (sel.length > 0) return sel;
    return (data.events ?? []).filter((event) => (event.log_type || "").toLowerCase() === "sel");
  }
  const lifecycle = data.events_lifecycle ?? [];
  const source =
    lifecycle.length > 0
      ? lifecycle
      : (data.events ?? []).filter((event) => (event.log_type || "").toLowerCase() === "lclog");
  return filterLifecycleEvents(source, showRoutineLifecycle);
}

export function severityColor(severity: string | undefined | null): string {
  switch (normalizeSeverity(severity)) {
    case "Critical":
      return "var(--destructive)";
    case "Warning":
      return "var(--warning)";
    default:
      return "var(--success)";
  }
}

export function logTypeBadge(logType: string | undefined | null): string {
  const key = (logType || "").trim().toLowerCase();
  if (key === "sel") return "SEL";
  if (key === "lclog") return "LCLOG";
  return "BMC";
}
