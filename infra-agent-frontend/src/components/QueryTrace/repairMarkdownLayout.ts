/**
 * Repairs markdown layout for completed-flow REST snapshots.
 *
 * Specialist responses often arrive as one collapsed line or with tables
 * jammed into prose. This module restores block boundaries so remark-gfm
 * can render headings, lists, and tables the same way as live SSE blocks.
 *
 * Pulled forward from Vite's `utils/repairMarkdownLayout.ts` — a hard
 * dependency of `traceContentPipeline.ts` (this Phase 8 slice).
 */

import { normalizeInlineMarkdownStructure, repairOrphanBoldMarkers } from "./contentFormatter";

const GFM_TABLE_SEPARATOR_RE = /^\s*\|[\s\-:|]+\|\s*$/;
const GFM_TABLE_DATA_ROW_RE = /^\s*\|[^|\n]+(?:\|[^|\n]+){1,}\|\s*$/;

/** True when the text already contains a GitHub-flavored markdown table. */
export function hasGfmTable(text: string): boolean {
  if (!text) {
    return false;
  }
  const lines = text.split("\n").map((line) => line.trim());
  let sawHeader = false;
  let sawSeparator = false;
  let dataRows = 0;

  for (const line of lines) {
    if (!line.startsWith("|")) {
      continue;
    }
    if (GFM_TABLE_SEPARATOR_RE.test(line)) {
      sawSeparator = true;
      continue;
    }
    if (GFM_TABLE_DATA_ROW_RE.test(line)) {
      if (!sawSeparator && !sawHeader) {
        sawHeader = true;
      } else {
        dataRows += 1;
      }
    }
  }

  if (sawHeader && sawSeparator) {
    return true;
  }
  return dataRows >= 1 && (sawHeader || sawSeparator);
}

/** Minimum pipe count before treating a segment as a collapsed table. */
const COLLAPSED_TABLE_PIPE_THRESHOLD = 6;

/**
 * True when the payload already looks like intentional markdown structure.
 *
 * In those cases we must not run ``formatStructuredAgentResponse``, which
 * converts ``**Label**: a, b`` patterns into chip-style lists and breaks
 * specialist tables.
 */
export function shouldPreserveMarkdownStructure(text: string): boolean {
  if (!text?.trim()) {
    return false;
  }
  if (hasGfmTable(text)) {
    return true;
  }
  if (/^#{1,6}\s/m.test(text)) {
    return true;
  }
  const pipeCount = (text.match(/\|/g) || []).length;
  if (pipeCount >= 8) {
    return true;
  }
  if (text.includes("||") && pipeCount >= COLLAPSED_TABLE_PIPE_THRESHOLD) {
    return true;
  }
  return false;
}

/**
 * Insert blank lines before block elements that CommonMark requires to be
 * separated from preceding prose.
 */
export function ensureMarkdownBlockSpacing(text: string): string {
  if (!text) {
    return text;
  }

  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const prev = out[out.length - 1]?.trim() ?? "";

    const needsGap =
      prev &&
      prev !== "" &&
      (/^#{1,6}\s/.test(trimmed) ||
        (trimmed.startsWith("|") && !prev.startsWith("|")) ||
        (/^[-*]\s/.test(trimmed) && !/^[-*]\s/.test(prev) && !prev.endsWith(":")));

    if (needsGap && out[out.length - 1] !== "") {
      out.push("");
    }
    out.push(line);
  }

  return out.join("\n");
}

function countPipes(value: string): number {
  return (value.match(/\|/g) || []).length;
}

function isPipeHeavySegment(value: string): boolean {
  return countPipes(value) >= COLLAPSED_TABLE_PIPE_THRESHOLD;
}

/**
 * Split rows that were joined with double pipes (``||``) instead of newlines.
 *
 * LLM tables often arrive as
 * ``| A | B | |---|---|| 1 | x | y || 2 | z | w |`` on one line.
 */
export function repairDoublePipeTableRows(text: string): string {
  if (!text?.includes("||")) {
    return text;
  }

  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    if (!line.includes("||") || !isPipeHeavySegment(line)) {
      out.push(line);
      continue;
    }

    const expanded = line.replace(/\|\|\s*/g, "\n| ");
    out.push(...expanded.split("\n"));
  }

  return out.join("\n");
}

function isTableSeparatorRow(value: string): boolean {
  const inner = value.replace(/\|/g, "").trim();
  return inner.length > 0 && /^[\s\-:|]+$/.test(inner);
}

function isCompleteTableRow(value: string): boolean {
  return value.trim().startsWith("|") && countPipes(value) >= 3 && !isTableSeparatorRow(value);
}

function closeTableRow(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("|")) {
    return value;
  }
  if (trimmed.endsWith("|")) {
    return trimmed;
  }
  return `${trimmed} |`;
}

function normalizeSeparatorRow(value: string, columnCount: number): string {
  const cells = value
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  const cols = Math.max(columnCount, cells.length, 1);
  return `| ${Array(cols).fill("---").join(" | ")} |`;
}

function looksLikeTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && countPipes(line) >= 3;
}

function splitProseFromInlineTable(line: string): string {
  if (!line.includes("|") || isPipeHeavySegment(line) || looksLikeTableLine(line)) {
    return line;
  }

  let updated = line.replace(/([.!?;:])\s+(\|[^|\n]+(?:\|[^|\n]+){2,}\|)/g, "$1\n\n$2");

  updated = updated.replace(
    /(\S)\s+(\|[^|\n]+(?:\|[^|\n]+){2,}\|)/g,
    (match, before: string, row: string) => {
      if (before === "|" || before.endsWith("|")) {
        return match;
      }
      return `${before}\n${row}`;
    },
  );

  return updated;
}

