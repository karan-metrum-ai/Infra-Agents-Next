import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { cn } from "@/lib/utils";
import styles from "./Separator.module.css";
import type { SeparatorProps } from "./Separator.types";

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ref,
  ...props
}: SeparatorProps) {
  return (
    <BaseSeparator
      ref={ref}
      orientation={orientation}
      role={decorative ? "none" : undefined}
      className={cn(
        styles.base,
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        className,
      )}
      {...props}
    />
  );
}
