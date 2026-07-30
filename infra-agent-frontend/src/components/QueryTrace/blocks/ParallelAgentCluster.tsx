"use client";

import { useCallback, useState } from "react";
import PulseDot from "../skeletons/PulseDot";
import SubAgentTile from "./SubAgentTile";
import styles from "./blocks.module.css";
import type { SubAgentBlock } from "../blockStream/types";

/**
 * Shared container that makes concurrent sub-agents read at a glance.
 *
 * Tiles expand in-place inside the grid — the active tile spans the
 * full row while siblings reflow around it.
 */
interface ParallelAgentClusterProps {
  agents: SubAgentBlock[];
  /** Tighter layout when nested under a parent agent panel. */
  embedded?: boolean;
}

function ParallelAgentCluster({ agents, embedded = false }: ParallelAgentClusterProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = useCallback((blockId: string) => {
    setExpandedId((prev) => (prev === blockId ? null : blockId));
  }, []);

  if (agents.length === 0) return null;

  const runningCount = agents.filter(
    (agent) => !agent.locked && agent.status !== "complete",
  ).length;
  const headerLabel = runningCount > 0 ? "Running in parallel" : "Completed in parallel";

  return (
    <section
      className={[styles.parallelCluster, embedded ? styles.parallelClusterEmbedded : ""].join(" ")}
      aria-label={`${agents.length} sub-agents ${headerLabel.toLowerCase()}`}
    >
      <div className={styles.parallelHeader}>
        {runningCount > 0 && <PulseDot ariaLabel="Running in parallel" />}
        <span>{headerLabel}</span>
        <span className={styles.parallelCount}>{agents.length}</span>
      </div>
      <div className={styles.parallelGrid} data-has-expanded={expandedId ? "true" : "false"}>
        {agents.map((agent) => {
          const isExpanded = expandedId === agent.id;
          return (
            <div
              key={agent.id}
              className={[
                styles.parallelGridCell,
                isExpanded ? styles.parallelGridCellExpanded : "",
              ].join(" ")}
            >
              <SubAgentTile block={agent} expanded={isExpanded} onToggle={handleToggle} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ParallelAgentCluster;
