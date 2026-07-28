export type ProfileAvatarPosition = "fixed" | "absolute" | "inline";

export interface ProfileAvatarProps {
  position?: ProfileAvatarPosition;
  className?: string;
}
