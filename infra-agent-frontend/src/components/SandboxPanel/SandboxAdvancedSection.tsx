"use client";

import { useState } from "react";
import styles from "./SandboxConfigForm.module.css";
import type { SandboxSectionProps } from "./SandboxConfigForm.types";

/** Collapsible section 4 — model endpoint override + optimization toggle.
 * Ported from `SandboxConfigModal.tsx`'s `showAdvanced` block. The
 * expand/collapse flag is local UI-only state (not server/form data), so a
 * plain `useState` is the right tool here — same class as `SaveTeamModal`'s
 * `isSaving`, not the "no useState for server data" rule. */
export function SandboxAdvancedSection({ form }: SandboxSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className={styles.advancedWrapper}>
      <button
        type="button"
        className={styles.advancedToggle}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="sandbox-advanced-content"
      >
        {expanded ? "Hide advanced settings" : "Show advanced settings"}
      </button>

      {expanded && (
        <div id="sandbox-advanced-content" className={styles.advancedContent}>
          <section className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span>Model endpoint</span>
            </div>
            <div className={styles.configRow}>
              <div className={styles.configField}>
                <label className={styles.configLabel} htmlFor="sandbox-model-id">
                  Model ID
                </label>
                <input
                  id="sandbox-model-id"
                  className={styles.configInput}
                  placeholder="Qwen/Qwen3-235B-A22B-Thinking-2507-FP8"
                  aria-invalid={errors.modelId ? "true" : undefined}
                  {...register("modelId")}
                />
              </div>
              <div className={styles.configField}>
                <label className={styles.configLabel} htmlFor="sandbox-base-url">
                  Base URL
                </label>
                <input
                  id="sandbox-base-url"
                  className={styles.configInput}
                  placeholder="http://100.83.167.36:9110/v1"
                  aria-invalid={errors.baseUrl ? "true" : undefined}
                  aria-describedby={errors.baseUrl ? "sandbox-base-url-error" : undefined}
                  {...register("baseUrl")}
                />
                {errors.baseUrl && (
                  <span id="sandbox-base-url-error" className={styles.fieldError} role="alert">
                    {errors.baseUrl.message}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span>Optimization</span>
            </div>
            <label className={styles.radioItem}>
              <input type="checkbox" {...register("enableOptimization")} />
              Enable DSPy optimization pass
            </label>
          </section>
        </div>
      )}
    </div>
  );
}

export default SandboxAdvancedSection;
