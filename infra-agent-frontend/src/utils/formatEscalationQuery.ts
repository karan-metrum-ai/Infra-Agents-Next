/**
 * Formats Level 1 Support / agent handoff query walls of text into
 * readable markdown for Execution Plan and TraceHeader display.
 *
 * Display-only — does not change the stored query string.
 *
 * Partial pull-forward ahead of Phase 13 (`utils/formatEscalationQuery.ts`
 * in the source app) — `TraceHeader.tsx`/`PlanApprovalCard.tsx` (Phase 8)
 * need it now; reconcile with the real Phase 13 util port when that
 * phase lands instead of keeping two copies.
 */

/** Maps handoff tag agent keys to UI display names. */
const AGENT_DISPLAY_MAP: Record<string, string> = {
  LEVEL1_SUPPORT: "Level 1 Support",
  LEVEL_1_SUPPORT: "Level 1 Support",
  NOC_ANALYST: "Level 1 Support",
  NOC_ANALYST_AGENT: "Level 1 Support",
  OPERATIONS_MANAGER: "Operations Manager",
  STORAGE_AGENT: "Storage Agent",
  SYSTEMS_ADMIN_HW: "Hardware Operations",
  SYSTEMS_ADMIN_OS: "OS Operations",
  WLAN_NETWORK_AGENT: "WLAN Network Specialist",
  VASTAI_AGENT: "NeoCloud Provisioning Agent",
  METRUMAI_INSIGHTS_AGENT: "MetrumAI Insights Agent",
  LIQUID_COOLING_AGENT: "Liquid Cooling Agent",
  DATABASE_AGENT: "Database Agent",
  VIRTUALIZATION_AGENT: "Virtualization Agent",
};

/** Bracket tags like [FROM_LEVEL1_SUPPORT] or [TO_STORAGE_AGENT]. */
const HANDOFF_TAG_RE = /\[(FROM|TO|BY|VIA)_([A-Z0-9_]+)\]/gi;

/**
 * Section headers commonly used in L1 escalation prose.
 * Capture groups keep optional parenthetical suffixes.
 */
const SECTION_SPLIT_RE =
  /\b(Raw metrics|Evidence(?:\s*\([^)]*\))?|Critical error logs|Error logs|Root [Cc]ause(?:\s*\([^)]*\))?|Recommended [Aa]ctions(?:\s*\([^)]*\))?)\s*:/g;

/** Trailing detail keys often crammed onto one line. */
const DETAIL_KEYS_RE =
  /\b(Signal|Incident(?:\s+number)?|ServiceNow Incident|Recommended action(?!s))\s*:/gi;

/**
 * Humanize an underscored agent key for display.
 */
