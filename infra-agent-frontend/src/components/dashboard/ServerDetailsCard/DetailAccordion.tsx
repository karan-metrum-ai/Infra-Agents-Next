"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./ServerDetailsCard.module.css";

interface DetailAccordionProps {
  title: string;
  icon: LucideIcon;
  count: number;
  defaultExpanded?: boolean;
  children: ReactNode;
}

/** Shared collapsible section wrapper used by the GPU telemetry and storage drive sections. */
export function DetailAccordion({
  title,
  icon: Icon,
  count,
  defaultExpanded = false,
  children,
}: DetailAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn(styles.accordionSection, expanded && styles.accordionSectionExpanded)}>
      <button
        type="button"
        className={cn(styles.accordionHeader, expanded && styles.accordionHeaderExpanded)}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className={styles.accordionTitle}>
          <Icon size={14} aria-hidden="true" />
          <span>{title}</span>
          <span className={styles.accordionCount}>{count}</span>
        </div>
        {expanded ? (
          <ChevronDown size={16} aria-hidden="true" />
        ) : (
          <ChevronRight size={16} aria-hidden="true" />
        )}
      </button>
      {expanded && <div className={styles.accordionContent}>{children}</div>}
    </div>
  );
}

export default DetailAccordion;
