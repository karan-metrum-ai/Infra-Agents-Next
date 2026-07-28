/**
 * `DeviceData` is re-exported from the canonical `./types.ts` definition
 * (which already matches this component's field usage exactly) rather than
 * redeclared here, to avoid a second, drift-prone copy of the same shape.
 */
import type { DeviceData } from "./types";

export type { DeviceData } from "./types";

export interface RackInfoCardProps {
  deviceData: DeviceData | null;
  isSelected: boolean;
  onClose: () => void;
  onToggleSelection: (deviceId: string, selected: boolean) => void;
}
