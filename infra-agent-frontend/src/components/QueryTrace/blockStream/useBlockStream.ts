/**
 * React bindings for the external `blockStore`.
 *
 * Components use `useBlockStream()` to read the full snapshot, or the
 * tiny selector helpers below for narrowly-scoped subscriptions
 * (`useActiveBlockId`, `usePhase`, `useTodoList`, `useBlock`). Each
 * selector still drives a single `useSyncExternalStore` call, so the
 * store's RAF-batched flushes coalesce all dependent components into
 * one React tick.
 */
import { useCallback, useSyncExternalStore } from "react";
import { isParallelDeviceSubAgent, isPrimaryAgent } from "../segmentTimelineGroups";
import { blockStore } from "./blockStore";
import type {
  Block,
  BlockStoreState,
  InterruptionPayload,
  Phase,
  SubAgentBlock,
  TodoItem,
} from "./types";

/** Subscribe to the full block-store snapshot. */
export function useBlockStream(): BlockStoreState {
  return useSyncExternalStore(blockStore.subscribe, blockStore.getSnapshot, blockStore.getSnapshot);
}

/** Selector — current execution phase. */
export function usePhase(): Phase {
  return useSyncExternalStore(
    blockStore.subscribe,
    () => blockStore.getSnapshot().phase,
    () => blockStore.getSnapshot().phase,
  );
}

/** Selector — the ID of the currently-streaming block, if any. */
export function useActiveBlockId(): string | null {
  return useSyncExternalStore(
    blockStore.subscribe,
    () => blockStore.getSnapshot().active_block_id,
    () => blockStore.getSnapshot().active_block_id,
  );
}

/** Selector — current todo list. */
export function useTodoList(): TodoItem[] {
  return useSyncExternalStore(
    blockStore.subscribe,
    () => blockStore.getSnapshot().todo_list,
    () => blockStore.getSnapshot().todo_list,
  );
}

/** Selector — interruption payload (null outside `interruption_awaited`). */
export function useInterruption(): InterruptionPayload | null {
  return useSyncExternalStore(
    blockStore.subscribe,
    () => blockStore.getSnapshot().interruption,
    () => blockStore.getSnapshot().interruption,
  );
}

/** Selector — block by ID. Stable until that block mutates or is locked. */
export function useBlock(blockId: string | null): Block | undefined {
  const getBlock = useCallback(() => {
    if (!blockId) return undefined;
    return blockStore.getSnapshot().byId[blockId];
  }, [blockId]);
  return useSyncExternalStore(blockStore.subscribe, getBlock, getBlock);
}

/** Selector — ordered list of block IDs. */
export function useBlockOrder(): string[] {
  return useSyncExternalStore(
    blockStore.subscribe,
    () => blockStore.getSnapshot().order,
    () => blockStore.getSnapshot().order,
  );
}

/**
 * Return device sub-agent blocks that are still running in parallel.
 *
 * Primary agents and named specialists are excluded — they render as
 * full timeline sections, not parallel tiles.
 */
export function selectActiveSubAgents(state: BlockStoreState): Block[] {
  const result: Block[] = [];
  for (const id of state.order) {
    const block = state.byId[id];
    if (
      block &&
      block.kind === "subagent" &&
      !block.parent_id &&
      !block.locked &&
      (block.status === "streaming" || block.status === "pending") &&
      isParallelDeviceSubAgent(block as SubAgentBlock)
    ) {
      result.push(block);
    }
  }
  return result;
}

/**
 * Return the primary delegated agent block (Level 1 Support, NOC) that
 * is the parent of specialist sub-agents. Used by LiveBlockStream to
 * render the parallel cluster nested within the correct agent section.
 */
export function selectPrimarySubAgent(state: BlockStoreState): SubAgentBlock | null {
  for (const id of state.order) {
    const block = state.byId[id];
    if (block && block.kind === "subagent" && isPrimaryAgent((block as SubAgentBlock).agent_name)) {
      return block as SubAgentBlock;
    }
  }
  return null;
}
