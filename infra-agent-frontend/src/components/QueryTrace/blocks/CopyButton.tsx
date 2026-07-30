"use client";

import styles from "./blocks.module.css";

interface CopyButtonProps {
  copied: boolean;
  onClick: () => void;
  /** Header row (default) or hover-reveal on plain prose blocks. */
  variant?: "header" | "plain";
  title?: string;
  "aria-label"?: string;
}

function CopyIcon() {
  return (
    <svg
      className={styles.copyControlIcon}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4.75"
        y="4.75"
        width="6.5"
        height="6.5"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M9.25 2.75H3.75C2.89 2.75 2.25 3.39 2.25 4.25V9.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className={styles.copyControlIcon}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7L5.5 9.5L11 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Shared copy-to-clipboard control for trace blocks and cards. */
function CopyButton({
  copied,
  onClick,
  variant = "header",
  title = "Copy to clipboard",
  "aria-label": ariaLabel = "Copy content",
}: CopyButtonProps) {
  const className = [styles.copyControl, variant === "plain" ? styles.copyControlPlain : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      title={title}
      aria-label={copied ? "Copied" : ariaLabel}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

export default CopyButton;
