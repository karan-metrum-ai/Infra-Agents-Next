import { AlertCircle } from "lucide-react";
import styles from "./AgentTeamView.module.css";

interface ErrorOverlayProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorOverlay({ message, onDismiss }: ErrorOverlayProps) {
  return (
    <div className={styles.errorOverlay}>
      <div className={styles.errorCard}>
        <AlertCircle className={styles.errorIcon} aria-hidden="true" />
        <div className={styles.errorContent}>
          <h4 className={styles.errorTitle}>Connection Error</h4>
          <p className={styles.errorMessage}>{message}</p>
        </div>
        <button
          type="button"
          className={styles.errorClose}
          onClick={onDismiss}
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default ErrorOverlay;
