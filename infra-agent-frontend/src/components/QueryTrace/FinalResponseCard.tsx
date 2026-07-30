"use client";

import { useState } from "react";
import CopyButton from "./blocks/CopyButton";
import { RESPONSE_SECTION_LABEL } from "./blocks/AgentBlockGroup";
import MarkdownRenderer from "./MarkdownRenderer";
import blockStyles from "./blocks/blocks.module.css";
import styles from "./FinalResponseCard.module.css";

interface FinalResponseCardProps {
  content: string;
}

/**
 * Highlighted card displaying the final response.
 */
function FinalResponseCard({ content }: FinalResponseCardProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = content || "";
    if (!textToCopy || textToCopy.trim() === "") {
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently degrade.
    }
  };

  return (
    <div className={styles.finalResponseCard}>
      <div className={styles.finalHeader}>
        <span className={styles.finalLabel}>{RESPONSE_SECTION_LABEL}</span>
        <CopyButton
          copied={isCopied}
          onClick={handleCopy}
          title="Copy response"
          aria-label="Copy final response"
        />
      </div>
      <div className={styles.finalContent}>
        <div className={blockStyles.responseProse}>
          <MarkdownRenderer content={content} context="final_response" />
        </div>
      </div>
    </div>
  );
}

export default FinalResponseCard;
