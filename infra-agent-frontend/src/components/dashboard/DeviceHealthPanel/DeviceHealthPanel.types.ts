import type { LucideIcon } from "lucide-react";

export interface DeviceHealthPanelProps {
  deviceId: number;
  deviceName: string;
  onClose: () => void;
  /** 'default': fixed left-side positioning. 'right': fills a parent right-side panel container. */
  variant?: "default" | "right";
}

export type TabId = "overview" | "hardware" | "thermal" | "trends" | "events";

export interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}
