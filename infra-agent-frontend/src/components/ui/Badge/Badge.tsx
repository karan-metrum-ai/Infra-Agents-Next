import { cn } from "@/lib/utils";
import styles from "./Badge.module.css";
import type { BadgeProps, BadgeVariant } from "./Badge.types";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: styles.variantDefault,
  secondary: styles.variantSecondary,
  destructive: styles.variantDestructive,
  outline: styles.variantOutline,
  success: styles.variantSuccess,
  warning: styles.variantWarning,
  info: styles.variantInfo,
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(styles.base, VARIANT_CLASSES[variant], className)}
      {...props}
    />
  );
}
