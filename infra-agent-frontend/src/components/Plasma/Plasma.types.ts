export interface PlasmaProps {
  /** Override theme primary color (hex). If not set, uses CSS var(--primary). */
  color?: string;
  speed?: number;
  scale?: number;
  opacity?: number;
  mouseInteractive?: boolean;
}
