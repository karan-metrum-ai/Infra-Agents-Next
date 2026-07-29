import { STATUS_DESCRIPTIONS } from "./evaluationModalConstants";
import type { StatusUpdate } from "./EvaluationModal.types";

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining.toFixed(0)}s`;
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Maps a 0-10 LLM score to a semantic status color token. `--accent-500`
 * stands in for the Vite original's literal `#f97316` (a mid-tier
 * "orange between warning and destructive") — the accent scale's hue (55)
 * already renders as amber/orange, so this reuses a real design token
 * instead of a hardcoded hex. */
export function getScoreColor(score: number): string {
  if (score >= 8) return "var(--success)";
  if (score >= 6) return "var(--warning)";
  if (score >= 4) return "var(--accent-500)";
  return "var(--destructive)";
}

function toTitleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatStatusTitle(status: string): string {
  return toTitleCase(status);
}

export function formatStatusDescription(update: StatusUpdate): string {
  let description = STATUS_DESCRIPTIONS[update.status] ?? update.status.replace(/_/g, " ");
  if (update.session_id && update.status.includes("session")) {
    description += ` (ID: ${update.session_id.replace("session_", "")})`;
  }
  return description;
}

/** Title-cases a snake_case score-dimension key (`task_completion` ->
 * `Task Completion`) for the overview/step score breakdowns. */
export function formatDimensionLabel(dimension: string): string {
  return toTitleCase(dimension);
}

/** Best-effort human message out of an RTK Query error shape (or a plain
 * `Error`), matching the pattern already used by `SaveTeamModal`'s
 * `extractErrorMessage`. */
export function extractQueryErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const withData = error as { data?: { detail?: string; message?: string }; error?: string };
    if (withData.data?.detail) return withData.data.detail;
    if (withData.data?.message) return withData.data.message;
    if (withData.error) return withData.error;
  }
  return fallback;
}
