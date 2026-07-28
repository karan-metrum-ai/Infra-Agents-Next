import type { HTMLAttributes, ReactNode } from "react";

export type BannerVariant =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "violet"
  | "gradient";
export type BannerPosition = "top" | "inline";

export interface BannerProps extends HTMLAttributes<HTMLElement> {
  variant?: BannerVariant;
  position?: BannerPosition;
  icon?: ReactNode;
  action?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  storageKey?: string;
}
