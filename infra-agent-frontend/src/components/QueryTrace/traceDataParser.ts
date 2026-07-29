/**
 * Utilities for parsing and transforming trace data.
 */

import { normalizeReasoningContent } from "./normalizeReasoningContent";

export interface ParsedToolCall {
  tool_name: string;
  status: string;
}

export interface ParsedAgentTrace {
  name: string;
  query: string;
  agent_response: string;
  reasoning_content: string[];
  created_at: string;
  completed_at: string;
  status: string;
  tool_calls?: ParsedToolCall[];
  duration_ms?: number;
}

export interface ParsedFinalResponse {
  content: string;
  created_at: string;
  completed_at: string;
  status: string;
}

export interface ParsedTraceData {
  agents: ParsedAgentTrace[];
  final_response?: ParsedFinalResponse;
  total_duration_ms: number;
}

/** Raw `final_response` pseudo-row as emitted by the backend trace array. */
interface RawFinalResponse {
  content?: string;
  created_at?: string | number;
  completed_at?: string | number;
  status?: string;
}

/** Raw trace row — either a named agent execution or a final_response wrapper. */
interface RawTraceItem {
  final_response?: RawFinalResponse;
  name?: string;
  query?: string;
  agent_response?: string;
  reasoning_content?: string | unknown[];
  created_at?: string | number;
  completed_at?: string | number;
  status?: string;
  tool_calls?: ParsedToolCall[];
}

/** Accepted shapes for `parseTraceData`'s input: old (array) and new (`{ trace }`) API formats. */
export type RawTraceInput =
  | RawTraceItem[]
  | (Record<string, unknown> & { trace?: RawTraceItem[] })
  | null
  | undefined;

/**
 * Clean escaped JSON strings and parse reasoning content.
 */
function cleanReasoningContent(raw: string | unknown[] | undefined): string[] {
  if (!raw) return [];

  try {
    let parsed: unknown = raw;
    if (typeof raw === "string" && raw.startsWith("[")) {
      parsed = JSON.parse(raw);
    }

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeReasoningContent(String(item).trim()))
        .filter((item) => item.length > 0);
    }

    const normalized = normalizeReasoningContent(String(parsed).trim());
    return normalized ? [normalized] : [];
  } catch {
    const normalized = normalizeReasoningContent(String(raw));
    return normalized ? [normalized] : [];
  }
}

/**
 * Clean and unescape agent response strings.
 */
function cleanResponse(raw: string): string {
  if (!raw) return "";

  try {
    // If it's a JSON array string, parse and join
    if (raw.startsWith("[") || raw.startsWith("['")) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.join("\n");
      }
    }
  } catch {
    // Not JSON, continue
  }

  // Remove leading/trailing quotes and unescape
  return raw
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");
}

/**
 * Parse timestamp as UTC. Server can return timestamps as:
 * 1. ISO strings without 'Z' suffix (need to append 'Z' for UTC parsing)
 * 2. Unix timestamps in milliseconds (need to convert directly)
 *
 * Without the 'Z' suffix, JavaScript interprets the timestamp as local time,
 * which causes incorrect "X hours ago" displays. For example:
 * - Server time: 2025-11-11T11:14:29 (UTC)
 * - User in IST (UTC+5:30): Interpreted as 11:14 IST instead of 11:14 UTC
 * - Result: Shows "6 hours ago" instead of "a few seconds ago"
 */
export function parseUTCTimestamp(timestamp: string | number): number {
  if (!timestamp) return 0;

  // Handle Unix timestamp (number or numeric string)
  if (typeof timestamp === "number") {
    return timestamp;
  }

  // Check if it's a numeric string (Unix timestamp)
  const numericTimestamp = Number(timestamp);
  if (!isNaN(numericTimestamp) && numericTimestamp > 1000000000000) {
    return numericTimestamp;
  }

  // Handle ISO string timestamp
  // If timestamp doesn't end with 'Z', append it to force UTC parsing
  const utcTimestamp = timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
  const parsed = new Date(utcTimestamp).getTime();

  if (isNaN(parsed)) {
    console.warn("Failed to parse UTC timestamp:", timestamp);
    return 0;
  }

  return parsed;
}

