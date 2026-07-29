import type { ReactNode } from "react";

export type FloatingPanelPosition =
  | "top-left"
  | "top-right"
  | "top-center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "left-top"
  | "left-middle"
  | "right-top"
  | "right-middle"
  | "right-bottom";

export type FloatingPanelSize = "small" | "medium" | "large";

export interface FloatingPanelDynamicPosition {
  toolsCollapsed?: boolean;
  agentsCollapsed?: boolean;
  modelClientCollapsed?: boolean;
}

export interface FloatingPanelProps {
  position: FloatingPanelPosition;
  isVisible?: boolean;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
  size?: FloatingPanelSize;
  blur?: boolean;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Controlled collapse state — when provided, `onCollapseChange` drives all updates. */
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  dynamicPosition?: FloatingPanelDynamicPosition;
}
