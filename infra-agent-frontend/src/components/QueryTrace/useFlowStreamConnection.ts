"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import {
  clearFlowsList,
  resetSession,
  setConnected,
  setError,
  setFlowsListLoading,
} from "@/features/queryTrace/flowStreamSlice";
import { blockStore } from "./blockStream/blockStore";
import { buildFlowEventsUrl } from "./flowStreamApi";
import {
  FLOW_STREAM_EVENT_NAMES,
  handleFlowEvent,
  type FlowStreamEventContext,
} from "./flowStreamEventRouter";
import { MAX_RECONNECT_ATTEMPTS, SSE_PROTOCOL } from "./flowStreamHelpers";

/**
 * Module-level (survives component unmount/remount, e.g. navigating away
 * from and back to the Agentic Team page). Lets the mount effect tell a
 * genuine team switch apart from a remount of the same team, so it does
 * not blow away a still-populated blockStore/Redux session that a live
 * flow needs to resume from. Ported verbatim from the Vite app's
 * `hooks/useFlowStream.ts` — intentional, not a bug.
 */
let lastMountedTeamId: string | null = null;

export interface UseFlowStreamConnectionParams {
  teamId: string;
  eventContext: FlowStreamEventContext;
  /** Owned by the orchestrating hook — shared with the event router. */
  currentCorrelationRef: RefObject<string | null>;
  /** Owned by the orchestrating hook — mirrors `state.flowStream.lastSeq`. */
  lastSeqRef: RefObject<string | null>;
  /** Owned by `useFlowsListPagination` — reused here for the mount-time poll. */
  refreshFlowsList: (limit?: number, status?: string | null, replace?: boolean) => Promise<void>;
  listFlowsAbortRef: RefObject<AbortController | null>;
  listFlowsGenerationRef: RefObject<number>;
}

export interface FlowStreamConnection {
  /** Open (or reopen, with exponential-backoff reconnect) the EventSource for a flow. */
  openStream: (correlationId: string) => void;
  /** Close the EventSource and clear connected state. */
  disconnect: () => void;
}

/**
 * Owns the single `EventSource` for this flow-stream subscription: manual
 * exponential-backoff reconnect (capped at `MAX_RECONNECT_ATTEMPTS`), and
 * the team-switch mount lifecycle (disconnect + flows-list refresh + 30s
 * poll). Split out of the Vite app's `hooks/useFlowStream.ts`.
 */
