"use client";

import type { ChangeEvent } from "react";
import { AlertCircle, FileUp, Loader2 } from "lucide-react";
import { useUploadKBMutation } from "@/features/sandbox/sandboxApi";
import styles from "./SandboxConfigForm.module.css";
import type { SandboxSectionProps } from "./SandboxConfigForm.types";

/** Section 3 — dataset generation: KB source (built-in vs. upload), query
 * count, and concurrency. Ported from `SandboxConfigModal.tsx`'s
 * "3. Dataset" block (`handleKbFileUpload`, `kbUseDefault` state, the
 * queries/concurrency inline row). The upload flow now goes through
 * `useUploadKBMutation` (RTK Query) instead of a hand-rolled
 * `sandboxApi.uploadKB` fetch + local `kbUploading`/`kbFileName` `useState` —
 * the result's `kb_path`/`filename` are written straight into RHF state via
 * `setValue`, and the mutation's own `isLoading`/`error` replace the
 * original's manual uploading flag and try/catch error string.
 *
 * A11y fix over the Vite original: the hidden file input is visually
 * hidden (clip-based) rather than `display: none`, so it stays keyboard-
 * focusable/operable inside its wrapping `<label>` — `display: none` would
 * have made the "Choose file" control unreachable via keyboard alone. */
export function SandboxDatasetSection({ form }: SandboxSectionProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const [uploadKB, { isLoading: isUploading, isError: uploadFailed }] = useUploadKBMutation();

  const kbSourceType = watch("kbSourceType");
  const kbFileName = watch("kbFileName");

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const result = await uploadKB(file).unwrap();
      setValue("kbSource", result.kb_path, { shouldValidate: true });
      setValue("kbFileName", result.filename, { shouldValidate: true });
    } catch {
      // Surfaced below via the mutation's own `isError` state.
    }
  };

  return (
    <section className={styles.configSection}>
      <div className={styles.configSectionHeader}>
        <span>3. Dataset</span>
      </div>
      <p className={styles.configSectionHint}>
        Upload a knowledge base file to generate evaluation queries, or use the built-in
        infrastructure monitoring KB.
      </p>

      <div className={styles.configField}>
        <span className={styles.configLabel} id="sandbox-kb-source-label">
          Knowledge base source
        </span>
        <div
          className={`${styles.radioGroup} ${styles.radioGroupCompact}`}
          role="radiogroup"
          aria-labelledby="sandbox-kb-source-label"
        >
          <label className={styles.radioItem}>
            <input
              type="radio"
              checked={kbSourceType === "default"}
              onChange={() => setValue("kbSourceType", "default", { shouldValidate: true })}
            />
            Use built-in KB
          </label>
          <label className={styles.radioItem}>
            <input
              type="radio"
              checked={kbSourceType === "custom"}
              onChange={() => setValue("kbSourceType", "custom", { shouldValidate: true })}
            />
            Upload custom
          </label>
        </div>

        {kbSourceType === "custom" && (
          <div className={styles.fileUploadRow}>
            <label
              className={`${styles.fileUploadButton} ${isUploading ? styles.fileUploadButtonDisabled : ""}`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className={styles.spinIcon} aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp size={13} aria-hidden="true" />
                  {kbFileName ? "Replace" : "Choose file"}
                </>
              )}
              <input
                type="file"
                accept=".md,.txt,.csv,.json,.yaml,.yml"
                className={styles.visuallyHidden}
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
            {kbFileName && <span className={styles.fileUploadSuccess}>{kbFileName}</span>}
            {uploadFailed && (
              <span className={styles.fieldError} role="alert">
                <AlertCircle size={13} aria-hidden="true" />
                Failed to upload KB file
              </span>
            )}
          </div>
        )}
      </div>

      <div className={styles.configRowInline}>
        <div className={styles.configFieldCompact}>
          <label className={styles.configLabel} htmlFor="sandbox-num-queries">
            Queries
          </label>
          <input
            id="sandbox-num-queries"
            type="number"
            min={1}
            max={500}
            className={`${styles.configInput} ${styles.configInputNarrow}`}
            aria-invalid={errors.numQueries ? "true" : undefined}
            aria-describedby={errors.numQueries ? "sandbox-num-queries-error" : undefined}
            {...register("numQueries", { valueAsNumber: true })}
          />
          {errors.numQueries && (
            <span id="sandbox-num-queries-error" className={styles.fieldError} role="alert">
              {errors.numQueries.message}
            </span>
          )}
        </div>
        <div className={styles.configFieldCompact}>
          <label className={styles.configLabel} htmlFor="sandbox-concurrency">
            Concurrency
          </label>
          <input
            id="sandbox-concurrency"
            type="number"
            min={1}
            max={100}
            className={`${styles.configInput} ${styles.configInputNarrow}`}
            aria-invalid={errors.concurrency ? "true" : undefined}
            aria-describedby={errors.concurrency ? "sandbox-concurrency-error" : undefined}
            {...register("concurrency", { valueAsNumber: true })}
          />
          {errors.concurrency && (
            <span id="sandbox-concurrency-error" className={styles.fieldError} role="alert">
              {errors.concurrency.message}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export default SandboxDatasetSection;
