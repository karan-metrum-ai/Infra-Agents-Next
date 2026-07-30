"use client";

import { memo } from "react";
import BlockFrame from "./BlockFrame";
import styles from "./blocks.module.css";
import type { ErrorBlock as ErrorBlockType } from "../blockStream/types";

/**
 * Terminal error block.
 *
 * Per PRD Rule 3, the backend token-heals truncated outputs and emits
 * an `error` block when the model could not produce a valid structure.
 * Always rendered as locked + failed so no further updates occur.
 */
interface ErrorBlockProps {
  block: ErrorBlockType;
}

function ErrorBlock({ block }: ErrorBlockProps) {
  return (
    <BlockFrame kind="Error" status="failed" locked className={styles.errorBlock}>
      <div className={styles.errorMessage}>{block.message}</div>
    </BlockFrame>
  );
}

export default memo(ErrorBlock);
