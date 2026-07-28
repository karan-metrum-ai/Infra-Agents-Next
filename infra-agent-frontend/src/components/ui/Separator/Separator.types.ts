import type { ComponentPropsWithRef } from "react";
import type { Separator as BaseSeparator } from "@base-ui/react/separator";

export interface SeparatorProps extends ComponentPropsWithRef<typeof BaseSeparator> {
  decorative?: boolean;
}
