"use client";

import { Cpu } from "lucide-react";
import styles from "./SandboxConfigForm.module.css";
import type { SandboxSectionProps } from "./SandboxConfigForm.types";

/** Section 1 — simulated machine count. Ported from `SandboxConfigModal.tsx`'s
 * "1. Simulator" block; numeric range now enforced by
 * `sandboxRunConfig.schema.ts` instead of only the `<input min max>` HTML
 * attributes. */
export function SandboxSimulatorSection({ form }: SandboxSectionProps) {
  const {
    register,
    formState: { errors },
  } = form;
  const error = errors.machineCount;

  return (
    <section className={styles.configSection}>
      <div className={styles.configSectionHeader}>
        <Cpu size={14} className={styles.configSectionIcon} aria-hidden="true" />
        <span>1. Simulator</span>
      </div>
      <p className={styles.configSectionHint}>
        Number of machines to simulate in the sandbox environment.
      </p>
      <div className={styles.configField}>
        <label className={styles.configLabel} htmlFor="sandbox-machine-count">
          Machine count
        </label>
        <input
          id="sandbox-machine-count"
          type="number"
          min={1}
          max={100}
          className={`${styles.configInput} ${styles.configInputNarrow}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "sandbox-machine-count-error" : undefined}
          {...register("machineCount", { valueAsNumber: true })}
        />
        {error && (
          <span id="sandbox-machine-count-error" className={styles.fieldError} role="alert">
            {error.message}
          </span>
        )}
      </div>
    </section>
  );
}

export default SandboxSimulatorSection;
