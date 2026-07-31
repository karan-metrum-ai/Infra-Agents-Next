"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./ReasoningAccordion.module.css";

interface ReasoningAccordionProps {
  reasoning: string[];
}

/**
 * Collapsible accordion for displaying agent reasoning process.
 * Uses markdown rendering for proper formatting of JSON, links, and text.
 */
function ReasoningAccordion({ reasoning }: ReasoningAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  /** Phase 16: instant expand/collapse when reduced motion is enabled. */
  const prefersReducedMotion = useReducedMotion();

  if (!reasoning || reasoning.length === 0) {
    return null;
  }

  return (
    <div className={styles.reasoningSection}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.reasoningToggle}
        type="button"
        aria-expanded={isOpen}
      >
        {isOpen ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
        <span>Reasoning Process</span>
        <span className={styles.reasoningCount}>
          {reasoning.length} step{reasoning.length !== 1 ? "s" : ""}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeInOut" }
            }
            className={styles.reasoningContent}
          >
            <div className={styles.reasoningSteps}>
              {reasoning.map((step, index) => (
                <div key={index} className={styles.reasoningStep}>
                  <div className={styles.stepNumber}>{index + 1}</div>
                  <div className={styles.stepText}>
                    <MarkdownRenderer content={step} context="reasoning" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReasoningAccordion;
