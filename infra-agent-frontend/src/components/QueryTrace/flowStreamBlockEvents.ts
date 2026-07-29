/**
 * PRD v2 block-stream event handling — dispatches directly into the
 * external `blockStore` (not Redux). Split out of the Vite app's
 * `hooks/useFlowStream.ts` `handleFlowEvent` switch (the `agent_frame`
 * through `block_snapshot` cases).
 */
import type { AppDispatch } from "@/store/store";
import { patchPlanBundle, setQueryStatus } from "@/features/queryTrace/flowStreamSlice";
import { blockStore } from "./blockStream/blockStore";
import type {
  AgentFrameEvent,
  AgentFrameInput,
  Block,
  BlockCompleteEvent,
  BlockCreatedEvent,
  BlockStatus,
  BlockUpdatedEvent,
} from "./blockStream/types";
import type { RefObject } from "react";

export interface FlowStreamBlockEventContext {
  dispatch: AppDispatch;
  correlationIdRef: RefObject<string | null>;
  hydrateBlocksForFlow: (correlationId: string) => void;
}

/** True for SSE event names handled by the v2 block-stream protocol. */
const V2_BLOCK_EVENT_TYPES = new Set([
  "agent_frame",
  "block_created",
  "block_updated",
  "block_locked",
  "block_complete",
  "block_snapshot",
]);

export function isBlockEventType(messageType: string): boolean {
  return V2_BLOCK_EVENT_TYPES.has(messageType);
}

/** Route one v2 block-stream event into `blockStore` (+ derived Redux status). */
export function handleBlockEvent(
  messageType: string,
  data: Record<string, unknown>,
  event: Record<string, unknown>,
  isStale: boolean,
  ctx: FlowStreamBlockEventContext,
): void {
  if (isStale) return;
  const { dispatch, correlationIdRef, hydrateBlocksForFlow } = ctx;

  switch (messageType) {
    // v2 payloads arrive as flat top-level JSON (no nested .data
    // wrapper), so we use `event` directly instead of `data` when the
    // envelope has no explicit `.data` field.
    case "agent_frame": {
      const frameData = event.data ? data : event;
      if (frameData) {
        const frameEvent: AgentFrameEvent = {
          event: "agent_frame",
          data: frameData as AgentFrameEvent["data"],
        };
        blockStore.dispatch(frameEvent);
        const phase = (frameData as { phase?: string }).phase;
        if (phase === "executing") {
          dispatch(setQueryStatus("executing"));
          dispatch(patchPlanBundle({ status: "executing" }));
        } else if (phase === "interruption_awaited") {
          dispatch(setQueryStatus("pending_approval"));
        } else if (phase === "completed") {
          dispatch(setQueryStatus("completed"));
          dispatch(patchPlanBundle({ status: "completed" }));
          if (correlationIdRef.current) {
            hydrateBlocksForFlow(correlationIdRef.current);
          }
        } else if (phase === "failed") {
          dispatch(setQueryStatus("error"));
          dispatch(patchPlanBundle({ status: "failed" }));
        }
      }
      break;
    }

    case "block_created": {
      const block = (data.block as Block | undefined) ?? (event.block as Block | undefined);
      if (block) {
        const created: BlockCreatedEvent = { type: "block_created", block };
        blockStore.dispatch(created);
      }
      break;
    }

    case "block_updated": {
      const blockId =
        (data.block_id as string | undefined) ?? (event.block_id as string | undefined);
      if (blockId) {
        const updated: BlockUpdatedEvent = {
          type: "block_updated",
          block_id: blockId,
          // Backend emits tool/structured patches under `fields`; older
          // builds used `patch`. Accept both so neither protocol version
          // drops status/result updates.
          patch: (data.fields ?? data.patch ?? event.fields ?? event.patch ?? {}) as Partial<Block>,
        };
        blockStore.dispatch(updated);
      }
      break;
    }

    case "block_locked":
    case "block_complete": {
      const completeBlockId =
        (data.block_id as string | undefined) ?? (event.block_id as string | undefined);
      if (completeBlockId) {
        const complete: BlockCompleteEvent = {
          type: "block_complete",
          block_id: completeBlockId,
          status: (data.status ?? event.status) as BlockStatus | undefined,
        };
        blockStore.dispatch(complete);
      }
      break;
    }

    case "block_snapshot": {
      const snapshot = data as {
        phase?: string;
        todo_list?: Array<{ id: string; title: string; status: string }>;
        blocks?: Block[];
      };
      if (snapshot?.blocks && snapshot.blocks.length > 0) {
        const hydrateEvents: AgentFrameInput[] = [];
        hydrateEvents.push({
          event: "agent_frame",
          data: {
            correlation_id: correlationIdRef.current ?? undefined,
            phase: (snapshot.phase ?? "completed") as AgentFrameEvent["data"]["phase"],
            todo_list: snapshot.todo_list ?? [],
            active_block_id: null,
          },
        } as AgentFrameEvent);
        for (const block of snapshot.blocks) {
          hydrateEvents.push({ type: "block_created", block });
          hydrateEvents.push({
            type: "block_complete",
            block_id: block.id,
            status: block.status as BlockStatus | undefined,
          });
        }
        blockStore.hydrate(hydrateEvents, {
          mode: "snapshot",
          correlationId: correlationIdRef.current ?? undefined,
        });
      }
      break;
    }

    default:
  }
}
