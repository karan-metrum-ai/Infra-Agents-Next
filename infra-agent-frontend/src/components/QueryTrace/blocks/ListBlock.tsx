"use client";

import { memo } from "react";
import BlockFrame from "./BlockFrame";
import styles from "./blocks.module.css";
import type { ListBlock as ListBlockType, ListItem } from "../blockStream/types";

/**
 * Hierarchical nested-list block.
 *
 * Renders the tree recursively so arbitrary depth works. Per the PRD,
 * the backend must emit complete subtree objects (Rule 2), so we never
 * see partial branches mid-render.
 */
interface ListBlockProps {
  block: ListBlockType;
}

function NestedList({ items }: { items: ListItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className={styles.list}>
      {items.map((item, idx) => (
        <li key={idx} className={styles.listItem}>
          <span>{item.text}</span>
          {item.children && item.children.length > 0 && <NestedList items={item.children} />}
        </li>
      ))}
    </ul>
  );
}

function ListBlock({ block }: ListBlockProps) {
  return (
    <BlockFrame kind="List" status={block.status} locked={block.locked}>
      <NestedList items={block.items} />
    </BlockFrame>
  );
}

export default memo(ListBlock);
