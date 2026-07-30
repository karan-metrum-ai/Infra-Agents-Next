"use client";

import { memo, useMemo } from "react";
import { usePhase, useBlockStream } from "../blockStream/useBlockStream";
import { describePhase } from "../blockStream/phaseMachine";
import { countActiveAgentGroups } from "../deriveTraceStatus";
import type { AgentGroup } from "../groupBlocksByAgent";
import type { TodoItem } from "../blockStream/types";
import styles from "./blocks.module.css";

interface ProgressSummaryProps {
  todoList: TodoItem[];
  agentGroups: AgentGroup[];
}

/**
 * Compact executive-friendly progress bar for the block stream.
 *
 * Shows: phase label · todo progress · active agent count
 */
function ProgressSummary({ todoList, agentGroups }: ProgressSummaryProps) {
  const phase = usePhase();
  const snapshot = useBlockStream();
  const descriptor = describePhase(phase);

  const completedTodos = useMemo(
    () => todoList.filter((t) => t.status === "completed").length,
    [todoList],
  );

  const activeAgents = useMemo(
    () => countActiveAgentGroups(agentGroups, snapshot),
    [agentGroups, snapshot],
  );

  return (
    <output className={styles.progressSummary} aria-live="polite">
      <span className={styles.progressPhase} data-tone={descriptor.tone}>
        {descriptor.label}
      </span>
      {todoList.length > 0 && (
        <>
          <span className={styles.progressDivider} aria-hidden="true">
            ·
          </span>
          <span className={styles.progressTodo}>
            Tasks {completedTodos}/{todoList.length}
          </span>
        </>
      )}
      {activeAgents > 0 && (
        <>
          <span className={styles.progressDivider} aria-hidden="true">
            ·
          </span>
          <span className={styles.progressAgents}>
            {activeAgents} {activeAgents === 1 ? "agent" : "agents"} active
          </span>
        </>
      )}
    </output>
  );
}

export default memo(ProgressSummary);
