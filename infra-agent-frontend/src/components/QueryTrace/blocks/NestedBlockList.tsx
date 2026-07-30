"use client";

import BlockRouter from "./BlockRouter";
import ParallelAgentCluster from "./ParallelAgentCluster";
import { groupChildBlocks } from "./groupChildBlocks";
import type { Block } from "../blockStream/types";

interface NestedBlockListProps {
  blocks: Block[];
  defaultOpen?: boolean;
}

/**
 * Renders nested blocks under a parent sub-agent or tool panel.
 *
 * Consecutive sub-agent blocks are grouped into a responsive grid
 * (e.g. device triage tasks spawned by ``triage_devices_parallel``).
 */
function NestedBlockList({ blocks, defaultOpen = false }: NestedBlockListProps) {
  const segments = groupChildBlocks(blocks);

  return (
    <>
      {segments.map((segment, idx) => {
        if (segment.kind === "subagent_cluster") {
          return (
            <ParallelAgentCluster
              key={`cluster-${segment.blocks[0]?.id ?? idx}`}
              agents={segment.blocks}
              embedded
            />
          );
        }
        return (
          <BlockRouter key={segment.block.id} block={segment.block} defaultOpen={defaultOpen} />
        );
      })}
    </>
  );
}

export default NestedBlockList;
