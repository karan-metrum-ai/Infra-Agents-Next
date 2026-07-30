/**
 * Utilities for formatting and detecting content types (JSON, URLs, etc.)
 * for proper rendering in the UI.
 *
 * Pulled forward from Vite's `utils/contentFormatter.ts` — a hard
 * dependency of `traceContentPipeline.ts` (this Phase 8 slice).
 */

/**
 * Detects if a string is valid JSON and attempts to parse it.
 * Returns the parsed object or null if not valid JSON.
 */
export function tryParseJSON(str: string): unknown | null {
  if (!str || typeof str !== "string") return null;

  const trimmed = str.trim();

  // Must start with { or [ to be considered JSON
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Formats a JSON object into a pretty-printed string.
 */
export function formatJSON(obj: unknown, indent = 2): string {
  try {
    return JSON.stringify(obj, null, indent);
  } catch {
    return String(obj);
  }
}

/**
 * Detects if content is JSON and formats it for markdown code block.
 * Returns markdown-formatted string or original content.
 */
export function formatJSONForMarkdown(content: string): string {
  if (!content || typeof content !== "string") return content;

  const trimmed = content.trim();

  // Try to parse as JSON
  const parsed = tryParseJSON(trimmed);
  if (parsed !== null) {
    // Format as JSON code block
    const formatted = formatJSON(parsed);
    return `\`\`\`json\n${formatted}\n\`\`\``;
  }

  // Check if it's already a JSON code block
  if (trimmed.startsWith("```json") || trimmed.startsWith("```JSON")) {
    return trimmed;
  }

  return content;
}

/**
 * Detects URLs in text and converts them to markdown links.
 * Handles:
 * - "URL:" or "URL :" followed by a URL → [Link](url)
 * - "link" or "Link" followed by a URL → [Link](url)
 * - Plain URLs → [url](url)
 * - Relative report/download paths → [Download](path)
 */
export function formatLinksInText(text: string): string {
  if (!text || typeof text !== "string") return text;

  let formatted = text.replace(
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/[^\s)\]"']+)/gi,
    "$1",
  );

  // Pattern 1: "URL:" or "URL :" followed by a URL
  // Match: "URL: https://..." or "URL : https://..."
  const urlLabelPattern = /(?:^|\s)(URL)\s*:\s*(https?:\/\/[^\s)\]]+)/gi;
  formatted = formatted.replace(urlLabelPattern, (_match, label, url) => {
    // Replace with markdown link showing "Link" as the text
    return ` ${label}: [Link](${url})`;
  });

  // Pattern 2: "link" or "Link" followed by whitespace and a URL
  // Match: "link https://..." or "Link https://..."
  const linkPattern = /(?:^|\s)(link|Link)\s+(https?:\/\/[^\s)\]]+)/gi;
  formatted = formatted.replace(linkPattern, (_match, _linkText, url) => {
    // Replace with markdown link showing "Link" as the text
    return ` [Link](${url})`;
  });

  // Pattern 3: App-relative report and cluster paths.
  const relativePathPattern = /(?:^|\s)(\/(?:clusterid-\d+|reports)\/[^\s)\]]+)/g;
  formatted = formatted.replace(relativePathPattern, (fullMatch, path: string, offset: number) => {
    const beforeMatch = formatted.substring(0, offset);
    const lastOpenBracket = beforeMatch.lastIndexOf("[");
    const lastCloseBracket = beforeMatch.lastIndexOf("]");
    const lastOpenParen = beforeMatch.lastIndexOf("(");
    if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastOpenParen) {
      return fullMatch;
    }
    const prefix = fullMatch.startsWith(" ") ? " " : "";
    const fileName = path.split("/").filter(Boolean).pop() ?? "Link";
    return `${prefix}[${fileName}](${path})`;
  });

  // Pattern 4: Plain URLs that aren't already in markdown links
  // Use a more robust check to avoid double-wrapping
  const urlPattern = /(https?:\/\/[^\s)\]]+)/g;
  formatted = formatted.replace(urlPattern, (fullMatch, url, offset) => {
    // Check if this URL is already inside a markdown link
    const beforeMatch = formatted.substring(0, offset);
    const afterMatch = formatted.substring(offset);

    // Check if we're inside [text](url) pattern
    const lastOpenBracket = beforeMatch.lastIndexOf("[");
    const lastCloseBracket = beforeMatch.lastIndexOf("]");
    const lastOpenParen = beforeMatch.lastIndexOf("(");
    const lastCloseParen = beforeMatch.lastIndexOf(")");

    // If we're between [ and ] or between ( and ), skip
    if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastOpenParen) {
      return fullMatch; // Already in a link
    }
    if (lastOpenParen > lastCloseParen && lastOpenParen > lastOpenBracket) {
      return fullMatch; // Already in a link URL
    }

    // Check if the URL is already wrapped in markdown link syntax
    if (afterMatch.startsWith("](") || beforeMatch.endsWith("](")) {
      return fullMatch;
    }

    // Wrap in markdown link (show URL as text for plain URLs)
    return `[${url}](${url})`;
  });

  const downloadPathPattern =
    /(?:^|\s)(\/[^\s)\]"']+\.(?:pdf|csv|xlsx?|json|zip|txt|tar|gz))(?!\()/gi;
  formatted = formatted.replace(downloadPathPattern, (fullMatch, path: string, offset: number) => {
    const beforeMatch = formatted.substring(0, offset);
    const lastOpenBracket = beforeMatch.lastIndexOf("[");
    const lastCloseBracket = beforeMatch.lastIndexOf("]");
    const lastOpenParen = beforeMatch.lastIndexOf("(");
    const lastCloseParen = beforeMatch.lastIndexOf(")");

    if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastOpenParen) {
      return fullMatch;
    }
    if (lastOpenParen > lastCloseParen && lastOpenParen > lastOpenBracket) {
      return fullMatch;
    }

    const leadingWhitespace = fullMatch.slice(0, fullMatch.length - path.length);
    const fileName = path.split("/").pop() ?? "Download";
    return `${leadingWhitespace}[${fileName}](${path})`;
  });

  return formatted;
}

