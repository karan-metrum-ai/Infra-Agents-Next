"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import MarkdownRenderer from "../MarkdownRenderer";
import { useReasoningToggleState } from "./useReasoningToggleState";
import styles from "./AgentTrace.module.css";

interface ReasoningBlockProps {
  thoughts: string[];
  streaming?: boolean;
  /** Initial open state -- true for last 3 agents. */
  defaultOpen?: boolean;
}

/**
 * v1 legacy-trace reasoning accordion: single collapsible block that
 * renders ALL reasoning thoughts as one passage. Opens while streaming,
 * collapses when done.
 *
 * Distinct from `blocks/ReasoningBlock.tsx`, which renders the v2
 * SSE block-stream's per-block `ReasoningBlock` shape (see
 * `blocks/v1AgentAdapter.ts` for how the two rendering paths coexist —
 * `AgentTraceView`/`AgentSection` render this v1 component for agents
 * with no persisted v2 block stream).
 */
function ReasoningBlock({ thoughts, streaming = false, defaultOpen = false }: ReasoningBlockProps) {
  const [isOpen, setIsOpen] = useReasoningToggleState(streaming, defaultOpen);
  /** Phase 16: instant expand/collapse when reduced motion is enabled. */
  const prefersReducedMotion = useReducedMotion();

  if (!thoughts || thoughts.length === 0) {
    return null;
  }

  const joined = thoughts.join("\n\n");

  return (
    <div className={styles.reasoningBlock}>
      <button
        type="button"
        className={styles.reasoningToggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={streaming ? styles.reasoningLabel : undefined}>Reasoning</span>
        <span className={styles.reasoningChevron} data-open={isOpen}>
          ^
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="reasoning-body"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }
            }
            className={styles.reasoningBody}
          >
            <MarkdownRenderer content={joined} context="reasoning" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReasoningBlock;
