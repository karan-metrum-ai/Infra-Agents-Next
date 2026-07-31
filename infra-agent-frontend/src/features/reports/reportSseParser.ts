import type { GenerateStreamEvent } from "./reportsApi.types";

/**
 * SSE frame parser for report generation streaming.
 *
 * Pure, framework-free — ported verbatim from the Vite app's
 * `lib/reportSseParser.ts`. `GenerateStreamEvent` itself now lives in
 * `reportsApi.types.ts` (the feature's one canonical type home) rather
 * than being declared here.
 *
 * Parse complete SSE blocks from a text buffer, returning parsed events
 * and any trailing incomplete block for the next chunk.
 */
export function parseSseBuffer(buffer: string): {
  events: GenerateStreamEvent[];
  remainder: string;
} {
  const events: GenerateStreamEvent[] = [];
  const parts = buffer.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const block of parts) {
    const trimmed = block.trim();
    if (!trimmed) {
      continue;
    }

    let eventType = "message";
    let dataLine = "";
    for (const line of trimmed.split("\n")) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataLine = line.slice(6);
      }
    }

    if (!dataLine) {
      continue;
    }

    try {
      const data = JSON.parse(dataLine) as Record<string, unknown>;
      events.push({ type: eventType, data } as GenerateStreamEvent);
    } catch {
      /* skip malformed frames */
    }
  }

  return { events, remainder };
}