/**
 * Strips emoji characters from text, preserving all other content.
 * Covers emoticons, dingbats, symbols, flags, and modifier sequences.
 */
export function stripEmojis(text: string): string {
  // Each \u{} entry in the class below is an independent codepoint (or
  // codepoint range) to strip, not a combined grapheme — the class matches
  // them individually.
  const EMOJI_RE =
    // eslint-disable-next-line no-misleading-character-class -- each \u{} entry is an independent codepoint/range to strip, not a combined grapheme; the class matches them individually, not as a joined sequence.
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  return text.replace(EMOJI_RE, "");
}

/** Converts snake_case / camelCase keys into title labels. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return formatJSON(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayToMarkdownTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const keys = Object.keys(rows[0]);
  const header = `| ${keys.map(humanizeKey).join(" | ")} |`;
  const separator = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) => `| ${keys.map((key) => formatScalar(row[key]).replace(/\|/g, "\\|")).join(" | ")} |`,
    )
    .join("\n");
  return `${header}\n${separator}\n${body}`;
}

function appendStatusSection(lines: string[], label: string, items: unknown[]): void {
  lines.push(`#### ${label}`, "");
  for (const item of items) {
    if (typeof item === "string") {
      lines.push(`- \`${item}\``);
      continue;
    }
    if (isPlainObject(item)) {
      const name = item.name ?? item.device ?? item.hostname ?? item.id;
      if (typeof name === "string") {
        lines.push(`- \`${name}\``);
        continue;
      }
    }
    lines.push(`- ${formatScalar(item)}`);
  }
  lines.push("");
}

/**
 * Flattens common agent JSON payloads into readable markdown sections.
 *
 * Returns null when the payload should fall back to a JSON code block.
 */
export function tryFlattenJsonToMarkdown(value: unknown): string | null {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every(isPlainObject)) {
      return arrayToMarkdownTable(value as Record<string, unknown>[]);
    }
    if (value.every((item) => typeof item === "string")) {
      return (value as string[]).map((item) => `- \`${item}\``).join("\n");
    }
    return null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const entries = Object.entries(value);
  const arrayEntries = entries.filter(([, entryValue]) => Array.isArray(entryValue));

  if (arrayEntries.length === entries.length && entries.length > 0) {
    const lines: string[] = [];
    for (const [key, items] of arrayEntries) {
      appendStatusSection(lines, humanizeKey(key), items as unknown[]);
    }
    return lines.join("\n").trim();
  }

  if (Array.isArray(value.devices)) {
    const devices = value.devices.filter(isPlainObject);
    if (devices.length > 0) {
      const lines: string[] = [];
      const cluster = value.cluster ?? value.cluster_id ?? value.clusterId;
      if (cluster !== undefined) {
        lines.push(`### Cluster ${formatScalar(cluster)}`, "");
      }
      const total = value.total ?? value.total_devices ?? value.totalDevices;
      if (total !== undefined) {
        lines.push(`**Total devices:** ${formatScalar(total)}`, "");
      }

      const grouped = new Map<string, string[]>();
      for (const device of devices) {
        const status = String(device.status ?? "unknown");
        const name = String(device.name ?? device.device ?? device.hostname ?? "unknown");
        const bucket = grouped.get(status) ?? [];
        bucket.push(name);
        grouped.set(status, bucket);
      }

      for (const [status, names] of grouped) {
        appendStatusSection(lines, `${humanizeKey(status)} Status`, names);
      }
      return lines.join("\n").trim();
    }
  }

  const statusKeys = ["ok", "critical", "warning", "healthy", "failed", "degraded"];
  const presentStatusKeys = statusKeys.filter((key) => Array.isArray(value[key]));
  if (presentStatusKeys.length >= 2) {
    const lines: string[] = [];
    const cluster = value.cluster ?? value.cluster_id ?? value.clusterId;
    if (cluster !== undefined) {
      lines.push(`### Cluster ${formatScalar(cluster)}`, "");
    }
    const total = value.total ?? value.total_devices ?? value.totalDevices;
    if (total !== undefined) {
      lines.push(`**Total devices:** ${formatScalar(total)}`, "");
    }
    for (const key of presentStatusKeys) {
      appendStatusSection(lines, `${humanizeKey(key)} Status`, value[key] as unknown[]);
    }
    return lines.join("\n").trim();
  }

  return null;
}

