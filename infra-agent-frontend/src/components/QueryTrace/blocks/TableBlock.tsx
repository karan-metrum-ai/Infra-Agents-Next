"use client";

import { memo, type ReactNode } from "react";
import BlockFrame from "./BlockFrame";
import styles from "./blocks.module.css";
import type { TableBlock as TableBlockType } from "../blockStream/types";
import { getLinkDisplayText, isSafeLinkHref, normalizeLinkHref } from "@/utils/linkUtils";

/**
 * Structured tabular data block.
 *
 * Per PRD Rule 2, the backend only emits complete rows — there is no
 * partial-row state to handle here. We render columns and rows as-is
 * and let the browser handle horizontal overflow via the wrapper.
 */
interface TableBlockProps {
  block: TableBlockType;
}

function renderCell(cell: string): ReactNode {
  const trimmed = String(cell).trim();
  if (!isSafeLinkHref(trimmed)) {
    return cell;
  }

  const href = normalizeLinkHref(trimmed);

  return (
    <a
      href={href}
      className={styles.tableLink}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
    >
      {getLinkDisplayText(href, trimmed)}
    </a>
  );
}

function TableBlock({ block }: TableBlockProps) {
  return (
    <BlockFrame
      kind="Table"
      status={block.status}
      locked={block.locked}
      accessory={<span style={{ fontSize: 11, fontWeight: 500 }}>{block.rows.length} rows</span>}
    >
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {block.columns.map((column, idx) => (
                <th key={idx}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx}>{renderCell(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockFrame>
  );
}

export default memo(TableBlock);