/**
 * Calculate duration between timestamps in milliseconds.
 */
function calculateDuration(start: string | number, end: string | number): number {
  try {
    if (!start || !end) return 0;

    const startTime = parseUTCTimestamp(start);
    const endTime = parseUTCTimestamp(end);

    // Check for invalid dates
    if (startTime === 0 || endTime === 0) {
      console.warn("Invalid timestamp for duration calculation:", { start, end });
      return 0;
    }

    const duration = endTime - startTime;

    // Check for negative or suspiciously large durations
    if (duration < 0 || duration > 1000 * 60 * 60 * 24) {
      console.warn("Suspicious duration calculated:", { start, end, duration });
      return Math.abs(duration);
    }

    return duration;
  } catch (e) {
    console.error("Error calculating duration:", e);
    return 0;
  }
}

/**
 * Capitalize the first character of a user query for display.
 */
export function capitalizeQueryText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Format duration in a human-readable format.
 */
export function formatDuration(ms: number, isInProgress = false): string {
  // Handle invalid or zero durations
  if (!ms || ms <= 0 || isNaN(ms)) return isInProgress ? "Starting..." : "0ms";

  // Use absolute value to avoid negative displays
  const absMs = Math.abs(ms);

  let timeStr: string;
  if (absMs < 1000) {
    timeStr = `${Math.round(absMs)}ms`;
  } else {
    const seconds = Math.floor(absMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
      timeStr = `${seconds}s`;
    } else {
      timeStr = `${minutes}m ${remainingSeconds}s`;
    }
  }

  return isInProgress ? `${timeStr} (running)` : timeStr;
}

/**
 * Parse raw trace data from API into structured format.
 * Handles both old format (direct array) and new format (object with trace array).
 */
export function parseTraceData(raw: RawTraceInput): ParsedTraceData {
  // Handle new API response format: { correlation_id, trace: [...] }
  let traceArray: RawTraceItem[];
  if (raw && typeof raw === "object" && !Array.isArray(raw) && raw.trace) {
    traceArray = raw.trace;
  } else if (Array.isArray(raw)) {
    // Handle old format (direct array)
    traceArray = raw;
  } else {
    return { agents: [], total_duration_ms: 0 };
  }

  if (!Array.isArray(traceArray) || traceArray.length === 0) {
    return { agents: [], total_duration_ms: 0 };
  }

  const agents: ParsedAgentTrace[] = [];
  let final_response: ParsedFinalResponse | undefined;
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;

  traceArray.forEach((item) => {
    // Check if this is the final response object
    if (item.final_response) {
      const fr = item.final_response;

      // Convert Unix timestamps to ISO strings for final response
      const createdAt =
        typeof fr.created_at === "number"
          ? new Date(fr.created_at).toISOString()
          : fr.created_at || "";
      const completedAt =
        typeof fr.completed_at === "number"
          ? new Date(fr.completed_at).toISOString()
          : fr.completed_at || "";

      final_response = {
        content: cleanResponse(fr.content || ""),
        created_at: createdAt,
        completed_at: completedAt,
        status: fr.status || "unknown",
      };
      return;
    }

    // Parse agent execution
    if (item.name) {
      // Handle both Unix timestamps and ISO strings
      const createdAtRaw = item.created_at || new Date().toISOString();
      const completedAtRaw = item.completed_at;

      // Convert Unix timestamps to ISO strings for consistent handling
      const createdAt =
        typeof createdAtRaw === "number" ? new Date(createdAtRaw).toISOString() : createdAtRaw;
      const completedAt =
        typeof completedAtRaw === "number"
          ? new Date(completedAtRaw).toISOString()
          : completedAtRaw;

      const isInProgress = !completedAt || item.status === "processing";

      // Parse timestamp as UTC
      const created = parseUTCTimestamp(createdAtRaw);

      // Only track valid timestamps
      if (created > 0) {
        if (earliestStart === null || created < earliestStart) {
          earliestStart = created;
        }
      }

      // For completed tasks, track end time
      if (completedAt) {
        const completed = parseUTCTimestamp(completedAtRaw as string | number);
        if (completed > 0) {
          if (latestEnd === null || completed > latestEnd) {
            latestEnd = completed;
          }
        }
      }

      // Calculate duration: if in progress, use elapsed time from creation
      let durationMs: number;
      if (isInProgress) {
        durationMs = Date.now() - created;
      } else if (completedAt) {
        durationMs = calculateDuration(createdAtRaw, completedAtRaw as string | number);
      } else {
        durationMs = 0;
      }

      agents.push({
        name: item.name || "unknown",
        query: item.query || "",
        agent_response: cleanResponse(item.agent_response || ""),
        reasoning_content: cleanReasoningContent(item.reasoning_content || ""),
        created_at: createdAt,
        completed_at: completedAt || "",
        status: item.status || "unknown",
        tool_calls: item.tool_calls || [],
        duration_ms: durationMs,
      });
    }
  });

  // Calculate total duration: use latestEnd if available, otherwise use current time
  let total_duration_ms = 0;
  if (earliestStart) {
    if (latestEnd) {
      total_duration_ms = latestEnd - earliestStart;
    } else {
      // If no end time yet (in progress), use elapsed time from start
      total_duration_ms = Date.now() - earliestStart;
    }
  }

  return {
    agents,
    final_response,
    total_duration_ms,
  };
}

