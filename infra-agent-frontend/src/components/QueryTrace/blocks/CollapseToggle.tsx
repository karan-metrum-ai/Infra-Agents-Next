"use client";

import styles from "./blocks.module.css";

interface CollapseToggleProps {
  expanded: boolean;
  onToggle: () => void;
  /** Accessible label for screen readers. */
  label?: string;
}

/** Shared expand/collapse control for collapsible trace blocks. */
function CollapseToggle({ expanded, onToggle, label = "Toggle section" }: CollapseToggleProps) {
  return (
    <button
      type="button"
      className={styles.collapseToggle}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
    >
      <svg
        className={styles.collapseChevron}
        data-expanded={expanded ? "true" : "false"}
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3.5 5.25L7 8.75L10.5 5.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default CollapseToggle;
