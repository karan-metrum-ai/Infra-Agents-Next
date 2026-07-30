import { getAgentDisplayName } from "../traceDataParser";
import type { SubAgentBlock } from "../blockStream/types";

/** Per-device triage row from L1 structured_data. */
export interface DeviceTriageResult {
  device_id?: string;
  device_name?: string;
  device_category?: string;
  status?: string;
  findings?: string[];
  tool_calls?: Array<{ tool_name: string; status?: string }>;
  duration_ms?: number;
  error?: string;
}

/** Parsed key=value summary from a locked sub-agent block. */
export interface SubAgentSummary {
  status?: string;
  findings?: string;
  tools?: string;
  duration?: string;
}

/** True when content is a per-device triage goal line. */
export function isDeviceTriageGoalContent(content: string): boolean {
  return /^Triage\s+/i.test(content.trim());
}

/**
 * Human-readable label for a parallel sub-agent tile.
 *
 * Device triage goals (``Triage compute device …``) read better than
 * raw device ids; specialists still use agent display names.
 */
export function getSubAgentTileLabel(block: SubAgentBlock): string {
  const content = block.content?.trim() ?? "";
  if (content && !isSubAgentSummaryContent(content)) {
    if (isDeviceTriageGoalContent(content)) {
      return content.charAt(0).toUpperCase() + content.slice(1);
    }
  }
  return getAgentDisplayName(block.agent_name);
}

/** True when content looks like a completion summary, not a goal. */
export function isSubAgentSummaryContent(content: string): boolean {
  const text = content.trim();
  return /status=\w+/i.test(text) && /findings=\d+/i.test(text);
}

/** Parse ``status=warning, findings=11, ...`` completion lines. */
export function parseSubAgentSummary(content: string): SubAgentSummary | null {
  if (!isSubAgentSummaryContent(content)) {
    return null;
  }
  const summary: SubAgentSummary = {};
  const pairs = content.match(/([a-z_]+)=([^,\s]+)/gi) ?? [];
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx <= 0) {
      continue;
    }
    const key = pair.slice(0, idx).toLowerCase();
    const value = pair.slice(idx + 1).trim();
    if (key === "status") {
      summary.status = value;
    } else if (key === "findings") {
      summary.findings = value;
    } else if (key === "tools") {
      summary.tools = value;
    } else if (key === "duration") {
      summary.duration = value;
    }
  }
  return Object.keys(summary).length > 0 ? summary : null;
}

function normalizeDeviceKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Builds a lookup of device triage rows from flow session turns.
 *
 * Scans ``structured_data.device_triage`` on each turn when present.
 */
export function buildDeviceTriageMap(
  flowData: Record<string, unknown> | null | undefined,
): Map<string, DeviceTriageResult> {
  const map = new Map<string, DeviceTriageResult>();
  if (!flowData) {
    return map;
  }

  const sessions = flowData.sessions as Array<Record<string, unknown>> | undefined;
  if (!sessions) {
    return map;
  }

  for (const session of sessions) {
    const turns = session.turns as Array<Record<string, unknown>> | undefined;
    if (!turns) {
      continue;
    }
    for (const turn of turns) {
      const raw = turn.structured_data;
      if (!raw) {
        continue;
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
      } catch {
        continue;
      }
      const results = parsed.device_triage;
      if (!Array.isArray(results)) {
        continue;
      }
      for (const item of results) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const row = item as DeviceTriageResult;
        const keys = [row.device_id, row.device_name].filter(Boolean) as string[];
        for (const key of keys) {
          map.set(normalizeDeviceKey(key), row);
        }
      }
    }
  }

  return map;
}

/** Resolve a device triage row for a sub-agent block. */
export function lookupDeviceTriage(
  map: Map<string, DeviceTriageResult>,
  agentName: string,
): DeviceTriageResult | null {
  const key = normalizeDeviceKey(agentName);
  return map.get(key) ?? null;
}
