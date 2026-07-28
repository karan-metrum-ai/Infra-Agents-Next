"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@/lib/utils";
import styles from "./Button.module.css";
import type { ButtonProps, ButtonSize, ButtonVariant } from "./Button.types";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: styles.variantDefault,
  secondary: styles.variantSecondary,
  outline: styles.variantOutline,
  ghost: styles.variantGhost,
  link: styles.variantLink,
  destructive: styles.variantDestructive,
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: styles.sizeDefault,
  sm: styles.sizeSm,
  lg: styles.sizeLg,
  icon: styles.sizeIcon,
  "icon-sm": styles.sizeIconSm,
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ref,
  ...rest
}: ButtonProps) {
  return (
    <BaseButton
      ref={ref}
      className={cn(styles.base, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
      {...rest}
    />
  );
}
