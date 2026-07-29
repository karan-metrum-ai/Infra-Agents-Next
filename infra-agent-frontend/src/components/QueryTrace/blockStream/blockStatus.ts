import type { Block, BlockStoreState } from "./types";

/** True while a block is actively receiving updates in the live stream. */
export function isBlockActive(block: Block): boolean {
  if (block.locked) {
    return false;
  }
  return block.status === "streaming" || block.status === "pending";
}

/** True when a block has reached a terminal visual state. */
export function isBlockDone(block: Block): boolean {
  if (block.locked) {
    return true;
  }
  return block.status === "complete" || block.status === "locked" || block.status === "failed";
}

/** True when any non-locked block is still streaming. */
export function hasActiveBlocks(snapshot: BlockStoreState): boolean {
  if (snapshot.phase === "completed" || snapshot.phase === "failed") {
    return false;
  }
  for (const id of snapshot.order) {
    const block = snapshot.byId[id];
    if (block && isBlockActive(block)) {
      return true;
    }
  }
  return false;
}
