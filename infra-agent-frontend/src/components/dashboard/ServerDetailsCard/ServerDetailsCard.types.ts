export interface ServerDetailsCardProps {
  /** The device ID to fetch details for. */
  deviceId: number;
  /** Device name for display in header. */
  deviceName: string;
  onClose: () => void;
  /** Shows a "Details" footer button when provided. */
  onViewFullDetails?: () => void;
  /** 'default': bottom-left positioning. 'right': fills a parent right-side panel container. */
  variant?: "default" | "right";
}
