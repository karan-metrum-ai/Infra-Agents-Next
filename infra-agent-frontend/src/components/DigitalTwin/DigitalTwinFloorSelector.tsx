"use client";

/**
 * Vertical floor-picker HUD (left edge) for the interior/exterior 3D view.
 */

import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinFloorSelectorProps } from "./DataCenterDigitalTwin.types";

export function DigitalTwinFloorSelector({
  currentFloor,
  totalFloors,
  showContent,
  onFloorChange,
}: DigitalTwinFloorSelectorProps) {
  const floors = Array.from({ length: totalFloors }, (_, i) => totalFloors - i);

  return (
    <div
      className={`${styles.floorSelectorPanel} ${showContent ? styles.floorSelectorVisible : styles.floorSelectorHidden}`}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would add a visible border/legend that doesn't fit this HUD panel
      role="group"
      aria-label="Floor selector"
    >
      <div className={styles.floorProgressTrack}>
        <div
          className={styles.floorProgressFill}
          style={{ height: `${(currentFloor / totalFloors) * 100}%` }}
        />
      </div>

      <div className={styles.floorButtonsContainer}>
        {floors.map((floor) => (
          <button
            key={floor}
            type="button"
            onClick={() => onFloorChange(floor)}
            className={`${styles.floorButton} ${currentFloor === floor ? styles.floorButtonActive : ""}`}
            aria-pressed={currentFloor === floor}
            aria-label={`Floor ${floor}`}
          >
            F{floor}
          </button>
        ))}
      </div>
    </div>
  );
}
