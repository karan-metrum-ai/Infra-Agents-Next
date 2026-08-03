import type { ReactNode } from "react";

export interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel?: string;
  /** Rendered at the right end of the top bar, alongside the back button. */
  trailing?: ReactNode;
}
