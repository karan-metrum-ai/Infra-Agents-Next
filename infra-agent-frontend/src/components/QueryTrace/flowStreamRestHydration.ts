/**
 * REST baseline hydration for the v1 trace and v2 block store.
 *
 * SSE remains the live overlay; these fetches guarantee the trace panel
 * has data even when the stream is idle, partial, or slow to connect.
 * Split out of the Vite app's `hooks/useFlowStream.ts` (see that file's
 * `hydrateFlowFromRest`/`hydrateBlocksFromRest`).
 */
import type { AppDispatch } from "@/store/store";
import {
  setFlowData,
  setError,
  setPlanBundle,
  setQueryStatus,
} from "@/features/queryTrace/flowStreamSlice";
import {
  fetchBlockSnapshot,
  fetchFlowSnapshot,
  FlowStreamApiError,
  resolvePlanBundle,
} from "./flowStreamApi";
import {
  deriveQueryStatusFromSnapshot,
  isFlowSnapshotCompleted,
  normalizeFlowSnapshot,
  reconcilePlanBundleForCompletedFlow,
} from "./flowSnapshotAdapter";
import { mergeFlowPayload } from "./flowTraceMerge";
import { blockStore } from "./blockStream/blockStore";
import type { Block } from "./blockStream/types";
import type { FlowPayload, PlanBundle } from "./flowPayload.types";
import { applyCompletedFlowUiState, buildBlockHydrateEvents } from "./flowStreamHelpers";

/**
 * `FlowPayload` intentionally has no index signature (it's a precise
 * domain type); `flowSnapshotAdapter.ts`'s helpers take the wider
 * `Record<string, unknown>` since they also accept raw, not-yet-normalized
 * REST payloads. Both shapes describe the same runtime object, so this
 * single named cast point is used at every boundary crossing instead of
 * scattering ad hoc `as` casts.
 */
function asRecord(payload: FlowPayload): Record<string, unknown> {
  return payload as unknown as Record<string, unknown>;
}

/**
 * REST baseline hydration for v1 trace and v2 blocks.
 *
 * SSE remains the live overlay; this fetch guarantees the panel has data
 * even when the stream is idle, partial, or slow to connect.
 */
export async function hydrateFlowFromRest(
  teamId: string,
  correlationId: string,
  dispatch: AppDispatch,
  getExistingFlow: () => FlowPayload | null,
  isCurrentFlow: () => boolean,
  options: { signal?: AbortSignal; includeBlocks?: boolean } = {},
): Promise<void> {
  const { signal, includeBlocks = false } = options;
  if (!isCurrentFlow()) {
    return;
  }
  try {
    const snapshot = await fetchFlowSnapshot<Record<string, unknown>>(
      teamId,
      correlationId,
      signal,
    );
    if (snapshot && isCurrentFlow()) {
      const normalized = normalizeFlowSnapshot(snapshot);
      const merged = mergeFlowPayload(getExistingFlow(), normalized);
      const mergedRecord = asRecord(merged);
      dispatch(setFlowData(merged));
      applyCompletedFlowUiState(dispatch, mergedRecord);
      if (!isFlowSnapshotCompleted(mergedRecord)) {
        dispatch(setQueryStatus(deriveQueryStatusFromSnapshot(mergedRecord)));
      }
      const traceHasRows = Array.isArray(normalized.trace) && normalized.trace.length > 0;
      const completed = traceHasRows && isFlowSnapshotCompleted(mergedRecord);
      if ((completed || !traceHasRows) && isCurrentFlow()) {
        try {
          const plan = await resolvePlanBundle<PlanBundle>(teamId, correlationId, snapshot, signal);
          if (plan && isCurrentFlow()) {
            dispatch(
              setPlanBundle(
                reconcilePlanBundleForCompletedFlow(
                  plan,
                  traceHasRows ? true : isFlowSnapshotCompleted(mergedRecord),
                ),
              ),
            );
          }
        } catch {
          /* plan snapshot is optional */
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    if (isCurrentFlow()) {
      const message =
        err instanceof FlowStreamApiError
          ? `Failed to load flow snapshot (${err.status}): ${err.message}`
          : err instanceof Error
            ? err.message
            : "Failed to load flow snapshot";
      dispatch(setError(message));
    }
  }

  if (!includeBlocks || !isCurrentFlow()) {
    return;
  }
  try {
    const snapshot = await fetchBlockSnapshot<Record<string, unknown>>(
      teamId,
      correlationId,
      signal,
    );
    const blocks = snapshot.blocks as Block[] | undefined;
    if (blocks && blocks.length > 0 && isCurrentFlow()) {
      blockStore.hydrate(buildBlockHydrateEvents(snapshot, blocks), {
        mode: "snapshot",
        correlationId,
      });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    // Missing block snapshots are expected for older / v1-only cron
    // flows; do not flip the panel into a hard error when v1 trace
    // hydration already succeeded.
  }
}

/** Hydrate only the v2 block store from the REST snapshot endpoint. */
export async function hydrateBlocksFromRest(
  teamId: string,
  correlationId: string,
  isCurrentFlow: () => boolean,
  signal?: AbortSignal,
): Promise<void> {
  if (!isCurrentFlow()) {
    return;
  }
  try {
    const snapshot = await fetchBlockSnapshot<Record<string, unknown>>(
      teamId,
      correlationId,
      signal,
    );
    const blocks = snapshot.blocks as Block[] | undefined;
    if (blocks && blocks.length > 0 && isCurrentFlow()) {
      blockStore.hydrate(buildBlockHydrateEvents(snapshot, blocks), {
        mode: "snapshot",
        correlationId,
      });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
  }
}
