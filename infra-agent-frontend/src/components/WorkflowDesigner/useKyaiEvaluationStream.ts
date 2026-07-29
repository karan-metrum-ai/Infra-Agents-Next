"use client";

import { useCallback, useState } from "react";
import { useLazyGetTrajectoryParserQuery } from "@/features/kyai/kyaiApi";
import type { RawTrajectoryPayload } from "@/features/kyai/kyaiApi.types";
import type { StatusUpdate } from "./EvaluationModal.types";

export interface UseKyaiEvaluationStreamResult {
  statusUpdates: StatusUpdate[];
  isStreaming: boolean;
  streamError: string | null;
  /** Raw trajectory payload fetched once the stream reports
   * `evaluation_complete`; feed this into `useGetTrajectoryMermaidQuery` as
   * a dependent query. */
  rawTrajectory: RawTrajectoryPayload | null;
  startEvaluation: (teamId: string, prompt: string) => void;
  reset: () => void;
}

/**
 * Drives the live KYAI evaluation SSE stream (`POST /kyai/evaluate`).
 *
 * Deliberately NOT RTK Query — see `kyaiApi.ts`'s doc comment: a streaming
 * `ReadableStream` read (arbitrary number of `data: ` lines over an
 * unbounded duration) doesn't fit RTK Query's single request/response
 * model, so this hook owns the raw `fetch` + manual chunk-decode loop
 * directly, the same way `useFlowStream.ts` does for Phase 8's trace
 * stream.
 *
 * Once a `data.status === 'evaluation_complete'` event carries a
 * `session_id`, this hook imperatively triggers the real
 * `getTrajectoryParser` RTK Query endpoint (`useLazyGetTrajectoryParserQuery`)
 * to fetch the raw trajectory payload — imperative because "the SSE stream
 * just told us this happened" isn't expressible as a declarative `skip`
 * condition the way `getKyaiEvaluation`/`getTrajectoryMermaid` are.
 *
 * Zero direct `useEffect` calls (see `.cursor/skills/sans-effect`):
 * `startEvaluation` is a plain event-handler-triggered async function
 * (Pattern 3), not an effect reacting to state.
 */
export function useKyaiEvaluationStream(): UseKyaiEvaluationStreamResult {
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [rawTrajectory, setRawTrajectory] = useState<RawTrajectoryPayload | null>(null);
  const [triggerTrajectoryParser] = useLazyGetTrajectoryParserQuery();

  const reset = useCallback(() => {
    setStatusUpdates([]);
    setIsStreaming(false);
    setStreamError(null);
    setRawTrajectory(null);
  }, []);

  const startEvaluation = useCallback(
    (teamId: string, prompt: string) => {
      setStatusUpdates([]);
      setStreamError(null);
      setRawTrajectory(null);
      setIsStreaming(true);

      void (async () => {
        try {
          const response = await fetch("/kyai/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
            credentials: "include",
            body: JSON.stringify({ team_id: teamId, prompt }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");
          const decoder = new TextDecoder();

          while (true) {
            // eslint-disable-next-line no-await-in-loop -- a `ReadableStream` reader must be awaited sequentially; each chunk depends on the previous `read()` call resolving, so there is nothing to parallelize with `Promise.all`.
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              let data: StatusUpdate;
              try {
                data = JSON.parse(line.slice(6)) as StatusUpdate;
              } catch {
                continue;
              }
              setStatusUpdates((prev) => [...prev, data]);
              if (data.status === "evaluation_complete" && data.session_id) {
                // eslint-disable-next-line no-await-in-loop -- must resolve before the loop continues reading further stream chunks; the trajectory fetch is only ever triggered once per stream (on the terminal `evaluation_complete` event).
                const result = await triggerTrajectoryParser(data.session_id).unwrap();
                setRawTrajectory(result);
              }
            }
          }
        } catch (err) {
          setStreamError(
            err instanceof Error ? err.message : "An error occurred during evaluation",
          );
        } finally {
          setIsStreaming(false);
        }
      })();
    },
    [triggerTrajectoryParser],
  );

  return { statusUpdates, isStreaming, streamError, rawTrajectory, startEvaluation, reset };
}
