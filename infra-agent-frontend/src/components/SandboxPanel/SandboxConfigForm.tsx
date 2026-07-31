"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ChevronLeft, History, Loader2, Play } from "lucide-react";
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
 * app's `SandboxConfigModal.tsx` (610 LOC) + `SandboxConfigPage.tsx` (48
 * LOC) into this orchestrator + 4 sibling sections
 * (`SandboxSimulatorSection`, `SandboxAgentTeamSection`,
 * `SandboxDatasetSection`, `SandboxAdvancedSection`) + a run-history drawer
 * (`SandboxRunHistoryPanel`), all under the LOC soft cap.
 *
 * **Modal-vs-page decision**: this is page-level content only, not a
 * dialog — no overlay, no `role="dialog"`, no `useDialogFocusTrap` on the
 * form itself. In the Vite app `SandboxConfigModal` was opened inline from
 * the Workflow Designer canvas; that call site was deliberately NOT pulled
 * forward in Phase 7 (see CLAUDE.md's resolved-conflicts table) — the
 * canvas's "Sandbox Eval" action navigates to the real `/sandbox/new` route
 * instead, matching `EvaluationModal`'s own `layout="page"` precedent for
 * exactly this reason. Since `/sandbox/new` is this component's one real
 * mount point right now (`SandboxConfigPage.tsx`'s Vite job — bridging to
 * a route — is exactly what this *is* the route), it never needs the
 * overlay/dialog chrome in the first place, unlike `EvaluationModal` which
 * genuinely has two live callers (`/workflows`'s inline modal and
 * `/kyai`'s page). If a future phase adds a second, inline-modal caller for
 * this form, add a `layout` prop then, following that same precedent —
 * don't speculatively build it now.
 *
 * Zero-`useEffect` discipline: form state is entirely React Hook Form
 * (`useForm` + `zodResolver`); server data is RTK Query
 * (`useStartRunMutation`, `useUploadKBMutation` in `SandboxDatasetSection`,
 * `useListRunsQuery`/`useCancelRunMutation` in `SandboxRunHistoryPanel`);
 * the advanced-section collapse and run-history-open flags are plain
 * event-driven `useState`. No direct `useEffect` anywhere in this feature.
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
      <div className={styles.pageContainer}>
        <header className={styles.pageHeader}>
          <div className={styles.pageTopBar}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => router.push("/workflows")}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Back
            </button>
            <button
              type="button"
              className={styles.historyButton}
              onClick={() => setShowHistory(true)}
            >
              <History size={14} aria-hidden="true" />
              Run History
            </button>
          </div>
          <div className={styles.pageHero}>
            <span className={styles.pageEyebrow}>Sandbox Evaluator</span>
            <h1 className={styles.titleText}>Configure a sandbox run</h1>
            <p className={styles.titleSubtext}>
              Set up the evaluation parameters, then open the live report once the run starts.
            </p>
          </div>
        </header>

        <form className={styles.sandboxConfigContainer} onSubmit={onSubmit} noValidate>
          <fieldset className={styles.formFieldset} disabled={isStarting}>
            <SandboxSimulatorSection form={form} />
            <SandboxAgentTeamSection form={form} />
            <SandboxDatasetSection form={form} />
            <SandboxAdvancedSection form={form} />
          </fieldset>

          {submitError && (
            <div className={styles.errorBannerInline} role="alert">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className={styles.configActions}>
            <button type="submit" className={styles.startButton} disabled={isStarting}>
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
          </div>
        </form>
      </div>

      {showHistory && <SandboxRunHistoryPanel onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default SandboxConfigForm;
