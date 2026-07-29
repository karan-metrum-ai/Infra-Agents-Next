/**
 * Unified trace content processing pipeline.
 *
 * Single entry point for all markdown/text processing in QueryTrace.
 * Existing helpers in contentFormatter.ts and normalizeReasoningContent.ts
 * are consumed as internal stage implementations.
 */

import {
  formatJSON,
  formatLinksInText,
  formatStructuredAgentResponse,
  normalizeInlineMarkdownStructure,
  repairOrphanBoldMarkers,
  stripEmojis,
  tryFlattenJsonToMarkdown,
  tryParseJSON,
} from "./contentFormatter";
import { normalizeReasoningContent } from "./normalizeReasoningContent";
import { repairMarkdownForDisplay, shouldPreserveMarkdownStructure } from "./repairMarkdownLayout";

/** Render surface that selects which pipeline stages run. */
export type ContentContext =
  | "reasoning"
  | "tool_output"
  | "tool_summary"
  | "final_response"
  | "agent_response"
  | "task_goal"
  | "query_header";

export interface ProcessOptions {
  context: ContentContext;
  streaming?: boolean;
  maxTableRows?: number;
  maxHeadingLevel?: number;
}

export interface ProcessedContent {
  /** Markdown-ready string for MarkdownRenderer. */
  markdown: string;
  /** One-line plain summary for accordion headers / tool rows. */
  plainSummary?: string;
  /** Detected content shape. */
  contentKind: "prose" | "table" | "json" | "list" | "empty";
  /** True when JSON was flattened to markdown. */
  wasFlattened: boolean;
}

/* ─── Profile defaults ─────────────────────────────────────────── */

interface ProfileConfig {
  streamNormalize: boolean;
  jsonFlatten: boolean;
  linkFormat: boolean;
  emojiStrip: boolean;
  maxTableRows: number | null;
  maxHeadingLevel: number | null;
}

const PROFILE_DEFAULTS: Record<ContentContext, ProfileConfig> = {
  reasoning: {
    streamNormalize: true,
    jsonFlatten: false,
    linkFormat: true,
    emojiStrip: true,
    maxTableRows: null,
    maxHeadingLevel: 4,
  },
  tool_output: {
    streamNormalize: true,
    jsonFlatten: true,
    linkFormat: true,
    emojiStrip: true,
    maxTableRows: 10,
    maxHeadingLevel: 4,
  },
  tool_summary: {
    streamNormalize: true,
    jsonFlatten: true,
    linkFormat: false,
    emojiStrip: true,
    maxTableRows: null,
    maxHeadingLevel: null,
  },
  final_response: {
    streamNormalize: true,
    jsonFlatten: true,
    linkFormat: true,
    emojiStrip: true,
    maxTableRows: 20,
    maxHeadingLevel: null,
  },
  agent_response: {
    streamNormalize: true,
    jsonFlatten: true,
    linkFormat: true,
    emojiStrip: true,
    maxTableRows: 15,
    maxHeadingLevel: 3,
  },
  task_goal: {
    streamNormalize: false,
    jsonFlatten: true,
    linkFormat: true,
    emojiStrip: false,
    maxTableRows: null,
    maxHeadingLevel: null,
  },
  query_header: {
    streamNormalize: false,
    jsonFlatten: false,
    linkFormat: true,
    emojiStrip: true,
    maxTableRows: null,
    maxHeadingLevel: null,
  },
};

function resolveProfile(options: ProcessOptions): ProfileConfig {
  const base = PROFILE_DEFAULTS[options.context];
  return {
    ...base,
    maxTableRows: options.maxTableRows ?? base.maxTableRows,
    maxHeadingLevel: options.maxHeadingLevel ?? base.maxHeadingLevel,
  };
}

/* ─── Pipeline stages ──────────────────────────────────────────── */

/** Stage 1: unescape common escape sequences and wrapper quotes. */
function unescapeContent(raw: string): string {
  let processed = raw
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
  processed = processed.replace(/^["']([\s\S]*)["']$/g, "$1");
  return processed;
}

/** Stage 2: collapse token-per-line SSE artifacts. */
function normalizeStreamArtifacts(raw: string, enable: boolean): string {
  if (!enable) return raw;
  return normalizeReasoningContent(raw);
}

/** Stage 3: detect JSON and flatten to readable markdown. */
function detectAndFlattenStructured(
  raw: string,
  enable: boolean,
  streaming: boolean,
): { markdown: string; wasFlattened: boolean; kind: ProcessedContent["contentKind"] } {
  if (!enable) {
    const kind = guessContentKind(raw);
    return { markdown: raw, wasFlattened: false, kind };
  }

  if (streaming) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return {
        markdown: "*Receiving data…*",
        wasFlattened: false,
        kind: "json",
      };
    }
  }

  const parsed = tryParseJSON(raw);
  if (parsed !== null) {
    const flattened = tryFlattenJsonToMarkdown(parsed);
    if (flattened) {
      return {
        markdown: flattened,
        wasFlattened: true,
        kind: "table",
      };
    }
    return {
      markdown: `\`\`\`json\n${formatJSON(parsed)}\n\`\`\``,
      wasFlattened: false,
      kind: "json",
    };
  }

  const kind = guessContentKind(raw);
  return { markdown: raw, wasFlattened: false, kind };
}

/** Stage 4: format links, inline status sections, strip emojis. */
function formatProse(raw: string, linkFormat: boolean, emojiStrip: boolean): string {
  let processed = raw;
  if (emojiStrip) {
    processed = stripEmojis(processed);
  }
  if (!shouldPreserveMarkdownStructure(processed)) {
    processed = formatStructuredAgentResponse(processed);
  }
  if (linkFormat) {
    processed = formatLinksInText(processed);
  }
  return processed;
}

