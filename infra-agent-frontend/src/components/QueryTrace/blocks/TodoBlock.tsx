"use client";

import { memo } from "react";
import BlockFrame from "./BlockFrame";
import styles from "./blocks.module.css";
import type { TodoBlock as TodoBlockType, TodoItem } from "../blockStream/types";

/**
 * Structured todo block.
 *
 * Each item renders a deterministic check icon based on its status —
 * `running` items get an inline spinner and `completed` items get a
 * strike-through. Items are keyed by their ID for stable React
 * reconciliation as new items arrive.
 */
interface TodoBlockProps {
  block: TodoBlockType;
}

const RADIO_CLASS: Record<TodoItem["status"], string> = {
  pending: "",
  running: styles.todoRadioRunning,
  completed: styles.todoRadioCompleted,
  failed: styles.todoRadioFailed,
};

function TodoBlock({ block }: TodoBlockProps) {
  const completed = block.items.filter((i) => i.status === "completed").length;
  const total = block.items.length;

  return (
    <BlockFrame
      kind="Todos"
      status={block.status}
      locked={block.locked}
      accessory={
        <span style={{ fontSize: 11, fontWeight: 500 }}>
          {completed}/{total}
        </span>
      }
    >
      <ul className={styles.todoList} aria-label="Task progress">
        {block.items.map((item) => (
          <li key={item.id} className={styles.todoItem}>
            <span
              className={[styles.todoRadio, RADIO_CLASS[item.status]].filter(Boolean).join(" ")}
              aria-hidden="true"
            >
              {item.status === "completed" && <span className={styles.todoRadioFill} />}
              {item.status === "failed" && <span className={styles.todoRadioX}>!</span>}
            </span>
            <span
              className={[styles.todoText, item.status === "completed" && styles.todoTextCompleted]
                .filter(Boolean)
                .join(" ")}
            >
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </BlockFrame>
  );
}

export default memo(TodoBlock);
