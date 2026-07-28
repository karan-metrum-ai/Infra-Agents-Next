export interface SwitchDetailsCardProps {
  /** NetBox device id of the SONiC switch to inspect. */
  deviceId: number;
  /** Display name shown in the card header. */
  deviceName: string;
  /** Invoked when the user dismisses the card. */
  onClose: () => void;
  /**
   * `"default"` floats the card bottom-left over the 3D scene; `"right"`
   * fills its parent panel edge-to-edge (split view layout).
   */
  variant?: "default" | "right";
}
