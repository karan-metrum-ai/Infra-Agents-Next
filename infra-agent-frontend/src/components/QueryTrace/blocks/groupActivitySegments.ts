/**
 * Activity segment grouper — runs after agent grouping, before render.
 *
 * Merges consecutive reasoning + tool + todo blocks into a single
 * "thinking" segment so the UI can collapse them into one accordion.
 * Response text blocks and sub-agent delegations stay separate.
 */

import type { Block, SubAgentBlock } from "../blockStream/types";
import { isBlockActive } from "../blockStream/blockStatus";

export type ActivitySegment =
  | { kind: "thinking"; blocks: Block[]; startedAt: number }
  | { kind: "response"; block: Block }
  | { kind: "delegation"; block: SubAgentBlock }
  | { kind: "error"; block: Block };

const ACTIVITY_KINDS = new Set(["reasoning", "tool", "todo"]);

function isActivityBlock(block: Block): boolean {
  return ACTIVITY_KINDS.has(block.kind);
}

/**
 * Group a flat list of blocks (already scoped to one agent group)
 * into activity segments.
 */
export function groupActivitySegments(blocks: Block[]): ActivitySegment[] {
  if (blocks.length === 0) return [];

  const segments: ActivitySegment[] = [];
  let thinkingBuffer: Block[] = [];

  const flushThinking = () => {
    if (thinkingBuffer.length === 0) return;
    const startedAt = thinkingBuffer[0]?.created_at ?? Date.now();
    segments.push({ kind: "thinking", blocks: [...thinkingBuffer], startedAt });
    thinkingBuffer = [];
  };

  for (const block of blocks) {
    if (block.kind === "text") {
      flushThinking();
      segments.push({ kind: "response", block });
    } else if (block.kind === "subagent") {
      flushThinking();
      segments.push({ kind: "delegation", block: block as SubAgentBlock });
    } else if (block.kind === "error") {
      flushThinking();
      segments.push({ kind: "error", block });
    } else if (isActivityBlock(block)) {
      thinkingBuffer.push(block);
    } else {
      flushThinking();
      segments.push({ kind: "thinking", blocks: [block], startedAt: block.created_at });
    }
  }

  flushThinking();
  return segments;
}

/** Thinking segment metadata for UI labels. */
export interface ThinkingMeta {
  stepCount: number;
  durationMs: number;
  isStreaming: boolean;
  hasFailed: boolean;
}

export function computeThinkingMeta(
  segment: Extract<ActivitySegment, { kind: "thinking" }>,
): ThinkingMeta {
  const now = Date.now();
  const isStreaming = segment.blocks.some((b) => isBlockActive(b));
  const hasFailed = segment.blocks.some((b) => b.status === "failed");

  const lastBlock = segment.blocks[segment.blocks.length - 1];
  const lastTime = lastBlock?.created_at ?? segment.startedAt;

  const durationMs = isStreaming ? now - segment.startedAt : lastTime - segment.startedAt;

  const stepCount = segment.blocks.length;

  return { stepCount, durationMs: Math.max(0, durationMs), isStreaming, hasFailed };
}