export function useFlowStreamConnection(
  params: UseFlowStreamConnectionParams,
): FlowStreamConnection {
  const {
    teamId,
    eventContext,
    currentCorrelationRef,
    lastSeqRef,
    refreshFlowsList,
    listFlowsAbortRef,
    listFlowsGenerationRef,
  } = params;
  const dispatch = useAppDispatch();

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const attachListeners = useCallback(
    (source: EventSource) => {
      FLOW_STREAM_EVENT_NAMES.forEach((eventType) => {
        source.addEventListener(eventType, ((evt: MessageEvent) => {
          handleFlowEvent(evt.data as string, eventType, evt.lastEventId, eventContext);
        }) as EventListener);
      });
      // Generic `message` channel — fires when the server sends a frame
      // without an `event:` line.
      source.addEventListener("message", (evt) => {
        handleFlowEvent(evt.data as string, "message", evt.lastEventId, eventContext);
      });
    },
    [eventContext],
  );

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    currentCorrelationRef.current = null;
    dispatch(setConnected(false));
  }, [currentCorrelationRef, dispatch]);

  const openStream = useCallback(
    (correlationId: string) => {
      if (!correlationId) return;

      // Tear down any existing connection first.
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      intentionalCloseRef.current = false;
      // Compare against the blockStore's own persisted correlation id
      // rather than the per-instance currentCorrelationRef: the ref is
      // reset to null on every component remount (e.g. navigating away
      // from and back to the Agentic Team page), which would otherwise
      // misclassify resuming an already-populated, still-executing flow
      // as "new" and wipe its blocks right as the user reopens it.
      const isNewCorrelation = blockStore.getSnapshot().correlation_id !== correlationId;
      currentCorrelationRef.current = correlationId;

      // Only reset the block store when switching to a new flow.
      // Reconnects on the same correlation (e.g. Istio 30s idle timeout)
      // must not wipe blocks — the live block stream would flash empty
      // and rebuild from the snapshot on every reconnect cycle.
      if (isNewCorrelation) {
        blockStore.reset(correlationId);
      }

      // On reconnect (same correlation), pass the last received sequence
      // number so the server can resume from the correct event position
      // rather than re-sending the full flow_state snapshot.
      const url = buildFlowEventsUrl(teamId, correlationId, {
        protocol: SSE_PROTOCOL,
        lastEventId: isNewCorrelation ? null : lastSeqRef.current,
      });
      const source = new EventSource(url);
      sourceRef.current = source;

      source.addEventListener("open", () => {
        dispatch(setConnected(true));
        reconnectAttemptsRef.current = 0;
      });

      source.addEventListener("error", () => {
        // EventSource has built-in retry, but if it lands in CLOSED state
        // we manually trigger a backoff reconnect to surface failures.
        if (intentionalCloseRef.current) return;
        if (source.readyState === EventSource.CLOSED) {
          dispatch(setConnected(false));
          if (sourceRef.current === source) {
            sourceRef.current = null;
          }
          source.close();
          if (
            reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS &&
            currentCorrelationRef.current === correlationId
          ) {
            const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30_000);
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = window.setTimeout(() => {
              if (currentCorrelationRef.current === correlationId) {
                openStream(correlationId);
              }
            }, delay);
          } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            dispatch(setError("Connection lost. Please refresh the page."));
          }
        }
      });

      attachListeners(source);
    },
    [attachListeners, currentCorrelationRef, dispatch, lastSeqRef, teamId],
  );

  /**
   * Team-switch lifecycle: disconnect any existing stream, clear the
   * flows list, reset Redux/blockStore session state ONLY on a genuine
   * team change (not a remount of the same team), then kick off the
   * first flows-list fetch plus a 30s poll.
   *
   * This is the ONE sanctioned direct `useEffect` in this feature module
   * (`.cursor/skills/sans-effect/SKILL.md` Pattern 4 — the same
   * exception already established at
   * `WorkflowDesigner/useMermaidDiagramRenderer.ts`): it synchronizes
   * with two genuine external systems (the browser's `EventSource`/SSE
   * connection and a `setInterval` poll) whose lifecycle must track
   * `teamId` for the component's entire lifetime, not just mount —
   * ruling out `useMountEffect`. There is no derived-state,
   * data-fetching-library, or event-handler equivalent for "tear down
   * and restart a long-lived streaming connection plus a recurring
   * timer whenever an id prop changes."
   */
  useEffect(() => {
    if (!teamId) return undefined;

    const isSameTeamAsBefore = lastMountedTeamId === teamId;
    lastMountedTeamId = teamId;

    listFlowsGenerationRef.current += 1;
    listFlowsAbortRef.current?.abort();

    disconnect();

    dispatch(clearFlowsList());
    dispatch(setFlowsListLoading(true));

    if (!isSameTeamAsBefore) {
      dispatch(resetSession());
      blockStore.reset(null);
    }

    reconnectAttemptsRef.current = 0;

    // Initial refresh for the new team (merge preserves optimistic rows).
    refreshFlowsList(undefined, undefined, false).catch(() => {});

    // Periodic poll: merge so locally indexed flows are not dropped when
    // the server list is briefly stale.
    const pollId = window.setInterval(() => {
      refreshFlowsList(undefined, undefined, false).catch(() => {});
    }, 30_000);

    return () => {
      disconnect();
      // `listFlowsAbortRef` is a plain data ref owned by this hook (not a
      // DOM node), and the whole point of reading `.current` here is to
      // abort whichever `AbortController` is *currently* in flight at
      // cleanup time (it may have been replaced since this effect ran,
      // e.g. by a `refreshFlowsList` call) — capturing it into a local
      // at effect-setup time would abort a stale, already-superseded
      // controller instead.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above; intentional current-value read of a non-DOM ref in cleanup.
      listFlowsAbortRef.current?.abort();
      window.clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-runs only on genuine teamId change, mirroring the Vite source's dependency-array cutoff (disconnect/refreshFlowsList/refs are stable for this hook's lifetime).
  }, [teamId]);

  return { openStream, disconnect };
}
