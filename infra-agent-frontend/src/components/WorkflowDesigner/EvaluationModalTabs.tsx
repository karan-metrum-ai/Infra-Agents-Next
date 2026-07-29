"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import styles from "./EvaluationModal.module.css";
import type { EvaluationTab } from "./EvaluationModal.types";

interface TabDefinition {
  id: EvaluationTab;
  label: string;
}

const TABS: TabDefinition[] = [
  { id: "overview", label: "Intelligence Overview" },
  { id: "agents", label: "Agent Performance" },
  { id: "diagram", label: "Execution Flow" },
];

interface EvaluationModalTabsProps {
  activeTab: EvaluationTab;
  onTabChange: (tab: EvaluationTab) => void;
}

/** Accessible tablist for the trajectory views: `role="tablist"`/`"tab"`
 * with `aria-selected`, roving `tabIndex`, and Left/Right/Home/End keyboard
 * navigation per the WAI-ARIA tabs pattern. */
export function EvaluationModalTabs({ activeTab, onTabChange }: EvaluationModalTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusAndSelect = (index: number) => {
    const tab = TABS[index];
    onTabChange(tab.id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusAndSelect((index + 1) % TABS.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusAndSelect((index - 1 + TABS.length) % TABS.length);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(TABS.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.tabNavigation}>
      <div className={styles.tabContainer} role="tablist" aria-label="Evaluation views">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`evaluation-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`evaluation-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={cn(styles.tabButton, isActive && styles.active)}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default EvaluationModalTabs;
