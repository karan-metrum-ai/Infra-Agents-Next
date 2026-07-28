"use client";

/**
 * Bottom-right Interior/Exterior view-mode pill toggle.
 */

import { Building2, Eye } from "lucide-react";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinViewModeToggleProps } from "./DataCenterDigitalTwin.types";

export function DigitalTwinViewModeToggle({
  viewMode,
  showContent,
  onViewModeChange,
}: DigitalTwinViewModeToggleProps) {
  return (
    <div
      className={`${styles.viewModeTogglePanel} ${showContent ? styles.viewModeToggleVisible : styles.viewModeToggleHidden}`}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would add a visible border/legend that doesn't fit this pill toggle
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onViewModeChange("interior")}
        className={`${styles.viewModeButton} ${viewMode === "interior" ? styles.viewModeButtonActive : ""}`}
        aria-pressed={viewMode === "interior"}
      >
        <Eye size={16} aria-hidden="true" />
        Interior
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("exterior")}
        className={`${styles.viewModeButton} ${viewMode === "exterior" ? styles.viewModeButtonActive : ""}`}
        aria-pressed={viewMode === "exterior"}
      >
        <Building2 size={16} aria-hidden="true" />
        Exterior
      </button>
    </div>
  );
}
