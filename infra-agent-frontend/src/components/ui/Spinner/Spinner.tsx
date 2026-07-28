import type { Ref } from "react";
import { cn } from "@/lib/utils";
import styles from "./Spinner.module.css";
import type { SpinnerProps, SpinnerSize, SpinnerVariant } from "./Spinner.types";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: styles.sizeSm,
  default: styles.sizeDefault,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  default: styles.variantDefault,
  secondary: styles.variantSecondary,
  white: styles.variantWhite,
};

export function Spinner({
  className,
  size = "default",
  variant = "default",
  ref,
  ...props
}: SpinnerProps & { ref?: Ref<SVGSVGElement> }) {
  return (
    <svg
      ref={ref}
      data-slot="spinner"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={cn(styles.base, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
      {...props}
    >
      <circle
        className={styles.track}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className={styles.arc}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
