"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./DeviceHealthPanel.module.css";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  count: number;
  children: ReactNode;
  defaultExpanded?: boolean;
}

/** Expandable section for hardware details. */
export function CollapsibleSection({
  title,
  icon: Icon,
  count,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn(styles.collapsibleSection, expanded && styles.collapsibleSectionExpanded)}>
      <button
        type="button"
        className={cn(styles.collapsibleHeader, expanded && styles.collapsibleHeaderExpanded)}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className={styles.collapsibleTitle}>
          <Icon size={14} aria-hidden="true" />
          <span>{title}</span>
          <span className={styles.collapsibleCount}>{count}</span>
        </div>
        {expanded ? (
          <ChevronDown size={16} aria-hidden="true" />
        ) : (
          <ChevronRight size={16} aria-hidden="true" />
        )}
      </button>
      {expanded && <div className={styles.collapsibleContent}>{children}</div>}
    </div>
  );
}

/** Shown when no data is available for a section. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className={styles.emptyState}>
      <Info size={16} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
