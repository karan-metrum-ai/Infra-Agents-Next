"use client";

/**
 * Shared hostname-badge color palette for rack device labels (server bay
 * + CDU bay Html overlays). Kept as a helper so `RackDeviceSlot` and
 * `RackCduBay` don't duplicate the same conditional literal-color logic.
 */

export type DeviceLabelVariant = "server" | "cdu";

export interface DeviceLabelPalette {
  background: string;
  hoverBackground: string;
  color: string;
  border: string;
  boxShadow: string;
}

export function getDeviceLabelPalette(
  isSelected: boolean,
  isCritical: boolean,
  variant: DeviceLabelVariant,
): DeviceLabelPalette {
  const background = isSelected
    ? "rgba(37, 99, 235, 0.92)"
    : isCritical
      ? "rgba(28, 22, 23, 0.92)"
      : variant === "cdu"
        ? "rgba(30, 42, 46, 0.88)"
        : "rgba(37, 37, 40, 0.88)";

  const hoverBackground = isSelected
    ? "rgba(29, 78, 216, 0.95)"
    : isCritical
      ? "rgba(39, 26, 27, 0.95)"
      : variant === "cdu"
        ? "rgba(37, 53, 56, 0.92)"
        : "rgba(51, 51, 56, 0.92)";

  const color = isCritical ? "#f87171" : variant === "cdu" ? "#9dd5e8" : "#fff";

  const border = isSelected
    ? "1px solid #3b82f6"
    : isCritical
      ? "1px solid #dc2626"
      : variant === "cdu"
        ? "1px solid #2a5a6a"
        : "1px solid #3f3f46";

  const boxShadow = isCritical ? "0 0 12px rgba(220, 38, 38, 0.4)" : "0 1px 4px rgba(0,0,0,0.4)";

  return { background, hoverBackground, color, border, boxShadow };
}
