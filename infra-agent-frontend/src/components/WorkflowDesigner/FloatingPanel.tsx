"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./FloatingPanel.module.css";
import type { FloatingPanelProps } from "./FloatingPanel.types";

const POSITION_CLASS: Record<string, string> = {
  "top-left": styles["position-top-left"],
  "top-right": styles["position-top-right"],
  "top-center-right": styles["position-top-center-right"],
  "bottom-left": styles["position-bottom-left"],
  "bottom-center": styles["position-bottom-center"],
  "bottom-right": styles["position-bottom-right"],
  "left-top": styles["position-left-top"],
  "left-middle": styles["position-left-middle"],
  "right-top": styles["position-right-top"],
  "right-middle": styles["position-right-middle"],
  "right-bottom": styles["position-right-bottom"],
};

const SIZE_CLASS: Record<string, string> = {
  small: styles["size-small"],
  medium: styles["size-medium"],
  large: styles["size-large"],
};

/**
 * A fixed-position, collapsible glass panel used all over the Workflow
 * Designer canvas (side panels, top navigation pills, action buttons).
 * Collapse state can be controlled (`collapsed`/`onCollapseChange`) or
 * uncontrolled (internal state) — either way, the toggle button is the
 * single place that notifies the parent, so no effect is needed to keep
 * them in sync (see `.cursor/skills/sans-effect`).
 */
export function FloatingPanel({
  position,
  isVisible = true,
  onClose,
  className = "",
  children,
  size = "medium",
  blur = true,
  title,
  collapsible = true,
  defaultCollapsed = false,
  collapsed,
  onCollapseChange,
  dynamicPosition,
}: FloatingPanelProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isControlled = collapsed !== undefined;
  const isCollapsed = isControlled ? collapsed : internalCollapsed;

  if (!isVisible) return null;

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    if (!isControlled) {
      setInternalCollapsed(next);
    }
    onCollapseChange?.(next);
  };

  const dynamicPositionClass = (() => {
    if (position === "right-top" && dynamicPosition) {
      return dynamicPosition.toolsCollapsed && dynamicPosition.modelClientCollapsed
        ? styles["position-right-top-full-height"]
        : styles["position-right-top"];
    }
    return POSITION_CLASS[position];
  })();

  const mixedStateClass = (() => {
    if (!dynamicPosition) return "";
    if (position === "right-top" && isCollapsed && !dynamicPosition.toolsCollapsed) {
      return styles["tools-expanded"];
    }
    if (position === "right-bottom" && isCollapsed && !dynamicPosition.agentsCollapsed) {
      return styles["agents-expanded"];
    }
    return "";
  })();

  return (
    <div
      className={cn(
        styles.floatingPanel,
        dynamicPositionClass,
        SIZE_CLASS[size],
        blur && styles.blur,
        isCollapsed && styles.collapsed,
        mixedStateClass,
        className,
      )}
    >
      {(title || collapsible || onClose) && (
        <div className={styles.panelHeader}>
          {title && <h3 className={styles.panelTitle}>{title}</h3>}
          <div className={styles.panelControls}>
            {collapsible && (
              <button
                type="button"
                onClick={handleToggleCollapse}
                className={styles.controlButton}
                aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? (
                  <ChevronUp className={styles.controlIcon} aria-hidden="true" />
                ) : (
                  <ChevronDown className={styles.controlIcon} aria-hidden="true" />
                )}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={styles.controlButton}
                aria-label="Close panel"
              >
                <X className={styles.controlIcon} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className={styles.panelContent}>{children}</div>
    </div>
  );
}

export default FloatingPanel;
