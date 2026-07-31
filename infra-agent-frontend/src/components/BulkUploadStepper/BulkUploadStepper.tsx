"use client";

/**
 * CSV bulk-upload wizard: pick a `.csv` file, optionally assign it to a
 * cluster (existing or newly created), upload it, and watch the 5-level
 * hierarchy ingestion result. Ported from the Vite app's
 * `components/BulkUploadStepper.tsx` (1123 LOC, decomposed here into this
 * orchestrator + `LevelTimeline.tsx` + `CsvFormatModal.tsx` +
 * `bulkUploadHelpers.ts`, per Phase 11 of `CLAUDE.md`).
 *
 * **Deliberate behavior change from the Vite source**: the Vite component
 * gated its entire dropzone, cluster-assignment section, and Upload button
 * behind `const CSV_UPLOAD_UI_DISABLED = true`, rendering them
 * non-interactive/grayed-out. Per explicit product direction for this
 * port, that flag has been dropped entirely — the dropzone (drag/drop,
 * click-to-browse, keyboard activation), cluster assignment, and Upload
 * button are fully interactive here.
 */

import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  RefreshCw,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useGetClusterIdsQuery } from "@/features/teams/teamsApi";
import { useSingleStepUploadMutation } from "@/features/onboarding/onboardingApi";
import {
  LEVEL_ORDER,
  type SingleStepError,
  type SingleStepUploadResponse,
} from "@/features/onboarding/onboardingApi.types";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";
import { cn } from "@/lib/utils";
import {
  buildDisplayLevels,
  CLUSTER_MODE_OPTIONS,
  extractError,
  fmtBytes,
  validateFile,
  type ClusterMode,
  type Phase,
} from "./bulkUploadHelpers";
import { CsvFormatModal } from "./CsvFormatModal";
import { LevelTimeline } from "./LevelTimeline";
import styles from "./BulkUploadStepper.module.css";
import type { BulkUploadStepperProps } from "./BulkUploadStepper.types";

/** The small elapsed-seconds readout shown while a file is uploading.
 * Rendered only for the lifetime of the uploading phase (its parent
 * conditionally mounts it), so `useElapsedSeconds`'s internal timer
 * (Pattern 4, see that hook's doc comment) starts fresh at 0 for every
 * upload attempt with no manual reset logic required. */
function UploadingElapsedNote() {
  const elapsed = useElapsedSeconds();
  return (
    <span className={styles.processingSub}>
      Validating across all 5 levels · {elapsed}s elapsed
    </span>
  );
}

function PhasePill({ phase }: { phase: Phase }) {
  const meta: Record<Phase, { label: string; cls: string }> = {
    setup: { label: "Ready", cls: styles.pillIdle },
    uploading: { label: "Uploading", cls: styles.pillActive },
    success: { label: "Complete", cls: styles.pillSuccess },
    failure: { label: "Failed", cls: styles.pillFail },
  };
  const m = meta[phase];
  return (
    <span className={cn(styles.phasePill, m.cls)}>
      {phase === "uploading" ? (
        <Loader2 size={11} className={styles.spin} aria-hidden="true" />
      ) : phase === "success" ? (
        <Check size={11} aria-hidden="true" />
      ) : phase === "failure" ? (
        <AlertCircle size={11} aria-hidden="true" />
      ) : (
        <Settings2 size={11} aria-hidden="true" />
      )}
      {m.label}
    </span>
  );
}

