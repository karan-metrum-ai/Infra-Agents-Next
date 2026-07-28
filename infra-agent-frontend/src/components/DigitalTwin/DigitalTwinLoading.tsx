/**
 * DigitalTwinLoading Component
 *
 * Full-screen loading state for the Digital Twin / Physical Systems page.
 * Displays while fetching infrastructure data from the API.
 * Visual language matches the LiveDashboard loading states.
 */

import styles from "./DigitalTwinStates.module.css";

interface DigitalTwinLoadingProps {
  /** Optional secondary line shown below the subtitle. */
  hint?: string;
}

export function DigitalTwinLoading({ hint }: DigitalTwinLoadingProps) {
  return (
    <output className={styles.loadingContainer} aria-live="polite">
      <div className={styles.spinner} aria-hidden="true" />
      <div className={styles.loadingTitle}>Loading infrastructure topology...</div>
      <div className={styles.loadingSubtitle}>Fetching data center and device information</div>
      {hint && <div className={styles.loadingHint}>{hint}</div>}
    </output>
  );
}

export default DigitalTwinLoading;
