import type { ReactNode } from "react";

export interface ErrorFallbackProps {
  /** Heading shown in the error card. */
  title: string;
  /** Supporting copy below the heading. */
  subtitle?: string;
  /** Optional underlying error message. */
  errorMessage?: string;
  /** When true, fills the viewport like a full-screen overlay. */
  fullScreen?: boolean;
  /** Retry handler. When omitted, no retry button is shown. */
  onRetry?: () => void;
  /** Optional secondary action rendered beside retry. */
  secondaryAction?: ReactNode;
}
