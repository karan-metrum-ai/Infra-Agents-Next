import { cn } from "@/lib/utils";
import styles from "./Kbd.module.css";
import type { KbdProps } from "./Kbd.types";

/**
 * Small, muted, inline keyboard-shortcut hint -- the "Linear/Notion style"
 * `kbd` chip required by `.cursor/rules/frontend/006-cmdk.mdc` next to any
 * action that has a Cmd+K/keyboard equivalent (buttons, menu items,
 * tooltips, sidebar links). Purely presentational, theme-aware via CSS
 * variables.
 */
export function Kbd({ keys, className, ...rest }: KbdProps) {
  return (
    <span className={cn(styles.group, className)} {...rest}>
      {keys.map((key, index) => (
        // eslint-disable-next-line react/no-array-index-key -- keys is a short, static, order-significant tuple (e.g. ["⌘", "K"]); there's no stabler identity than position.
        <kbd key={index} className={styles.key}>
          {key}
        </kbd>
      ))}
    </span>
  );
}

export default Kbd;
