/**
 * Normalizes reasoning text that arrived as per-token SSE deltas.
 *
 * Streaming often inserts a newline after each token, which makes
 * markdown render one word per line. Snapshots can also append the
 * full sentence afterward — this helper collapses those artifacts
 * and drops near-duplicate paragraphs.
 */

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isTokenLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !/\s/.test(trimmed) && trimmed.length <= 48;
}

function joinTokenLines(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function normalizeSection(section: string): string {
  const trimmed = section.trim();
  if (!trimmed) return "";

  const lines = trimmed.split("\n").map((line) => line.trim());
  const nonEmpty = lines.filter(Boolean);
  if (nonEmpty.length < 3) {
    return trimmed;
  }

  const tokenLines = nonEmpty.filter(isTokenLine).length;
  if (tokenLines / nonEmpty.length >= 0.6) {
    return joinTokenLines(nonEmpty);
  }

  return trimmed;
}

function dedupeParagraphs(paragraphs: string[]): string[] {
  const kept: string[] = [];

  for (const paragraph of paragraphs) {
    const compact = compactText(paragraph);
    if (!compact) continue;

    const dupIdx = kept.findIndex((existing) => {
      const existingCompact = compactText(existing);
      if (existingCompact === compact) return true;
      const shorter = existingCompact.length <= compact.length ? existingCompact : compact;
      const longer = existingCompact.length > compact.length ? existingCompact : compact;
      if (shorter.length >= 12 && longer.startsWith(shorter)) {
        return true;
      }
      if (existingCompact.length < 24 || compact.length < 24) {
        return false;
      }
      return existingCompact.includes(compact) || compact.includes(existingCompact);
    });

    if (dupIdx >= 0) {
      if (paragraph.length > kept[dupIdx].length) {
        kept[dupIdx] = paragraph;
      }
      continue;
    }

    kept.push(paragraph);
  }

  return kept;
}

/**
 * Collapses per-token newlines and removes duplicate reasoning prose.
 */
export function normalizeReasoningContent(raw: string): string {
  if (!raw) return "";

  const lines = raw.split("\n").map((line) => line.trim());

  const firstProseIdx = lines.findIndex((line) => line.length >= 32 && /\s/.test(line));

  if (firstProseIdx > 2) {
    const prefix = lines.slice(0, firstProseIdx).filter(Boolean);
    const suffix = lines.slice(firstProseIdx).join("\n").trim();
    const prefixTokenish =
      prefix.length >= 3 && prefix.filter(isTokenLine).length / prefix.length >= 0.6;

    if (prefixTokenish) {
      const merged = [joinTokenLines(prefix), suffix].filter(Boolean).join("\n\n");
      return dedupeParagraphs(
        merged
          .split(/\n{2,}/)
          .map(normalizeSection)
          .filter(Boolean),
      ).join("\n\n");
    }
  }

  const nonEmpty = lines.filter(Boolean);
  if (nonEmpty.length >= 5) {
    const tokenLines = nonEmpty.filter(isTokenLine).length;
    if (tokenLines / nonEmpty.length >= 0.65) {
      return joinTokenLines(nonEmpty);
    }
  }

  const sections = raw
    .split(/\n{2,}/)
    .map(normalizeSection)
    .filter(Boolean);
  return dedupeParagraphs(sections).join("\n\n");
}
