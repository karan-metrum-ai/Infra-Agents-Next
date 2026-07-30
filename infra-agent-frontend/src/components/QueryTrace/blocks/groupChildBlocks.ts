import type { Block, SubAgentBlock } from "../blockStream/types";

export type ChildBlockSegment =
  | { kind: "block"; block: Block }
  | { kind: "subagent_cluster"; blocks: SubAgentBlock[] };

/**
 * Splits nested child blocks into single blocks and consecutive
 * sub-agent runs so parallel delegations can render as a grid.
 */
export function groupChildBlocks(blocks: Block[]): ChildBlockSegment[] {
  const segments: ChildBlockSegment[] = [];
  let pendingSubAgents: SubAgentBlock[] = [];

  const flushSubAgents = () => {
    if (pendingSubAgents.length === 0) {
      return;
    }
    segments.push({ kind: "subagent_cluster", blocks: pendingSubAgents });
    pendingSubAgents = [];
  };

  for (const block of blocks) {
    if (block.kind === "subagent") {
      pendingSubAgents.push(block as SubAgentBlock);
      continue;
    }
    flushSubAgents();
    segments.push({ kind: "block", block });
  }

  flushSubAgents();
  return segments;
}
