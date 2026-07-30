/**
 * Pure helpers for turning raw tool identifiers into human-readable
 * labels.
 *
 * Raw tool names arrive over SSE as code identifiers in snake_case,
 * kebab-case, or camelCase (e.g. ``create_or_update_servicenow_incident``).
 * The UI must never show the raw identifier as the primary label — it
 * is normalized to Title Case words with known acronyms/brand casing
 * preserved (e.g. ``Create or Update ServiceNow Incident``).
 *
 * Partial pull-forward ahead of Phase 13 (`utils/normalizeToolName.ts(+test)`
 * is on that phase's file list) — needed now by Phase 8's
 * `QueryTrace/blocks/ToolBlock.tsx`, `ThinkingAccordion.tsx`,
 * `InterruptionOverlay.tsx`, and `SubAgentTileDetail.tsx`. Reconcile with
 * Phase 13's full utils sweep instead of keeping two copies.
 */

/**
 * Full tool-name overrides for identifiers that cannot be decomposed
 * by the word-splitter into a readable label (e.g. single-letter
 * commands, non-English abbreviations).
 *
 * Keys are matched against the full lowercased raw identifier before
 * any word splitting occurs. Values are emitted verbatim.
 */
const FULL_NAME_OVERRIDES: Record<string, string> = {
  ls: "List Directory",
  pwd: "Print Working Directory",
  cd: "Change Directory",
  mv: "Move File",
  cp: "Copy File",
  rm: "Remove File",
  cat: "Read File",
};

/**
 * Override map for acronyms and brand casing.
 *
 * Keys are compared in lower-case; values are emitted verbatim.
 * Extend this map as new tools/brands appear — it is the single place
 * to teach the normalizer special casing.
 */
const ACRONYM_OVERRIDES: Record<string, string> = {
  servicenow: "ServiceNow",
  api: "API",
  id: "ID",
  url: "URL",
  uri: "URI",
  sql: "SQL",
  http: "HTTP",
  https: "HTTPS",
  json: "JSON",
  yaml: "YAML",
  html: "HTML",
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  ip: "IP",
  os: "OS",
  vm: "VM",
  db: "DB",
  dns: "DNS",
  ssh: "SSH",
  ssl: "SSL",
  tls: "TLS",
  psu: "PSU",
  cdu: "CDU",
  sla: "SLA",
  mop: "MOP",
  idrac: "iDRAC",
  k8s: "K8s",
  pdf: "PDF",
  csv: "CSV",
};

/**
 * Minor words kept lower-case when they fall in the middle of a label
 * (English title-case convention). The first word is always capitalised.
 */
const MINOR_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
]);

/** Capitalise a single, already-lower-cased word. */
function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Format one token, honouring overrides and minor-word rules. */
function formatToken(token: string, isFirst: boolean): string {
  const lower = token.toLowerCase();
  if (ACRONYM_OVERRIDES[lower]) {
    return ACRONYM_OVERRIDES[lower];
  }
  if (!isFirst && MINOR_WORDS.has(lower)) {
    return lower;
  }
  return capitalize(lower);
}

/**
 * Convert a raw tool identifier to a human-readable Title Case label.
 *
 * Handles snake_case, kebab-case, camelCase, PascalCase, and mixed
 * delimiters. Known acronyms/brands are preserved via
 * `ACRONYM_OVERRIDES`.
 */
export function normalizeToolName(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  const fullMatch = FULL_NAME_OVERRIDES[raw.trim().toLowerCase()];
  if (fullMatch) return fullMatch;

  const withBoundaries = raw
    .trim()
    // Split camelCase / PascalCase boundaries (fooBar -> foo Bar).
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Split acronym followed by a word (HTTPServer -> HTTP Server).
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  const tokens = withBoundaries.split(/[\s_\-.]+/).filter(Boolean);
  if (tokens.length === 0) return "";

  return tokens.map((token, index) => formatToken(token, index === 0)).join(" ");
}
