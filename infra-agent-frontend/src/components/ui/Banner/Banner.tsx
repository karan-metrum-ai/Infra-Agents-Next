"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMountEffect } from "@/hooks/useMountEffect";
import styles from "./Banner.module.css";
import type { BannerPosition, BannerProps, BannerVariant } from "./Banner.types";

const COLOR_CLASSES: Record<BannerVariant, string> = {
  default: styles.variantDefault,
  info: styles.variantInfo,
  success: styles.variantSuccess,
  warning: styles.variantWarning,
  error: styles.variantError,
  violet: styles.variantViolet,
  gradient: styles.variantGradient,
};

const POSITION_CLASSES: Record<BannerPosition, string> = {
  top: styles.positionTop,
  inline: styles.positionInline,
};

export function Banner({
  className,
  variant = "default",
  position = "top",
  icon,
  action,
  dismissible = false,
  onDismiss,
  storageKey,
  children,
  ref,
  ...rest
}: BannerProps & { ref?: React.Ref<HTMLElement> }) {
  const [visible, setVisible] = useState(true);

  useMountEffect(() => {
    if (!storageKey) return;
    try {
      if (localStorage.getItem(storageKey) === "dismissed") setVisible(false);
    } catch {
      /* noop */
    }
  });

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "dismissed");
      } catch {
        /* noop */
      }
    }
    onDismiss?.();
  };

  const inner = (
    <header
      ref={ref}
      data-slot="banner"
      className={cn(styles.base, COLOR_CLASSES[variant], POSITION_CLASSES[position], className)}
      {...rest}
    >
      {icon && (
        <span aria-hidden className={styles.iconWrapper}>
          {icon}
        </span>
      )}

      <span className={styles.content}>{children}</span>

      {action && <span className={styles.actionWrapper}>{action}</span>}

      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className={styles.dismissButton}
        >
          <X className={styles.dismissIcon} />
        </button>
      )}
    </header>
  );

  if (position === "top") {
    return <div className={styles.stickyWrapper}>{inner}</div>;
  }

  return inner;
}