function splitJammedTableSegments(line: string): string {
  if (!line.includes("|")) {
    return line;
  }

  let updated = line;

  updated = updated.replace(/(\|[^|\n]+\|)\s+(\|[\s\-:|]+\|)/g, "$1\n$2");

  updated = updated.replace(/(\|[^|\n]+\|)\s+(\|[\s\-:|]+)(?=\s*\|)/g, "$1\n$2 |");

  updated = updated.replace(/(\|[\s\-:|]+\|)\s*(\|[^|\n]+\|)/g, "$1\n$2");

  updated = updated.replace(
    /(\|[^|\n]+\|)\s+(\|[^|\n]+\|)/g,
    (match, left: string, right: string) => {
      if (!isCompleteTableRow(left) || !isCompleteTableRow(right)) {
        return match;
      }
      if (isTableSeparatorRow(left)) {
        return match;
      }
      if (isTableSeparatorRow(right)) {
        return `${left}\n${right}`;
      }
      return match;
    },
  );

  return updated;
}

/**
 * Normalize header, separator, and body rows that share one physical line.
 */
export function repairInlineTableRows(text: string): string {
  if (!text?.includes("|")) {
    return text;
  }

  const lines = text.split("\n").map((line) => {
    let updated = splitProseFromInlineTable(line);
    if (isPipeHeavySegment(updated) || updated.includes("||") || looksLikeTableLine(updated)) {
      updated = splitJammedTableSegments(updated);
    }
    return updated;
  });

  const normalized: string[] = [];

  for (const line of lines.join("\n").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.includes("|")) {
      normalized.push(line);
      continue;
    }

    if (isTableSeparatorRow(trimmed)) {
      const prev = normalized
        .map((entry) => entry.trim())
        .reverse()
        .find((entry) => entry.startsWith("|") && !isTableSeparatorRow(entry));
      const columnCount = prev ? Math.max(countPipes(prev) - 1, 1) : 1;
      normalized.push(normalizeSeparatorRow(trimmed, columnCount));
      continue;
    }

    if (trimmed.startsWith("|")) {
      normalized.push(closeTableRow(trimmed));
      continue;
    }

    normalized.push(line);
  }

  return normalized.join("\n");
}

const KEY_VALUE_PAIR_RE = /([a-z_][a-z0-9_]*)\s*=\s*([^,\s]+)/gi;

function humanizeKeyLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseKeyValueLine(line: string): Record<string, string> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("|") || /^#{1,6}\s/.test(trimmed)) {
    return null;
  }

  const pairs = [...trimmed.matchAll(KEY_VALUE_PAIR_RE)];
  if (pairs.length < 2) {
    return null;
  }

  const row: Record<string, string> = {};
  for (const [, key, value] of pairs) {
    row[key.toLowerCase()] = value;
  }
  return row;
}

function keyValueRowsToTable(rows: Record<string, string>[]): string {
  const keys = [
    ...rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        set.add(key);
      }
      return set;
    }, new Set<string>()),
  ];

  const header = `| ${keys.map(humanizeKeyLabel).join(" | ")} |`;
  const separator = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${keys.map((key) => (row[key] ?? "—").replace(/\|/g, "\\|")).join(" | ")} |`)
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

/**
 * Collapse consecutive ``key=value`` diagnostic lines into one GFM table.
 *
 * Example:
 *   status=warning, findings=2, tools=0, duration=15773ms
 *   status=critical, findings=1, tools=0, duration=15682ms
 */
export function formatKeyValueRunBlocks(text: string): string {
  if (!text?.includes("=")) {
    return text;
  }

  const lines = text.split("\n");
  const out: string[] = [];
  let run: Record<string, string>[] = [];

  const flushRun = () => {
    if (run.length === 0) {
      return;
    }
    if (run.length === 1) {
      const row = run[0];
      out.push(
        Object.entries(row)
          .map(([key, value]) => `**${humanizeKeyLabel(key)}:** ${value}`)
          .join(" · "),
      );
    } else {
      out.push(keyValueRowsToTable(run));
    }
    run = [];
  };

  for (const line of lines) {
    const parsed = parseKeyValueLine(line);
    if (parsed) {
      run.push(parsed);
      continue;
    }
    flushRun();
    out.push(line);
  }

  flushRun();
  return out.join("\n");
}

/**
 * Split collapsed specialist markdown into proper block boundaries.
 */
export function repairCollapsedMarkdown(text: string): string {
  if (!text?.trim()) {
    return text;
  }

  let result = text.trim();

  result = result.replace(/\s+(#{1,6}\s+)/g, "\n\n$1");
  result = repairDoublePipeTableRows(result);
  result = repairInlineTableRows(result);
  result = result.replace(/([.!?])\s+(-\s+(?=[A-Za-z0-9*]))/g, "$1\n\n$2");

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Full markdown layout repair used before rendering completed-flow text.
 */
export function repairMarkdownForDisplay(text: string): string {
  if (!text?.trim()) {
    return text;
  }

  let repaired = repairCollapsedMarkdown(text);
  repaired = normalizeInlineMarkdownStructure(repaired);
  repaired = repairOrphanBoldMarkers(repaired);
  repaired = formatKeyValueRunBlocks(repaired);
  repaired = ensureMarkdownBlockSpacing(repaired);
  return repaired.trim();
}