/**
 * Capitalizes a word properly for display.
 * Handles special cases like acronyms (WLAN, NOC, etc).
 */
function capitalizeWord(word: string): string {
  const acronyms = ["wlan", "noc", "api", "ip", "os", "vm", "cpu", "ram", "dns"];
  if (acronyms.includes(word.toLowerCase())) {
    return word.toUpperCase();
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Get agent display name from agent key.
 * Capitalizes for UI display only - does not modify original trace data.
 */
export function getAgentDisplayName(agentKey: string): string {
  const nameMap: Record<string, string> = {
    operations_manager_agent: "Operations Manager",
    operations_manager: "Operations Manager",
    wlan_network_specialist: "WLAN Network Specialist",
    wlan_network_agent: "WLAN Network Specialist",
    level1_support: "Level 1 Support",
    hardware_operations: "Hardware Operations",
    systems_admin_os: "OS Operations",
    systems_admin_agent_os: "OS Operations",
    "systems-admin-os": "OS Operations",
    "systems-admin-agent-os": "OS Operations",
    operating_system_management: "OS Operations",
    virtualization_agent: "Virtualization Agent",
    liquid_cooling_agent: "Liquid Cooling Specialist",
    vastai_agent: "NeoCloud Provisioning Agent",
    metrumai_insights_agent: "MetrumAI Insights Agent",
    report_generator: "Report Generator",
  };

  if (nameMap[agentKey]) {
    return nameMap[agentKey];
  }

  // For device-style names (contain digits or look like identifiers),
  // capitalize first letter and keep hyphens as-is.
  if (/\d/.test(agentKey) || agentKey.includes("-")) {
    return agentKey.charAt(0).toUpperCase() + agentKey.slice(1);
  }

  // Convert snake_case to Title Case for agent names
  return agentKey.split("_").map(capitalizeWord).join(" ");
}

/**
 * Get agent color based on agent type.
 */
export function getAgentColor(agentKey: string): string {
  if (agentKey.includes("operations_manager")) return "#3B82F6";
  if (agentKey.includes("wlan")) return "#8B5CF6";
  if (agentKey.includes("noc") || agentKey.includes("level1")) return "#10B981";
  if (agentKey.includes("hardware")) return "#F59E0B";
  if (agentKey.includes("operating")) return "#EF4444";
  if (agentKey.includes("virtualization")) return "#A855F7";
  if (agentKey.includes("liquid_cooling")) return "#06B6D4";
  return "#6B7280";
}
