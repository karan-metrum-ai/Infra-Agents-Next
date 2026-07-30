import type { Block, SubAgentBlock } from "../blockStream/types";

export type ActivityStreamSegment =
  | { kind: "thinking"; blocks: Block[] }
  | { kind: "subagent_cluster"; blocks: SubAgentBlock[] }
  | { kind: "block"; block: Block };

const ACTIVITY_KINDS = new Set(["reasoning", "tool", "todo"]);

function isActivityBlock(block: Block): boolean {
  return ACTIVITY_KINDS.has(block.kind);
}

/**
 * Split an agent-scoped block list into thinking accordions, parallel
 * sub-agent clusters, and standalone blocks while preserving order.
 */
export function segmentActivityStream(
  blocks: Block[],
  options?: { hideTodos?: boolean },
): ActivityStreamSegment[] {
  const segments: ActivityStreamSegment[] = [];
  let thinkingBuffer: Block[] = [];
  let subagentBuffer: SubAgentBlock[] = [];

  const flushThinking = () => {
    if (thinkingBuffer.length === 0) {
      return;
    }
    segments.push({ kind: "thinking", blocks: thinkingBuffer });
    thinkingBuffer = [];
  };

  const flushSubAgents = () => {
    if (subagentBuffer.length === 0) {
      return;
    }
    segments.push({ kind: "subagent_cluster", blocks: subagentBuffer });
    subagentBuffer = [];
  };

  for (const block of blocks) {
    if (block.kind === "todo" && options?.hideTodos) {
      flushSubAgents();
      continue;
    }

    if (isActivityBlock(block)) {
      flushSubAgents();
      thinkingBuffer.push(block);
      continue;
    }

    if (block.kind === "subagent") {
      flushThinking();
      subagentBuffer.push(block as SubAgentBlock);
      continue;
    }

    flushThinking();
    flushSubAgents();
    segments.push({ kind: "block", block });
  }

  flushThinking();
  flushSubAgents();
  return segments;
}
