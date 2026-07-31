import type { HTMLAttributes } from "react";

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** Individual keys to render as separate `<kbd>` chips, e.g. `["⌘", "K"]`. */
  keys: string[];
}