export function BulkUploadStepper({ onComplete }: BulkUploadStepperProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [clusterMode, setClusterMode] = useState<ClusterMode>("existing");
  const [clusterId, setClusterId] = useState<number | null>(null);
  const [clusterName, setClusterName] = useState("");

  const [result, setResult] = useState<SingleStepUploadResponse | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);

  const { data: clusterData } = useGetClusterIdsQuery();
  const [upload, { isLoading: isUploading }] = useSingleStepUploadMutation();

  const phase: Phase = useMemo(() => {
    if (isUploading) return "uploading";
    if (sysError) return "failure";
    if (result?.success) return "success";
    if (result && !result.success) return "failure";
    return "setup";
  }, [isUploading, sysError, result]);

  // Within the setup phase, stage1 = no file yet, stage2 = file ready.
  const inStage2 = phase === "setup" && !!file && !fileError;

  const clusters = useMemo(
    () => (clusterData?.cluster_ids ?? []).filter((c) => c.cluster_id != null),
    [clusterData],
  );

  const pickFile = useCallback((next: File | null) => {
    // Picking a new file resets any previous result.
    setResult(null);
    setSysError(null);
    if (!next) {
      setFile(null);
      setFileError(null);
      return;
    }
    const err = validateFile(next);
    if (err) {
      setFile(null);
      setFileError(err);
      return;
    }
    setFile(next);
    setFileError(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setDragging(false);
      pickFile(e.dataTransfer.files?.[0] ?? null);
    },
    [pickFile],
  );

  /** Clear only the file; keep cluster state in case the user re-uploads. */
  const clearFile = useCallback(() => {
    setFile(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  /** Full reset after upload completion. */
  const handleReset = useCallback(() => {
    setFile(null);
    setFileError(null);
    setResult(null);
    setSysError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setFileError("Select a CSV file first.");
      return;
    }
    if (clusterMode === "existing" && !clusterId) {
      toast.error("Pick a cluster from the list, or switch to a different option.");
      return;
    }
    if (clusterMode === "create" && !clusterName.trim()) {
      toast.error("Give your new cluster a name.");
      return;
    }

    setResult(null);
    setSysError(null);

    try {
      const res = await upload({
        csv_file: file,
        tenant_id: clusterMode === "existing" ? (clusterId ?? undefined) : undefined,
        create_tenant_name: clusterMode === "create" ? clusterName.trim() : undefined,
      }).unwrap();

      setResult(res);
      if (res.success) {
        toast.success("Upload complete", { description: res.message });
      } else {
        toast.error("Upload stopped", { description: res.message });
      }
    } catch (err) {
      const msg = extractError(err);
      setSysError(msg);
      toast.error("Upload failed", { description: msg });
    }
  }, [file, clusterMode, clusterId, clusterName, upload]);

  const displayLevels = useMemo(
    () => buildDisplayLevels(result, isUploading),
    [result, isUploading],
  );

  const allErrors: SingleStepError[] = useMemo(() => {
    const top = result?.errors ?? [];
    const perLevel = displayLevels.flatMap((l) => l.errors ?? []);
    return top.length > 0 ? top : perLevel;
  }, [result, displayLevels]);

  const completedCount = displayLevels.filter((l) => l.status === "completed").length;

  const canSubmit =
    !!file &&
    !fileError &&
    !(clusterMode === "existing" && !clusterId) &&
    !(clusterMode === "create" && !clusterName.trim());

  return (
    <div className={styles.bulkRoot}>
      <div className={styles.bulkCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderMain}>
            <span className={styles.cardHeaderIconWrap} aria-hidden="true">
              <Upload size={17} strokeWidth={2.25} />
            </span>
            <div className={styles.cardHeaderText}>
              <h3 className={styles.cardHeaderTitle}>Upload Infrastructure CSV</h3>
              <p className={styles.cardHeaderSub}>
                Combine every object type into one CSV. Sections can appear in any order — we always
                process levels 1 → 5.
              </p>
            </div>
          </div>

          <div className={styles.cardHeaderRight}>
            <button
              type="button"
              className={styles.stepsGuideBtn}
              onClick={() => setFormatModalOpen(true)}
              aria-label="View CSV format reference"
            >
              <span className={styles.stepsGuideBtnIcon} aria-hidden="true">
                <FileText size={16} strokeWidth={2} />
              </span>
              <span className={styles.stepsGuideBtnText}>
                <span className={styles.stepsGuideBtnLabel}>Format reference</span>
                <span className={styles.stepsGuideBtnHint}>5 hierarchy levels</span>
              </span>
              <ChevronRight size={14} className={styles.stepsGuideBtnChevron} aria-hidden="true" />
            </button>

            {phase !== "setup" && <PhasePill phase={phase} />}
          </div>
        </div>

        <div className={styles.cardBody}>
          {phase === "setup" && !inStage2 && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className={styles.hiddenInput}
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={cn(
                  styles.dropZone,
                  dragging && styles.dropZoneDrag,
                  fileError && styles.dropZoneErr,
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                aria-label="Choose or drop a CSV file to upload, single file, all object types, max 50 megabytes"
              >
                <div className={styles.dropContent}>
                  <div className={styles.dropIconWrap} aria-hidden="true">
                    <Upload size={28} />
                  </div>
                  <p className={styles.dropLabel}>
                    {dragging ? "Drop your CSV file" : "Choose your CSV file"}
                  </p>
                  <p className={styles.dropHint}>Drag &amp; drop here, or click to browse</p>
                  <p className={styles.dropMeta}>Single file · all object types · max 50&nbsp;MB</p>
                </div>
              </button>
              {fileError && (
                <div className={styles.inlineError} role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{fileError}</span>
                </div>
              )}
            </>
          )}

          {phase === "setup" && inStage2 && file && (
            <div className={styles.stage2}>
              <div className={styles.fileReady}>
                <div className={styles.fileReadyIcon} aria-hidden="true">
                  <FileText size={18} />
                </div>
                <div className={styles.fileReadyInfo}>
                  <span className={styles.fileReadyName}>{file.name}</span>
                  <span className={styles.fileReadyMeta}>
                    {fmtBytes(file.size)}
                    <span className={styles.fileReadyDot}>·</span>
                    <span className={styles.fileReadyStatus}>
                      <Check size={11} aria-hidden="true" /> Ready
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.fileReadyRemove}
                  onClick={clearFile}
                  aria-label="Remove file"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <section className={styles.clusterSection}>
                <header className={styles.clusterHeader}>
                  <h4 className={styles.clusterTitle}>
                    Cluster assignment
                    <span className={styles.optBadge}>optional</span>
                  </h4>
                  <p className={styles.clusterHint}>
                    Bind every imported object to a tenant for isolation and easier filtering later.
                  </p>
                </header>

                <div
                  className={styles.clusterOptions}
                  role="radiogroup"
                  aria-label="Cluster assignment mode"
                >
                  {CLUSTER_MODE_OPTIONS.map((opt) => {
                    const active = clusterMode === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={cn(styles.clusterOption, active && styles.clusterOptionActive)}
                        onClick={() => setClusterMode(opt.id)}
                        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom-styled selection card (icon + label + description); a native `<input type="radio">` can't be skinned to this layout without losing the design system's visual language. Matches `SaveTeamModal`'s cluster-card precedent.
                        role="radio"
                        aria-checked={active}
                      >
                        <span className={styles.clusterOptionIcon} aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <span className={styles.clusterOptionBody}>
                          <span className={styles.clusterOptionLabel}>{opt.label}</span>
                          <span className={styles.clusterOptionDesc}>{opt.description}</span>
                        </span>
                        {active && (
                          <span className={styles.clusterOptionCheck} aria-hidden="true">
                            <Check size={12} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {clusterMode === "existing" && (
                  <div className={styles.clusterInputWrap}>
                    <label
                      className={styles.clusterInputLabel}
                      htmlFor="bulk-upload-cluster-select"
                    >
                      Pick a cluster
                    </label>
                    <select
                      id="bulk-upload-cluster-select"
                      className={styles.clusterSelect}
                      value={clusterId ?? ""}
                      onChange={(e) => setClusterId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Select a cluster…</option>
                      {clusters.map((c) => (
                        <option key={c.cluster_id} value={c.cluster_id}>
                          {c.cluster_name || c.cluster_slug} ({c.device_count} devices)
                        </option>
                      ))}
                    </select>
                    {clusters.length === 0 && (
                      <p className={styles.clusterEmpty}>
                        No clusters exist yet — switch to &ldquo;Create new&rdquo;.
                      </p>
                    )}
                  </div>
                )}

                {clusterMode === "create" && (
                  <div className={styles.clusterInputWrap}>
                    <label className={styles.clusterInputLabel} htmlFor="bulk-upload-cluster-name">
                      Cluster name
                    </label>
                    <input
                      id="bulk-upload-cluster-name"
                      type="text"
                      className={styles.clusterInput}
                      placeholder="e.g. dell-austin-lab"
                      value={clusterName}
                      onChange={(e) => setClusterName(e.target.value)}
                    />
                  </div>
                )}
              </section>

              <div className={styles.uploadAction}>
                <button
                  type="button"
                  className={cn(styles.btnPrimary, canSubmit && styles.btnPrimaryReady)}
                  disabled={!canSubmit}
                  onClick={handleUpload}
                >
                  <Upload size={15} aria-hidden="true" />
                  Upload
                </button>
              </div>
            </div>
          )}

          {phase === "uploading" && (
            <>
              {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a live upload-progress banner, which `role="status"` (a live region) models more accurately. Matches `SaveTeamModal`'s save-confirmation banner precedent. */}
              <div className={styles.processingHero} role="status">
                <div className={styles.processingFile}>
                  <div className={styles.processingIcon} aria-hidden="true">
                    <Loader2 size={20} className={styles.spin} />
                  </div>
                  <div className={styles.processingMeta}>
                    <span className={styles.processingTitle}>
                      Processing {file?.name ?? "your CSV"}
                    </span>
                    <UploadingElapsedNote />
                  </div>
                </div>

                <span className={styles.processingCount}>
                  {completedCount} / {LEVEL_ORDER.length}
                </span>
              </div>

              <LevelTimeline levels={displayLevels} isUploading />
            </>
          )}

          {phase === "success" && (
            <>
              <div className={styles.resultHero}>
                <div
                  className={cn(styles.resultBadge, styles.resultBadgeSuccess)}
                  aria-hidden="true"
                >
                  <CheckCircle2 size={28} />
                </div>
                <div className={styles.resultMeta}>
                  <h4 className={styles.resultTitle}>Upload complete</h4>
                  <p className={styles.resultSub}>
                    <strong>{result?.total_created ?? 0}</strong> objects created
                    {(result?.total_skipped ?? 0) > 0 && (
                      <>
                        {" · "}
                        <strong>{result?.total_skipped}</strong> skipped
                      </>
                    )}
                    {" · "}
                    {(result?.processing_time_seconds ?? 0).toFixed(1)}s
                    {result?.tenant && (
                      <>
                        {" · cluster "}
                        <strong>{result.tenant.name}</strong>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <LevelTimeline levels={displayLevels} />

              <div className={styles.resultActions}>
                <button type="button" className={styles.btnGhost} onClick={handleReset}>
                  <RefreshCw size={14} aria-hidden="true" /> Upload another file
                </button>

                {onComplete && (
                  <button
                    type="button"
                    className={cn(styles.btnSuccess, styles.btnPrimaryReady)}
                    onClick={onComplete}
                  >
                    Continue <ArrowRight size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          )}

          {phase === "failure" && (
            <>
              <div className={styles.resultHero}>
                <div className={cn(styles.resultBadge, styles.resultBadgeFail)} aria-hidden="true">
                  <AlertCircle size={28} />
                </div>
                <div className={styles.resultMeta}>
                  <h4 className={styles.resultTitle}>
                    {sysError ? "Service error" : "Upload stopped"}
                  </h4>
                  <p className={styles.resultSub}>
                    {sysError ?? result?.message ?? "One or more levels failed validation."}
                  </p>
                </div>
              </div>

              {!sysError && <LevelTimeline levels={displayLevels} />}

              {allErrors.length > 0 && (
                <div className={styles.errSection}>
                  <div className={styles.errHeader}>
                    <AlertCircle size={15} aria-hidden="true" />
                    <span>
                      {allErrors.length} issue{allErrors.length !== 1 ? "s" : ""} — fix these and
                      re-upload
                    </span>
                  </div>

                  <div className={styles.errTableWrap}>
                    <table className={styles.errTable}>
                      <thead>
                        <tr>
                          <th>Line</th>
                          <th>Type</th>
                          <th>Issue</th>
                          <th>How to fix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allErrors.map((err, i) => (
                          // eslint-disable-next-line react/no-array-index-key -- this error list is a one-shot snapshot from a single completed upload's response; it never reorders or reflows during its render lifetime, and rows have no other stable identifier (backend doesn't assign error IDs).
                          <tr key={`${err.line_number ?? "x"}-${i}`}>
                            <td className={styles.errLine}>{err.line_number ?? "—"}</td>
                            <td>
                              {err.object_type ? (
                                <code className={styles.errType}>{err.object_type}</code>
                              ) : (
                                <span className={styles.errLine}>—</span>
                              )}
                            </td>
                            <td>{err.message}</td>
                            <td className={styles.errFix}>
                              {err.suggested_fix ?? "Review and correct the row."}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className={styles.resultActions}>
                <button type="button" className={styles.btnGhost} onClick={handleReset}>
                  <RefreshCw size={14} aria-hidden="true" /> Try a different file
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {formatModalOpen && <CsvFormatModal onClose={() => setFormatModalOpen(false)} />}
    </div>
  );
}

export default BulkUploadStepper;
