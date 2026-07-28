import { cn } from "@/lib/utils";
import styles from "./InitialsAvatar.module.css";
import type { InitialsAvatarProps } from "./InitialsAvatar.types";

/** Circular fallback avatar rendering a user's initials when no picture is available. */
export function InitialsAvatar({
  initials,
  size = "sm",
  className = "",
  alt,
}: InitialsAvatarProps) {
  const sizeClass = size === "md" ? styles.md : styles.sm;

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- text initials standing in for a profile image, not a static <img>
    <span
      className={cn(styles.avatar, sizeClass, className)}
      role="img"
      aria-label={alt ?? `Avatar ${initials}`}
    >
      {initials}
    </span>
  );
}

export default InitialsAvatar;
