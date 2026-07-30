"use client";

import Shimmer from "../skeletons/Shimmer";
import PulseDot from "../skeletons/PulseDot";
import styles from "./blocks.module.css";
import type { Block } from "../blockStream/types";

/**
 * Per-block skeleton variants used while a block is in flight.
 *
 * Each variant mirrors the corresponding block's structure so the
 * layout does not shift when the live block replaces the skeleton.
 *   - `text` → 3 shimmer lines + cursor placeholder
 *   - `todo` → 3 shimmer rows with checkbox-sized squares
 *   - `table` → column-committed shimmer rows
 *   - `tool` → name chip + monospace argument pane
 *   - `code` → fixed-width monospace pane on triple-backtick detection
 */
interface BlockSkeletonProps {
  kind: Block["kind"] | "code";
}

function BlockSkeleton({ kind }: BlockSkeletonProps) {
  return (
    <output
      className={styles.blockFrame}
      data-status="streaming"
      data-locked="false"
      aria-busy="true"
    >
      <div className={styles.blockHeader}>
        <PulseDot ariaLabel="Generating" />
        <Shimmer width={80} height={11} radius={4} inline />
      </div>
      <div className={styles.blockBody}>
        {kind === "text" && (
          <>
            <Shimmer width="100%" height={10} radius={4} />
            <div style={{ height: 6 }} />
            <Shimmer width="100%" height={10} radius={4} />
            <div style={{ height: 6 }} />
            <Shimmer width="62%" height={10} radius={4} />
          </>
        )}

        {kind === "todo" && (
          <ul className={styles.todoList}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <li key={idx} className={styles.todoItem}>
                <Shimmer width={16} height={16} radius={4} />
                <Shimmer width={`${60 + (idx % 2 === 0 ? 18 : 0)}%`} height={11} radius={4} />
              </li>
            ))}
          </ul>
        )}

        {kind === "table" && (
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-hidden="true">
              <thead>
                <tr>
                  <th>
                    <Shimmer width={60} height={9} radius={3} />
                  </th>
                  <th>
                    <Shimmer width={80} height={9} radius={3} />
                  </th>
                  <th>
                    <Shimmer width={50} height={9} radius={3} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={idx}>
                    <td>
                      <Shimmer width="80%" height={10} radius={3} />
                    </td>
                    <td>
                      <Shimmer width="64%" height={10} radius={3} />
                    </td>
                    <td>
                      <Shimmer width={48} height={14} radius={7} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {kind === "list" && (
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <Shimmer width="70%" height={10} radius={4} />
            </li>
            <li className={styles.listItem}>
              <Shimmer width="55%" height={10} radius={4} />
            </li>
            <li className={styles.listItem}>
              <Shimmer width="40%" height={10} radius={4} />
            </li>
          </ul>
        )}

        {kind === "reasoning" && (
          <>
            <Shimmer width="92%" height={9} radius={4} />
            <div style={{ height: 6 }} />
            <Shimmer width="78%" height={9} radius={4} />
          </>
        )}

        {kind === "tool" && (
          <>
            <Shimmer width={120} height={12} radius={4} />
            <div style={{ height: 6 }} />
            <Shimmer width="100%" height={48} radius={6} />
          </>
        )}

        {kind === "subagent" && (
          <>
            <Shimmer width={140} height={11} radius={4} />
            <div style={{ height: 6 }} />
            <Shimmer width="88%" height={10} radius={4} />
          </>
        )}

        {kind === "code" && <Shimmer width="100%" height={96} radius={8} />}

        {kind === "error" && <Shimmer width="60%" height={10} radius={4} />}
      </div>
    </output>
  );
}

export default BlockSkeleton;
