import type { SVGAttributes } from "react";

export type SpinnerSize = "sm" | "default" | "lg" | "xl";
export type SpinnerVariant = "default" | "secondary" | "white";

export interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}
