import { parseSseBuffer } from "./reportSseParser";
import type {
  GenerateReportRequest,
  GenerateReportResponse,
  GenerateStreamEvent,
} from "./reportsApi.types";

/**
 * SSE report-generation client.
 *
 * `POST /reports/generate/stream` doesn't fit RTK Query's request/response
 * model — same reasoning documented in `src/features/sandbox/sandboxStream.ts`
 * and `src/components/QueryTrace/flowStreamApi.ts` for their own SSE
 * endpoints. Kept as a plain function, co-located with `reportsApi.ts`.
 *
 * Ported from the Vite app's `lib/reportApi.ts` `generateReportStream`.
 * **Deviation**: the Vite source resolved its base URL dynamically per
 * request via `getReportApiBase()` (env override, else the most-recently-
 * deployed cluster's `/clusterid-{id}/report-api`, else a dev-proxy
 * fallback) — that cluster-discovery path depends on
 * `utils/deployedTeamsPersistence`, which doesn't exist in this app (it's
 * Phase 11 scope, not yet built) and, per a full-tree check, EVERY other
 * feature's RTK Query API in this app (`sandboxApi`, `kyaiApi`,
 * `digitalTwinApi`, etc.) already resolves to one static proxy path via
 * `createBaseQuery("/some-api")` with no cluster-id logic. This SSE client
 * follows that same established, simpler convention (`REPORT_API_BASE =
 * "/report-api"`, matching `reportsApi.ts`'s `createBaseQuery("/report-api")`)
 * instead of reintroducing cluster-aware routing. Revisit if/when Phase 11
 * lands and some other feature actually needs cluster-scoped API routing.
 */

const REPORT_API_BASE = "/report-api";
const GENERATE_TIMEOUT_MS = 600_000;

export interface GenerateReportStreamOptions {
  onEvent?: (event: GenerateStreamEvent) => void;
  signal?: AbortSignal;
}

/**
 * Generate a report via the SSE streaming endpoint. Emits step/chart
 * progress events while the pipeline runs and resolves with the final PDF
 * payload on `done`.
 */
export async function generateReportStream(
  body: GenerateReportRequest,
  options: GenerateReportStreamOptions = {},
): Promise<GenerateReportResponse> {
  const { onEvent, signal } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(`${REPORT_API_BASE}/reports/generate/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const detail =
        typeof errBody.detail === "string" ? errBody.detail : `Request failed (${res.status})`;
      throw new Error(detail);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("No response body from generate stream");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let result: GenerateReportResponse | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseBuffer(buffer);
      buffer = parsed.remainder;

      for (const event of parsed.events) {
        onEvent?.(event);
        if (event.type === "done") {
          result = event.data as unknown as GenerateReportResponse;
        }
        if (event.type === "error") {
          const step = event.data.step;
          const suffix = step != null ? ` (step ${step})` : "";
          throw new Error(`${event.data.message}${suffix}`);
        }
      }
    }

    if (!result) {
      throw new Error("Report generation ended without a result");
    }
    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Report generation was cancelled or timed out", { cause: err });
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
  }
}
