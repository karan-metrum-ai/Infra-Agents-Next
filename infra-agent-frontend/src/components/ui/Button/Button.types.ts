import type { ComponentPropsWithRef } from "react";
import type { Button as BaseButton } from "@base-ui/react/button";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "link" | "destructive";

export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm";

export interface ButtonProps extends ComponentPropsWithRef<typeof BaseButton> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}
