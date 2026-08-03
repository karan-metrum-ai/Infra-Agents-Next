"use client";

import { Controller } from "react-hook-form";
import { Users } from "lucide-react";
import { AVAILABLE_AGENTS } from "./sandboxAgentCatalog";
import styles from "./SandboxConfigForm.module.css";
import type { SandboxSectionProps } from "./SandboxConfigForm.types";

/** Section 2 — agent-team multi-select. Ported from `SandboxConfigModal.tsx`'s
 * "2. Agent team" block (`toggleAgent`); the checkbox grid is wired via a
 * `Controller` (array field, not a native multi-value input) instead of
 * `register`. Requiring at least one agent — the original's `canStart`
 * guard — is now enforced by `sandboxRunConfig.schema.ts` and surfaced as a
 * real field error instead of only disabling the submit button. */
export function SandboxAgentTeamSection({ form }: SandboxSectionProps) {
  const {
    control,
    formState: { errors },
  } = form;
  const error = errors.team;

  return (
    <section className={styles.configSection}>
      <div className={styles.configSectionHeader}>
        <Users size={14} className={styles.configSectionIcon} aria-hidden="true" />
        <span>2. Agent team</span>
      </div>
      <p className={styles.configSectionHint}>Choose which agents to deploy and evaluate.</p>
      <Controller
        control={control}
        name="team"
        render={({ field }) => (
          <fieldset
            className={styles.agentCheckboxGrid}
            aria-describedby={error ? "sandbox-team-error" : undefined}
          >
            <legend className={styles.configLabel}>Agents</legend>
            {AVAILABLE_AGENTS.map((agent) => {
              const checked = field.value.includes(agent);
              return (
                <label
                  key={agent}
                  className={`${styles.agentCheckboxItem} ${checked ? styles.agentCheckboxChecked : ""}`}
                >
                  <input
                    type="checkbox"
                    className={styles.agentCheckbox}
                    checked={checked}
                    onBlur={field.onBlur}
                    onChange={() => {
                      field.onChange(
                        checked ? field.value.filter((a) => a !== agent) : [...field.value, agent],
                      );
                    }}
                  />
                  {agent}
                </label>
              );
            })}
          </fieldset>
        )}
      />
      {error && (
        <span id="sandbox-team-error" className={styles.fieldError} role="alert">
          {error.message}
        </span>
      )}
    </section>
  );
}

export default SandboxAgentTeamSection;
