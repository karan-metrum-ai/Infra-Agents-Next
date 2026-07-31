"use client";

import { BarChart3, Brain, Check, Database, FileText, Link2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import type {
  GenerateChartProgressPayload,
  GenerateStepPayload,
} from "@/features/reports/reportsApi.types";
import styles from "./GenerateProgressOverlay.module.css";

/**
 * Ported from the Vite app's `components/ReportBuilder/GenerateProgressOverlay.tsx`.
 *
 * Deviation from source: the Vite markup used `role="dialog" aria-modal="true"`
 * but never actually implemented focus-trap/keyboard-cycling behavior (no ref,
 * no keydown handler, no `useDialogFocusTrap`-style hook) — the ARIA modal
 * semantics weren't backed by real focus management. Per this app's
 * `useDialogFocusTrap` convention (see `WorkflowDesigner/SaveTeamModal.tsx`)
 * being reserved for dialogs that actually trap focus, this overlay is a
 * transient, non-interactive progress announcement (one optional Cancel
 * button, no form fields to trap focus within) so it's marked
 * `role="status"`/`aria-live="polite"` instead — matching what it actually is.
 */

const STEP_META: Array<{
  key: string;
  label: string;
  icon: typeof Database;
}> = [
  { key: "collect_domain_data", label: "Collecting data", icon: Database },
  { key: "build_charts", label: "Building charts", icon: BarChart3 },
  { key: "analyze_sections", label: "Analyzing sections", icon: Brain },
  { key: "correlate_domains", label: "Correlating domains", icon: Link2 },
  { key: "render_report", label: "Rendering PDF", icon: FileText },
];

export interface GenerateProgressState {
  activeStep: number;
  completedSteps: number[];
  chartProgress: GenerateChartProgressPayload | null;
  statusLabel: string;
  startedAt: number;
}

interface GenerateProgressOverlayProps {
  progress: GenerateProgressState;
  onCancel?: () => void;
}

function stepStatus(
  stepNumber: number,
  activeStep: number,
  completedSteps: number[],
): "pending" | "active" | "done" {
  if (completedSteps.includes(stepNumber)) {
    return "done";
  }
  if (stepNumber === activeStep) {
    return "active";
  }
  return "pending";
}

export function GenerateProgressOverlay({ progress, onCancel }: GenerateProgressOverlayProps) {
  const [elapsedS, setElapsedS] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedS(Math.max(0, Math.floor((Date.now() - progress.startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [progress.startedAt]);

  const percent = Math.round((progress.completedSteps.length / STEP_META.length) * 100);

  return (
    <div
      className={styles.overlay}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a full-screen busy overlay, which `role="status"` (a live region) models more accurately.
      role="status"
      aria-live="polite"
      aria-label="Report generation progress"
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>Generating report</h3>
          <p className={styles.hint}>Usually takes about 2 minutes</p>
        </div>

        <div
          className={styles.progressBar}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native `<progress>` element can't be skinned with this design system's gradient fill/track styling without losing cross-browser control over its rendering.
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Generation progress ${percent} percent`}
        >
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>

        <p className={styles.statusLine} aria-atomic="true">
          {progress.statusLabel}
        </p>

        <ol className={styles.stepList}>
          {STEP_META.map((meta, index) => {
            const stepNumber = index + 1;
            const status = stepStatus(stepNumber, progress.activeStep, progress.completedSteps);
            const Icon = meta.icon;
            return (
              <li
                key={meta.key}
                className={`${styles.stepItem} ${status === "active" ? styles.stepItemActive : ""} ${
                  status === "done" ? styles.stepItemDone : ""
                }`}
              >
                <span className={styles.stepIcon}>
                  {status === "done" ? (
                    <Check size={14} />
                  ) : status === "active" ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <Icon size={14} />
                  )}
                </span>
                <span className={styles.stepLabel}>{meta.label}</span>
              </li>
            );
          })}
        </ol>

        <div className={styles.footer}>
          <span className={styles.elapsed}>Elapsed {elapsedS}s</span>
          {onCancel ? (
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function createInitialProgressState(): GenerateProgressState {
  return {
    activeStep: 1,
    completedSteps: [],
    chartProgress: null,
    statusLabel: "Starting report generation...",
    startedAt: Date.now(),
  };
}

export function applyStreamStepStarted(
  state: GenerateProgressState,
  data: GenerateStepPayload,
): GenerateProgressState {
  return {
    ...state,
    activeStep: data.step,
    chartProgress: data.step === 2 ? state.chartProgress : null,
    statusLabel: `Step ${data.step}/${data.total} — ${data.label}`,
  };
}

export function applyStreamStepCompleted(
  state: GenerateProgressState,
  data: GenerateStepPayload,
): GenerateProgressState {
  const completed = state.completedSteps.includes(data.step)
    ? state.completedSteps
    : [...state.completedSteps, data.step];
  return {
    ...state,
    completedSteps: completed,
    statusLabel: `Completed ${data.label}`,
  };
}

export function applyStreamChartProgress(
  state: GenerateProgressState,
  data: GenerateChartProgressPayload,
): GenerateProgressState {
  return {
    ...state,
    activeStep: 2,
    chartProgress: data,
    statusLabel: `Building chart ${data.index}/${data.total} — ${data.title}`,
  };
}
