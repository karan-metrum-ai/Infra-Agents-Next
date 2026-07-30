"use client";

import { memo } from "react";
import styles from "./blocks.module.css";
import type { TodoItem } from "../blockStream/types";

/**
 * Task checklist pinned to the parent orchestrator block.
 *
 * Renders the ``todo_list`` from the agent_frame envelope (DAG task
 * progress) rather than a standalone todo block in the stream.
 */
interface PinnedTodoBarProps {
  items: TodoItem[];
}

const RADIO_CLASS: Record<TodoItem["status"], string> = {
  pending: "",
  running: styles.todoRadioRunning,
  completed: styles.todoRadioCompleted,
  failed: styles.todoRadioFailed,
};

function PinnedTodoBar({ items }: PinnedTodoBarProps) {
  if (items.length === 0) return null;

  const completed = items.filter((i) => i.status === "completed").length;

  return (
    <section className={styles.pinnedTodoBar} aria-label="Execution plan tasks">
      <div className={styles.pinnedTodoHeader}>
        <span className={styles.pinnedTodoTitle}>Plan progress</span>
        <span className={styles.pinnedTodoProgress}>
          {completed}/{items.length}
        </span>
      </div>
      <ul className={styles.todoList}>
        {items.map((item) => (
          <li key={item.id} className={styles.todoItem}>
            <span
              className={[styles.todoRadio, RADIO_CLASS[item.status]].filter(Boolean).join(" ")}
              aria-hidden="true"
            >
              {item.status === "completed" && <span className={styles.todoRadioFill} />}
              {item.status === "failed" && <span className={styles.todoRadioX}>!</span>}
            </span>
            <span
              className={[
                styles.todoText,
                item.status === "completed" && styles.todoTextCompleted,
                item.status === "running" && styles.todoTextRunning,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(PinnedTodoBar);
