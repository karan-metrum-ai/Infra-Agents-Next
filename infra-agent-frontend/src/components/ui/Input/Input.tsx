import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";
import styles from "./Input.module.css";

export type InputProps = ComponentPropsWithRef<typeof BaseInput>;

export function Input({ className, ref, ...props }: InputProps) {
  return (
    <BaseInput ref={ref} data-slot="input" className={cn(styles.input, className)} {...props} />
  );
}
