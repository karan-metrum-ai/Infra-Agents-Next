"use client";

import Shimmer from "./Shimmer";
import PulseDot from "./PulseDot";
import styles from "./skeletons.module.css";
import tracePanelStyles from "../QueryTracePanel.module.css";

/**
 * Layout-stable loading state for `QueryTracePanel`.
 *
 * Mirrors the real panel's structure (header row, phase bar, two
 * placeholder agent cards, final response card) so the live content
 * replaces the skeleton without any layout shift.
 *
 * Marked `aria-busy=true` and `role=status` so assistive tech
 * announces a single "Loading trace" event instead of one per
 * shimmer block.
 */
interface TracePanelSkeletonProps {
  /** Optional correlation ID to display in the header — keeps the user oriented. */
  correlationId?: string;
}

function TracePanelSkeleton({ correlationId }: TracePanelSkeletonProps) {
  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a loading busy-state, which `role="status"` (a live region) models more accurately.
    <div className={tracePanelStyles.tracePanel} aria-busy="true" aria-live="polite" role="status">
      <div className={styles.tracePanelSkeleton}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonHeaderLeft}>
            <Shimmer width="60%" height={14} radius={4} />
            <div className={styles.skeletonStatusRow}>
              <PulseDot ariaLabel="Connecting" />
              <span>
                {correlationId
                  ? `Loading trace for ${correlationId.slice(0, 8)}…`
                  : "Loading trace…"}
              </span>
            </div>
          </div>
          <div className={styles.skeletonHeaderRight}>
            <Shimmer width={72} height={24} radius={6} />
            <Shimmer width={72} height={24} radius={6} />
          </div>
        </div>

        <div className={styles.skeletonPhaseBar}>
          <Shimmer width={88} height={22} radius={12} />
          <Shimmer width={88} height={22} radius={12} />
          <Shimmer width={88} height={22} radius={12} />
          <Shimmer width={88} height={22} radius={12} />
        </div>

        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className={styles.skeletonAgentCard}>
            <div className={styles.skeletonAgentHeader}>
              <Shimmer width={32} height={32} radius={8} />
              <div className={styles.skeletonAgentMeta}>
                <Shimmer width="40%" height={12} radius={4} />
                <Shimmer width="22%" height={10} radius={4} />
              </div>
              <Shimmer width={60} height={20} radius={10} />
            </div>
            <div className={styles.skeletonAgentBody}>
              <Shimmer width="100%" height={10} radius={4} />
              <Shimmer width="92%" height={10} radius={4} />
              <Shimmer width="58%" height={10} radius={4} />
            </div>
          </div>
        ))}

        <div className={styles.skeletonFinalResponse}>
          <div className={styles.skeletonFinalResponseHeader}>
            <div className={styles.skeletonFinalResponseLabel}>
              <PulseDot ariaLabel="Awaiting final response" />
              <span>Response</span>
            </div>
            <Shimmer width={32} height={20} radius={6} />
          </div>
          <Shimmer width="100%" height={10} radius={4} />
          <Shimmer width="100%" height={10} radius={4} />
          <Shimmer width="78%" height={10} radius={4} />
          <Shimmer width="40%" height={10} radius={4} />
        </div>
      </div>
    </div>
  );
}

export default TracePanelSkeleton;
