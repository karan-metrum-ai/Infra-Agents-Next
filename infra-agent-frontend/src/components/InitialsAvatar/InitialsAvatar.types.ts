export type InitialsAvatarSize = "sm" | "md";

export interface InitialsAvatarProps {
  initials: string;
  size?: InitialsAvatarSize;
  className?: string;
  alt?: string;
}
