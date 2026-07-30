"use client";

import Shimmer from "./Shimmer";
import PulseDot from "./PulseDot";
import traceStyles from "../TracePanelStateView.module.css";
import tracePanelStyles from "../QueryTracePanel.module.css";
import styles from "./skeletons.module.css";

/**
 * Loading state for QueryTracePanel when trace data is not ready yet.
 *
 * Mirrors the centered `traceStateCard` layout (icon, title, message,
 * flow ID meta, action button) so the transition to the empty or live
 * state does not shift the panel layout.
 */
interface TracePanelStateSkeletonProps {
  /** Optional correlation ID shown in the loading status row. */
  correlationId?: string;
}

function TracePanelStateSkeleton({ correlationId }: TracePanelStateSkeletonProps) {
  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a loading busy-state, which `role="status"` (a live region) models more accurately.
    <div
      className={tracePanelStyles.tracePanel}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label="Loading query execution trace"
    >
      <div className={traceStyles.traceStateCard}>
        <div className={styles.traceStateSkeletonIcon}>
          <Shimmer width={52} height={52} radius={999} />
        </div>

        <Shimmer width={196} height={18} radius={6} className={styles.traceStateSkeletonTitle} />

        <div className={styles.traceStateSkeletonMessage}>
          <Shimmer width="100%" height={12} radius={4} />
          <Shimmer width="88%" height={12} radius={4} />
          <Shimmer width="62%" height={12} radius={4} />
        </div>

        <div className={styles.traceStateSkeletonMeta}>
          <Shimmer width={52} height={12} radius={4} />
          <Shimmer width={84} height={12} radius={4} />
        </div>

        <div className={styles.traceStateSkeletonActions}>
          <Shimmer width={128} height={34} radius={8} />
        </div>

        <div className={styles.traceStateSkeletonStatus}>
          <PulseDot ariaLabel="Loading trace" />
          <span>
            {correlationId ? `Loading trace for ${correlationId.slice(0, 8)}…` : "Loading trace…"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TracePanelStateSkeleton;