/** Stage 5: cap table rows, clamp headings, collapse blanks. */
function executiveShape(
  raw: string,
  maxTableRows: number | null,
  maxHeadingLevel: number | null,
): string {
  let processed = raw;

  // Cap table rows
  if (maxTableRows !== null) {
    processed = capTableRows(processed, maxTableRows);
  }

  // Clamp heading levels
  if (maxHeadingLevel !== null) {
    processed = clampHeadings(processed, maxHeadingLevel);
  }

  // Collapse 3+ consecutive blank lines to one
  processed = processed.replace(/\n{4,}/g, "\n\n\n");

  return processed;
}

/* ─── Stage helpers ────────────────────────────────────────────── */

function guessContentKind(raw: string): ProcessedContent["contentKind"] {
  const trimmed = raw.trim();
  if (!trimmed) return "empty";
  if (/^\|.*\|/m.test(trimmed) && /^\|[-\s|]+\|/m.test(trimmed)) {
    return "table";
  }
  if (/^(#{1,6}\s|[-*]\s|\d+\.\s)/m.test(trimmed)) {
    return "list";
  }
  return "prose";
}

function capTableRows(markdown: string, maxRows: number): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let inTable = false;
  let tableHeaderSeen = false;
  let rowCount = 0;
  let tableStartIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = line.startsWith("|");

    if (!inTable && isTableLine) {
      inTable = true;
      tableStartIdx = i;
      tableHeaderSeen = false;
      rowCount = 0;
    }

    if (inTable) {
      if (isTableLine) {
        if (!tableHeaderSeen && /^\|[-\s|]+\|/.test(line)) {
          tableHeaderSeen = true;
        } else if (tableHeaderSeen) {
          rowCount++;
          if (rowCount > maxRows) {
            // Skip this row, add ellipsis if first overflow
            if (rowCount === maxRows + 1) {
              const colCount = lines[tableStartIdx].split("|").filter(Boolean).length;
              out.push(`| ${Array(colCount).fill("…").join(" | ")} |`);
            }
            continue;
          }
        }
      } else {
        inTable = false;
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

function clampHeadings(markdown: string, maxLevel: number): string {
  const prefix = "#".repeat(maxLevel);
  return markdown.replace(new RegExp(`^(#{${maxLevel + 1},})\\s`, "gm"), (_match) => `${prefix} `);
}

function generatePlainSummary(
  markdown: string,
  kind: ProcessedContent["contentKind"],
): string | undefined {
  if (kind === "empty") return undefined;

  const trimmed = markdown.trim();
  if (!trimmed) return undefined;

  if (kind === "table") {
    const firstHeading = trimmed.match(/^#{1,6}\s+(.*)$/m);
    if (firstHeading) return firstHeading[1].trim();
    const firstBold = trimmed.match(/\*\*([^*]+)\*\*/);
    if (firstBold) return firstBold[1].trim();
    return "Structured data";
  }

  if (kind === "list") {
    const firstItem = trimmed.match(/^[-*]\s+(.*)$/m);
    if (firstItem) return firstItem[1].trim();
  }

  // Take first sentence or first 80 chars
  const firstSentence = trimmed.match(/^([^.!?]+[.!?])?\s*/);
  if (firstSentence && firstSentence[1]) {
    const s = firstSentence[1].trim();
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }

  const plain = trimmed
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  if (!plain) return undefined;
  return plain.length > 80 ? `${plain.slice(0, 80)}…` : plain;
}

/* ─── Public API ───────────────────────────────────────────────── */

/**
 * Process raw SSE text through the pipeline for a specific render surface.
 *
 * @param raw - The raw string from SSE (may contain escapes, JSON, tokens).
 * @param options - Context profile and optional overrides.
 * @returns Processed markdown-ready content with metadata.
 */
export function processTraceContent(raw: string, options: ProcessOptions): ProcessedContent {
  if (!raw || typeof raw !== "string") {
    return { markdown: "", contentKind: "empty", wasFlattened: false };
  }

  const profile = resolveProfile(options);

  // Stage 1: unescape
  let processed = unescapeContent(raw);

  // Stage 2: normalize streaming artifacts
  processed = normalizeStreamArtifacts(processed, profile.streamNormalize);

  // Stage 2b: repair collapsed tables/headings from completed flows
  if (
    options.context === "agent_response" ||
    options.context === "final_response" ||
    options.context === "task_goal" ||
    options.context === "tool_output"
  ) {
    processed = repairMarkdownForDisplay(processed);
  } else {
    processed = normalizeInlineMarkdownStructure(processed);
    processed = repairOrphanBoldMarkers(processed);
  }

  // Stage 3: detect and flatten structured data
  const flattened = detectAndFlattenStructured(
    processed,
    profile.jsonFlatten,
    options.streaming ?? false,
  );
  processed = flattened.markdown;

  // Stage 4: format prose
  processed = formatProse(processed, profile.linkFormat, profile.emojiStrip);

  // Stage 5: executive shape
  processed = executiveShape(processed, profile.maxTableRows, profile.maxHeadingLevel);

  const kind = flattened.kind === "empty" ? guessContentKind(processed) : flattened.kind;

  return {
    markdown: processed,
    plainSummary: generatePlainSummary(processed, kind),
    contentKind: kind,
    wasFlattened: flattened.wasFlattened,
  };
}
