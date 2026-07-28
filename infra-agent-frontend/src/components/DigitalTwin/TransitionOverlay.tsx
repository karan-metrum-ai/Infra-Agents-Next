/**
 * Full-screen zoom/loading transition overlay shown while
 * `DataCenterDigitalTwin` animates between the globe and a site's
 * interior/exterior view.
 */

import styles from "./DataCenterDigitalTwin.module.css";
import type { TransitionOverlayProps } from "./DataCenterDigitalTwin.types";

export function TransitionOverlay({ transitionState, siteName }: TransitionOverlayProps) {
  if (transitionState === "idle") return null;

  const backdropVisible = transitionState === "zooming-in" || transitionState === "zooming-out";

  return (
    <output className={styles.transitionOverlay} aria-live="polite">
      <div
        className={`${styles.transitionBackdrop} ${backdropVisible ? styles.transitionBackdropVisible : ""}`}
      />

      {transitionState === "loading" && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinnerRing} aria-hidden="true" />
          <div className={styles.loadingLabel}>Loading {siteName}...</div>
        </div>
      )}

      {transitionState === "zooming-in" && (
        <div className={styles.zoomDotWrap}>
          <div className={styles.zoomDot} aria-hidden="true" />
        </div>
      )}
    </output>
  );
}
