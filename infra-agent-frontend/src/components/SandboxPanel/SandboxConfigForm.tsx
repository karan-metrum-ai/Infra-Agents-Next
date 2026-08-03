"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, History, Loader2, Play } from "lucide-react";
import { useStartRunMutation } from "@/features/sandbox/sandboxApi";
import { useRegisterCommand } from "@/hooks/useCommandRegistry";
import {
  defaultSandboxRunConfigFormValues,
  sandboxRunConfigSchema,
  toSandboxRunRequest,
  type SandboxRunConfigFormValues,
} from "@/schemas/sandboxRunConfig.schema";
import { SandboxSimulatorSection } from "./SandboxSimulatorSection";
import { SandboxAgentTeamSection } from "./SandboxAgentTeamSection";
import { SandboxDatasetSection } from "./SandboxDatasetSection";
import { SandboxAdvancedSection } from "./SandboxAdvancedSection";
import { SandboxRunSummary } from "./SandboxRunSummary";
import { SandboxRunHistoryPanel } from "./SandboxRunHistoryPanel";
import styles from "./SandboxConfigForm.module.css";

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const withData = error as { data?: { detail?: string; message?: string }; message?: string };
    if (withData.data?.detail) return withData.data.detail;
    if (withData.data?.message) return withData.data.message;
    if (withData.message) return withData.message;
  }
  return "Failed to start sandbox run. Please try again.";
}

/**
 * Sandbox Evaluator config → run submission form. Ported from the Vite
 * app's `SandboxConfigModal.tsx` into this orchestrator + sibling sections.
 *
 * Visual model: page-hosted modal chrome (SaveTeamModal / EvaluationModal
 * header → body → footer), not a dialog overlay. Primary/secondary actions
 * use the global `.btn-primary` / `.btn-secondary` utilities from
 * `globals.css`.
 *
 * Zero-`useEffect` discipline: form state is React Hook Form; server data is
 * RTK Query; collapse/history flags are event-driven `useState`.
 */
export function SandboxConfigForm() {
  const router = useRouter();
  const [startRun, { isLoading: isStarting }] = useStartRunMutation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const form = useForm<SandboxRunConfigFormValues>({
    resolver: zodResolver(sandboxRunConfigSchema),
    defaultValues: defaultSandboxRunConfigFormValues(),
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await startRun(toSandboxRunRequest(values)).unwrap();
      router.push(`/sandbox/runs/${result.run_id}`);
    } catch (error) {
      setSubmitError(extractErrorMessage(error));
    }
  });

  useRegisterCommand({
    id: "sandbox:start-run",
    label: "Start sandbox run",
    group: "Actions",
    disabled: isStarting,
    perform: () => onSubmit(),
  });
  useRegisterCommand({
    id: "sandbox:run-history",
    label: "Show sandbox run history",
    group: "Actions",
    perform: () => setShowHistory(true),
  });

  return (
    <div className={styles.pageRoot}>
      <form
        className={styles.modalContainer}
        onSubmit={onSubmit}
        noValidate
        aria-labelledby="sandbox-config-title"
      >
        <header className={styles.modalHeader}>
          <div className={styles.headerText}>
            <span className={styles.eyebrow}>Sandbox Evaluator</span>
            <h2 id="sandbox-config-title" className={styles.modalTitle}>
              Configure a sandbox run
            </h2>
            <p className={styles.modalSubtitle}>
              Set up the evaluation parameters, then open the live report once the run starts.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowHistory(true)}
            aria-label="Open run history"
          >
            <History size={14} aria-hidden="true" />
            Run History
          </button>
        </header>

        <div className={styles.modalContent}>
          <div className={styles.configLayout}>
            <fieldset className={styles.formFieldset} disabled={isStarting}>
              <SandboxSimulatorSection form={form} />
              <SandboxAgentTeamSection form={form} />
              <SandboxDatasetSection form={form} />
              <SandboxAdvancedSection form={form} />
            </fieldset>

            <aside className={styles.runSummarySidebar} aria-label="Run summary">
              <SandboxRunSummary form={form} />
            </aside>
          </div>

          {submitError && (
            <div className={styles.errorBannerInline} role="alert">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        <footer className={styles.modalFooter}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push("/workflows")}
            disabled={isStarting}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isStarting}>
            {isStarting ? (
              <>
                <Loader2 size={14} className={styles.spinIcon} aria-hidden="true" />
                Starting...
              </>
            ) : (
              <>
                <Play size={14} aria-hidden="true" />
                Start sandbox run
              </>
            )}
          </button>
        </footer>
      </form>

      {showHistory && <SandboxRunHistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default SandboxConfigForm;
