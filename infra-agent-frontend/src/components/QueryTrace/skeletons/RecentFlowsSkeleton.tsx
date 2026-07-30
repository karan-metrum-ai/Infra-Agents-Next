"use client";

import Shimmer from "./Shimmer";
import styles from "./skeletons.module.css";

/**
 * Loading state for the Recent Flows dropdown.
 *
 * Renders a fixed number of placeholder rows that match the live
 * row layout (avatar + query + timestamp + status pill) so the
 * dropdown does not jump in height when the data lands.
 */
interface RecentFlowsSkeletonProps {
  /** Number of placeholder rows to render. Defaults to 5. */
  rows?: number;
}

function RecentFlowsSkeleton({ rows = 5 }: RecentFlowsSkeletonProps) {
  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a loading busy-state, which `role="status"` (a live region) models more accurately.
    <div
      className={styles.recentFlowsSkeleton}
      aria-busy="true"
      aria-live="polite"
      role="status"
      aria-label="Loading recent flows"
    >
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className={styles.recentFlowsRow}>
          <Shimmer width={28} height={28} radius={6} />
          <div className={styles.recentFlowsRowText}>
            <Shimmer width="70%" height={11} radius={4} />
            <Shimmer width="38%" height={9} radius={4} />
          </div>
          <Shimmer width={56} height={18} radius={9} />
        </div>
      ))}
    </div>
  );
}

export default RecentFlowsSkeleton;