function humanizeAgentKey(key: string): string {
  const normalized = key.toUpperCase().replace(/-/g, "_");
  if (AGENT_DISPLAY_MAP[normalized]) {
    return AGENT_DISPLAY_MAP[normalized];
  }
  return key
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract unique "From" display names from handoff tags and strip tags.
 */
function extractAndStripTags(text: string): {
  fromLabels: string[];
  body: string;
} {
  const fromLabels: string[] = [];
  const seen = new Set<string>();

  const body = text
    .replace(HANDOFF_TAG_RE, (_match, direction: string, key: string) => {
      if (String(direction).toUpperCase() === "FROM") {
        const label = humanizeAgentKey(key);
        const id = label.toLowerCase();
        if (!seen.has(id)) {
          seen.add(id);
          fromLabels.push(label);
        }
      }
      return " ";
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return { fromLabels, body };
}

/**
 * Whether the body looks like a structured L1 handoff (sections present).
 */
function hasHandoffStructure(body: string): boolean {
  return (
    /\b(Raw metrics|Evidence|Critical error logs|Error logs|Root [Cc]ause|Recommended [Aa]ctions)\s*:/i.test(
      body,
    ) || /\b(Signal|Incident|Recommended action)\s*:/i.test(body)
  );
}

/**
 * Split inline ` - item` runs into markdown bullets.
 */
function toBulletList(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  // Prefer splitting on " - " (space-dash-space) used in L1 prose.
  if (/\s-\s/.test(trimmed)) {
    const parts = trimmed
      .split(/\s-\s/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      // First part may be a short intro before the first dash.
      const firstLooksLikeItem =
        /^(Device|Overall|Temperature|PCIe|Queue|User-reported|Critical|Warning|Info|[A-Za-z_][\w.]*)\s*:/i.test(
          parts[0],
        );
      const items = firstLooksLikeItem ? parts : parts.slice(1);
      const preface = firstLooksLikeItem ? "" : parts[0];
      const bullets = items.map((item) => `- ${item}`).join("\n");
      return preface ? `${preface}\n\n${bullets}` : bullets;
    }
  }

  // Already line-oriented bullets.
  if (/^[-*]\s/m.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

/**
 * Split inline numbered steps `1. ... 2. ...` into a numbered list.
 */
function toNumberedList(block: string): string {
  const trimmed = block.trim();
  if (!trimmed) return "";

  const parts = trimmed
    .split(/(?=\b\d+\.\s)/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1 && /^\d+\.\s/.test(parts[0])) {
    return parts.join("\n");
  }
  if (parts.length > 1 && !/^\d+\.\s/.test(parts[0])) {
    const preface = parts[0];
    const steps = parts.slice(1);
    if (steps.every((s) => /^\d+\.\s/.test(s))) {
      return `${preface}\n\n${steps.join("\n")}`;
    }
  }

  return toBulletList(trimmed);
}

/**
 * Peel a trailing JSON object off the body if present.
 */
function peelTrailingJson(text: string): {
  body: string;
  jsonBlock: string | null;
} {
  const lastBrace = text.lastIndexOf("{");
  if (lastBrace < 0) {
    return { body: text, jsonBlock: null };
  }
  const candidate = text.slice(lastBrace).trim();
  try {
    const parsed: unknown = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") {
      return {
        body: text.slice(0, lastBrace).trim(),
        jsonBlock: `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``,
      };
    }
  } catch {
    return { body: text, jsonBlock: null };
  }
  return { body: text, jsonBlock: null };
}

/**
 * Pull trailing Signal / Incident / Recommended action into a Details section.
 */
function peelDetails(text: string): {
  body: string;
  details: string | null;
} {
  // Find the earliest of the trailing detail keys that looks like a footer.
  const candidates: { index: number; key: string }[] = [];
  DETAIL_KEYS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(DETAIL_KEYS_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    candidates.push({ index: m.index, key: m[1] });
  }
  if (candidates.length === 0) {
    return { body: text, details: null };
  }

  // Prefer the contiguous footer starting at the first of Signal/Incident
  // when they appear late in the string (last 40% or after Recommended actions).
  const start = candidates[0].index;
  const relative = start / Math.max(text.length, 1);
  const before = text.slice(0, start);
  const afterActions = /Recommended [Aa]ctions\b/i.test(before);
  if (relative < 0.45 && !afterActions) {
    const nearEnd = candidates.every((c) => c.index / Math.max(text.length, 1) >= 0.4);
    if (!nearEnd) {
      return { body: text, details: null };
    }
  }

  const footer = text.slice(start).trim();
  const body = text.slice(0, start).trim();

  const lines: string[] = [];
  const keySplit = footer.split(
    /(?=\b(?:Signal|Incident(?:\s+number)?|ServiceNow Incident|Recommended action(?!s))\s*:)/i,
  );
  for (const part of keySplit) {
    const km = part.match(
      /^(Signal|Incident(?:\s+number)?|ServiceNow Incident|Recommended action(?!s))\s*:\s*([\s\S]+)$/i,
    );
    if (km) {
      lines.push(`- **${km[1]}:** ${km[2].trim()}`);
    }
  }

  if (lines.length === 0) {
    return { body: text, details: null };
  }

  return {
    body,
    details: `### Details\n${lines.join("\n")}`,
  };
}

/**
 * Map a section header phrase to a markdown heading.
 */
function sectionHeading(header: string): string {
  const lower = header.toLowerCase();
  if (lower.startsWith("raw metrics") || lower.startsWith("evidence")) {
    return "### Raw Metrics";
  }
  if (lower.includes("error log")) {
    return "### Critical Error Logs";
  }
  if (lower.startsWith("root cause")) {
    return "### Root Cause";
  }
  if (lower.startsWith("recommended action")) {
    return "### Recommended Actions";
  }
  return `### ${header}`;
}

/**
 * Format a single section body based on heading type.
 */
function formatSectionBody(heading: string, content: string): string {
  if (heading === "### Recommended Actions") {
    return toNumberedList(content);
  }
  if (heading === "### Raw Metrics" || heading === "### Critical Error Logs") {
    return toBulletList(content);
  }
  return content.trim();
}

/**
 * Split body on known section markers and rebuild as markdown sections.
 */
function splitIntoSections(body: string): string {
  const markers: { index: number; header: string; endOfHeader: number }[] = [];
  const re = new RegExp(SECTION_SPLIT_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    markers.push({
      index: m.index,
      header: m[1],
      endOfHeader: m.index + m[0].length,
    });
  }

  if (markers.length === 0) {
    return body.trim();
  }

  const parts: string[] = [];
  const summary = body.slice(0, markers[0].index).trim();
  if (summary) {
    parts.push(`### Summary\n${summary}`);
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].endOfHeader;
    const end = i + 1 < markers.length ? markers[i + 1].index : body.length;
    const heading = sectionHeading(markers[i].header);
    const content = formatSectionBody(heading, body.slice(start, end));
    if (content) {
      parts.push(`${heading}\n${content}`);
    }
  }

  return parts.join("\n\n");
}

/**
 * Format an escalation / handoff query for markdown display.
 *
 * Returns lightly cleaned original text when the query is not a
 * structured handoff.
 *
 * Args:
 *   query: Raw query string from plan bundle or flow header.
 *
 * Returns:
 *   Markdown-ready string for MarkdownRenderer.
 */
export function formatEscalationQuery(query: string): string {
  if (!query || typeof query !== "string") {
    return "";
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return "";
  }

  const hasTags = HANDOFF_TAG_RE.test(trimmed);
  HANDOFF_TAG_RE.lastIndex = 0;

  const { fromLabels, body: stripped } = extractAndStripTags(trimmed);
  let working = stripped;

  const looksStructured = hasTags || fromLabels.length > 0 || hasHandoffStructure(working);

  if (!looksStructured) {
    return trimmed;
  }

  const { body: withoutJson, jsonBlock } = peelTrailingJson(working);
  working = withoutJson;

  const { body: withoutDetails, details } = peelDetails(working);
  working = withoutDetails;

  const sections = splitIntoSections(working);

  const chunks: string[] = [];
  if (fromLabels.length > 0) {
    chunks.push(fromLabels.map((label) => `@ **${label}**`).join(" · "));
  }
  if (sections) {
    chunks.push(sections);
  }
  if (details) {
    chunks.push(details);
  }
  if (jsonBlock) {
    chunks.push(jsonBlock);
  }

  return chunks.join("\n\n").trim();
}
