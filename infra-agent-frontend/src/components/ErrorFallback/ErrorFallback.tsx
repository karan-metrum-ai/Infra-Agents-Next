import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/utils";
import styles from "./ErrorFallback.module.css";
import type { ErrorFallbackProps } from "./ErrorFallback.types";

const DEFAULT_SUBTITLE = "An unexpected error occurred. Check the browser console for details.";

/**
 * Branded error UI shared by route-level and root error boundaries.
 */
export function ErrorFallback({
  title,
  subtitle = DEFAULT_SUBTITLE,
  errorMessage,
  fullScreen = false,
  onRetry,
  secondaryAction,
}: ErrorFallbackProps) {
  return (
    <div
      className={cn(styles.overlay, fullScreen && styles.overlayFullScreen)}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden="true">
          <AlertTriangle size={22} />
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        {errorMessage ? <div className={styles.errorMessage}>{errorMessage}</div> : null}

        {(onRetry || secondaryAction) && (
          <div className={styles.actions}>
            {onRetry ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                <RefreshCw size={14} data-icon />
                Retry
              </Button>
            ) : null}
            {secondaryAction}
          </div>
        )}
      </div>

      {fullScreen ? <span className={styles.brand}>Metrum InfraAgents</span> : null}
    </div>
  );
}
