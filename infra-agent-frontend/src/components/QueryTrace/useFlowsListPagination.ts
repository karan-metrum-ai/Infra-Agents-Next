"use client";

import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  clearFlowsList,
  setFlowsList,
  setFlowsListLoading,
} from "@/features/queryTrace/flowStreamSlice";
import { isCronFlow, isManualFlow, listFlows, type FlowListEntry } from "./flowStreamApi";
import type { FlowListItem } from "./flowPayload.types";

export type FlowHistoryMode = "queries" | "cron";

export interface UseFlowsListPaginationResult {
  refreshFlowsList: (
    limit?: number,
    status?: string | null,
    replace?: boolean,
    cursor?: string | null,
    sourceFilter?: { source?: string | null; excludeSource?: string | null },
  ) => Promise<void>;
  loadMoreFlows: () => Promise<void>;
  /**
   * Switch between the Queries / Cron Jobs history view and refresh the
   * list immediately. Replaces the Vite source's effect that watched a
   * `historyMode` prop — per `.cursor/skills/sans-effect/SKILL.md`
   * Pattern 3, the toggle is now an explicit action the caller invokes
   * (e.g. from a tab's `onClick`) instead of a value the hook reacts to.
   */
  setHistoryMode: (mode: FlowHistoryMode) => void;
  flowsListNextCursor: string | null;
  flowsListLoading: boolean;
  listFlowsAbortRef: RefObject<AbortController | null>;
  listFlowsGenerationRef: RefObject<number>;
}

/**
 * Query History pagination: REST-backed flows list with cursor-based
 * "load more" and a Queries/Cron-Jobs history-mode filter. Split out of
 * the Vite app's `hooks/useFlowStream.ts`.
 */
export function useFlowsListPagination(
  teamIdRef: RefObject<string>,
  initialHistoryMode: FlowHistoryMode,
): UseFlowsListPaginationResult {
  const dispatch = useAppDispatch();
  const historyModeRef = useRef<FlowHistoryMode>(initialHistoryMode);
  const listFlowsAbortRef = useRef<AbortController | null>(null);
  const listFlowsGenerationRef = useRef(0);

  const flowsListNextCursor = useAppSelector((s) => s.flowStream.flowsListNextCursor);
  const flowsListLoading = useAppSelector((s) => s.flowStream.flowsListLoading);

  const refreshFlowsList = useCallback(
    async (
      limit?: number,
      status?: string | null,
      replace = false,
      cursor?: string | null,
      sourceFilter?: { source?: string | null; excludeSource?: string | null },
    ): Promise<void> => {
      const requestTeamId = teamIdRef.current;
      if (!requestTeamId) {
        return;
      }

      const isFirstPage = replace || !cursor;

      listFlowsAbortRef.current?.abort();
      const abort = new AbortController();
      listFlowsAbortRef.current = abort;
      const generation = listFlowsGenerationRef.current;

      if (isFirstPage) {
        dispatch(setFlowsListLoading(true));
      }

      // Default from historyMode: Queries excludes cron; Cron Jobs only
      // includes cron ticks. Explicit sourceFilter overrides.
      const mode = historyModeRef.current;
      const source = sourceFilter?.source ?? (mode === "cron" ? "cron_job" : null);
      const excludeSource =
        sourceFilter?.excludeSource ??
        (sourceFilter?.source ? null : mode === "cron" ? null : "cron_job");

      try {
        const result = await listFlows(
          requestTeamId,
          {
            limit: limit ?? 50,
            status: status ?? null,
            cursor: cursor ?? null,
            source,
            excludeSource,
          },
          abort.signal,
        );
        if (abort.signal.aborted) {
          return;
        }
        if (generation !== listFlowsGenerationRef.current) {
          return;
        }
        if (requestTeamId !== teamIdRef.current) {
          return;
        }

        const flows: FlowListItem[] = (result.flows ?? [])
          .filter(
            (f): f is FlowListEntry & { correlation_id: string } =>
              typeof f.correlation_id === "string",
          )
          .map((f) => ({
            session_id: f.session_id,
            correlation_id: f.correlation_id,
            query: f.query,
            status: f.status,
            created_at: f.created_at,
            completed_at: f.completed_at,
            evaluation_status: f.evaluation_status,
            score: f.score ?? null,
            source: f.source ?? null,
            cron_job_id: f.cron_job_id ?? null,
          }))
          .filter((f) => {
            if (mode === "cron") return isCronFlow(f);
            if (mode === "queries") return isManualFlow(f);
            return true;
          });
        dispatch(
          setFlowsList({
            teamId: requestTeamId,
            flows,
            replace: isFirstPage,
            nextCursor: result.next_cursor ?? null,
          }),
        );
      } catch {
        if (abort.signal.aborted) {
          return;
        }
        if (isFirstPage) {
          dispatch(setFlowsListLoading(false));
        }
      }
    },
    [dispatch, teamIdRef],
  );

  const loadMoreFlows = useCallback(async (): Promise<void> => {
    if (!flowsListNextCursor) {
      return;
    }
    await refreshFlowsList(undefined, undefined, false, flowsListNextCursor);
  }, [flowsListNextCursor, refreshFlowsList]);

  const setHistoryMode = useCallback(
    (mode: FlowHistoryMode) => {
      if (historyModeRef.current === mode) {
        return;
      }
      historyModeRef.current = mode;
      // History mode toggle: refresh the list only — do not tear down an
      // active SSE subscription / chat session.
      listFlowsGenerationRef.current += 1;
      listFlowsAbortRef.current?.abort();
      dispatch(clearFlowsList());
      dispatch(setFlowsListLoading(true));
      void refreshFlowsList(undefined, undefined, true);
    },
    [dispatch, refreshFlowsList],
  );

  return {
    refreshFlowsList,
    loadMoreFlows,
    setHistoryMode,
    flowsListNextCursor,
    flowsListLoading,
    listFlowsAbortRef,
    listFlowsGenerationRef,
  };
}
