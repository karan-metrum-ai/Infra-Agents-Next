import type { Block } from "./blockStream/types";
import { groupBlocksByAgent } from "./groupBlocksByAgent";

export interface ShowV2StreamInput {
  isLegacyPlanInterruption: boolean;
  blockOrderLength: number;
  blockCorrelationId: string | null;
  flowCorrelationId: string | null;
}

/** Whether the v2 block stream should render for this flow. */
export function computeShowV2Stream(input: ShowV2StreamInput): boolean {
  const v2HasRenderableBlocks = input.blockOrderLength > 0;
  const v2CorrelationMatch = input.blockCorrelationId === input.flowCorrelationId;
  return !input.isLegacyPlanInterruption && v2HasRenderableBlocks && v2CorrelationMatch;
}

/** Top-level blocks used for agent grouping (orphans when parent missing). */
export function selectTopLevelBlocks(
  blocks: Block[],
  byId: Record<string, Block | undefined>,
): Block[] {
  const topLevel = blocks.filter((b) => !b.parent_id || !byId[b.parent_id]);
  return topLevel.length > 0 ? topLevel : blocks;
}

/** Agent groups for layout; empty when every block is nested under a parent. */
export function computeVisibleBlockGroups(
  blocks: Block[],
  byId: Record<string, Block | undefined>,
): ReturnType<typeof groupBlocksByAgent> {
  if (blocks.length === 0) {
    return [];
  }
  return groupBlocksByAgent(selectTopLevelBlocks(blocks, byId));
}