const INLINE_STATUS_SECTION_RE = /\*\*([^*]+)\*\*:\s*([^*]+?)(?=\.\s*\*\*|\.\s*$|$)/g;

/**
 * Converts dense inline status summaries into sectioned markdown lists.
 *
 * Example:
 *   Cluster 4001 has 11 devices: **OK Status**: a, b. **Critical**: c
 */
export function formatStructuredAgentResponse(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return content;
  }

  // Specialist REST responses with headings/tables must stay intact.
  if (/^#{1,6}\s/m.test(trimmed) || (trimmed.match(/\|/g) || []).length >= 8) {
    return content;
  }

  const matches = [...trimmed.matchAll(INLINE_STATUS_SECTION_RE)];
  if (matches.length === 0) {
    return content;
  }

  const firstBoldIndex = trimmed.indexOf("**");
  let intro = firstBoldIndex > 0 ? trimmed.slice(0, firstBoldIndex).trim() : "";
  intro = intro.replace(/\.\s*$/, "");

  const lines: string[] = [];
  if (intro) {
    lines.push(`### ${intro}`, "");
  }

  for (const match of matches) {
    const label = match[1].trim();
    const rawItems = match[2].trim().replace(/\.\s*$/, "");
    appendStatusSection(lines, label, rawItems.split(/,\s*/).filter(Boolean));
  }

  return lines.join("\n").trim();
}

/**
 * Inserts line breaks before inline markdown block markers.
 *
 * Agent goals often arrive as one long line such as
 * ``## Title ### 1. Section **bold** text. - bullet`` which
 * CommonMark will not parse unless each block starts on its own line.
 */
export function normalizeInlineMarkdownStructure(content: string): string {
  if (!content || typeof content !== "string") {
    return content;
  }

  let text = content.trim();

  text = text.replace(/\s+•\s+/g, "\n- ");
  text = text.replace(/^•\s+/gm, "- ");

  text = text.replace(/\s+(#{1,6}\s+)/g, "\n\n$1");

  text = text.replace(/([.!?])\s+(\d+\.\s+[A-Za-z0-9*])/g, "$1\n\n$2");
  text = text.replace(/(\*\*[^*]+\*\*)\s*(\d+\.\s+)/g, "$1\n\n$2");

  text = text.replace(/([.!?;:])\s+(-\s+(?=[A-Za-z0-9*]))/g, "$1\n\n$2");

  text = text
    .split("\n")
    .map((line) => {
      if (line.includes("|")) {
        return line;
      }
      return line.replace(/\s+(-{3,}|\*{3,}|_{3,})\s+/g, "\n\n$1\n\n");
    })
    .join("\n");

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Repairs common LLM bold-marker mistakes so literal ``**`` does not
 * leak into rendered specialist-agent responses.
 */
export function repairOrphanBoldMarkers(content: string): string {
  if (!content || typeof content !== "string") {
    return content;
  }

  let text = content;

  // Faux dividers: lines that contain only asterisks.
  text = text.replace(/^\s*\*{2,}\s*$/gm, "");

  // "1. Section Title**" → "1. **Section Title**"
  text = text.replace(/^(\d+\.\s+)([^*\n]+?)\*\*\s*$/gm, "$1**$2**");

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Preprocesses content before markdown rendering:
 * - Strips emojis
 * - Detects and formats JSON
 * - Converts URLs to markdown links
 * - Handles escaped strings
 */
export function preprocessContent(content: string): string {
  if (!content || typeof content !== "string") return content;

  // First, unescape common escape sequences
  let processed = content
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");

  // Remove leading/trailing quotes if they wrap the entire string
  processed = processed.replace(/^["']([\s\S]*)["']$/g, "$1");

  processed = normalizeInlineMarkdownStructure(processed);
  processed = repairOrphanBoldMarkers(processed);

  // Strip emojis
  processed = stripEmojis(processed);

  // Try to detect JSON first (before link formatting)
  const jsonParsed = tryParseJSON(processed);
  if (jsonParsed !== null) {
    const flattened = tryFlattenJsonToMarkdown(jsonParsed);
    if (flattened) {
      return flattened;
    }
    return `\`\`\`json\n${formatJSON(jsonParsed)}\n\`\`\``;
  }

  processed = formatStructuredAgentResponse(processed);

  // Format links in the text
  processed = formatLinksInText(processed);

  return processed;
}
