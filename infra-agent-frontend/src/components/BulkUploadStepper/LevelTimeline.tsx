import { AlertCircle, CheckCircle2, Layers, Loader2 } from "lucide-react";
import { LEVEL_CONFIG, type LevelResult } from "@/features/onboarding/onboardingApi.types";
import { cn } from "@/lib/utils";
import styles from "./LevelTimeline.module.css";

interface LevelTimelineProps {
  levels: LevelResult[];
  isUploading?: boolean;
}

/**
 * The 5-level hierarchy tracker shown during the uploading/success/failure
 * phases. Extracted from `BulkUploadStepper.tsx` (it was a bottom-of-file
 * local sub-component in the Vite source, ~113 LOC) into its own
 * co-located sibling file, per this app's "decompose oversized files"
 * convention.
 */
export function LevelTimeline({ levels, isUploading = false }: LevelTimelineProps) {
  return (
    <div className={styles.levelList}>
      <div className={styles.levelListHeader}>
        <Layers size={13} aria-hidden="true" />
        <span>Hierarchy levels</span>
      </div>

      <ol className={styles.levelOrderedList}>
        {levels.map((lr, idx) => {
          const cfg = LEVEL_CONFIG[lr.level];
          const isActive = isUploading && lr.status === "processing";

          return (
            <li
              key={lr.level}
              className={cn(
                styles.levelRow,
                lr.status === "completed" && styles.levelDone,
                lr.status === "failed" && styles.levelFail,
                lr.status === "skipped" && styles.levelSkip,
                isActive && styles.levelActive,
              )}
            >
              {idx < levels.length - 1 && (
                <div
                  className={cn(
                    styles.connector,
                    lr.status === "completed" && styles.connectorDone,
                  )}
                  aria-hidden="true"
                />
              )}

              <div className={styles.levelDot} aria-hidden="true">
                {lr.status === "completed" && <CheckCircle2 size={13} />}
                {lr.status === "failed" && <AlertCircle size={13} />}
                {isActive && <Loader2 size={13} className={styles.spin} />}
                {(lr.status === "pending" || lr.status === "skipped") && (
                  <span className={styles.dotInner}>
                    {lr.status === "skipped" ? "—" : lr.level}
                  </span>
                )}
              </div>

              <div className={styles.levelContent}>
                <div className={styles.levelTop}>
                  <span className={styles.levelName}>{lr.level_name}</span>

                  {lr.status !== "pending" && (
                    <span
                      className={cn(
                        styles.levelBadge,
                        lr.status === "completed" && styles.badgeDone,
                        lr.status === "failed" && styles.badgeFail,
                        lr.status === "skipped" && styles.badgeSkip,
                        isActive && styles.badgeActive,
                      )}
                    >
                      {isActive
                        ? "Processing…"
                        : lr.status === "completed"
                          ? `+${lr.total_created}`
                          : lr.status === "failed"
                            ? "Failed"
                            : lr.status === "skipped"
                              ? "Skipped"
                              : ""}
                    </span>
                  )}
                </div>

                {lr.status === "pending" && cfg?.description && (
                  <p className={styles.levelDesc}>{cfg.description}</p>
                )}

                {(lr.object_types?.length ?? 0) > 0 && (
                  <div className={styles.typeList}>
                    {lr.object_types.map((t) => (
                      <div key={t.object_type} className={styles.typeRow}>
                        <code className={styles.typeCode}>{t.object_type}</code>
                        <span className={styles.typeStats}>
                          {t.created > 0 && (
                            <span className={styles.statCreated}>{t.created} created</span>
                          )}
                          {t.skipped > 0 && (
                            <span className={styles.statSkipped}>{t.skipped} skipped</span>
                          )}
                          {t.failed > 0 && (
                            <span className={styles.statFailed}>{t.failed} failed</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default LevelTimeline;
