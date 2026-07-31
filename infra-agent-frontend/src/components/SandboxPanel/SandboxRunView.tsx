"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { useRegisterCommand } from "@/hooks/useCommandRegistry";
import { useCancelRunMutation } from "@/features/sandbox/sandboxApi";
import { PHASE_LABELS, type Verdict } from "@/features/sandbox/sandboxApi.types";
import { formatDuration } from "@/lib/formatters";
import { useSandboxRun } from "./useSandboxRun";
import { VerdictExplainer } from "./VerdictExplainer";
import { KyaiScoreBreakdown } from "./KyaiScoreBreakdown";
import { ReportSummary } from "./ReportSummary";
import { MetricsDeepDive, type MetricTabKey } from "./MetricsDeepDive";
import { PipelineTimeline } from "./PipelineTimeline";
import { QueryRecordsTable } from "./QueryRecordsTable";
import { OptimizationSection } from "./OptimizationSection";
import styles from "./SandboxRunView.module.css";

interface SandboxRunViewProps {
  runId: string;
}

/**
 * SandboxRunView -- the `/sandbox/runs/[runId]` page. Renders a full
 * sandbox evaluation report with live SSE updates.
 *
 * Ported from the Vite app's `components/SandboxPanel/SandboxPanel.tsx`
 * (605 LOC), composing the components built earlier in this phase
 * (`VerdictExplainer`, `KyaiScoreBreakdown`, `ReportSummary`,
 * `MetricsDeepDive`, `PipelineTimeline`, `OptimizationSection`).
 *
 * Deviations from source (documented):
 * - No fixed floating top nav bar with a Metrum logo -- that was the Vite
 *   app's own standalone-router page chrome. This app's other standalone
 *   pages (`SandboxConfigForm.tsx` for `/sandbox/new`, `WorkflowDesigner.tsx`
 *   for `/workflows`) each own a simple in-flow header instead, since the
 *   root layout carries no persistent nav to duplicate -- this component
 *   matches that established Next-app precedent rather than the Vite
 *   standalone-router pattern.
 * - `onBack`/`onReRun`/`onDeleted` callback props are replaced with direct
 *   `next/navigation` `useRouter` calls (`router.push`), since there is no
 *   parent route-level component threading navigation callbacks down, per
 *   `SandboxConfigForm.tsx`'s established precedent for the same relationship
 *   (its own back button pushes to `/workflows` directly).
 * - The source's inline ad hoc query-scores `<table>` is replaced with the
 *   already-ported `QueryRecordsTable` component (sortable/filterable,
 *   `aria-expanded` rows) instead of re-implementing an equivalent table --
 *   same data (`report.query_scores`), better structure, matches this
 *   phase's own file list (`QueryRecordsTable.tsx` was explicitly in scope).
 * - `VerdictHero`/`VerdictsGrid`/`VerdictCard`/`ArtifactsList`/`LogsDrawer`/
 *   `RawJsonDrawer` are NOT wired in here, matching the Vite source's own
 *   real orchestrator exactly -- none of those are rendered by the real
 *   `SandboxPanel.tsx` either (confirmed by reading it in full); they exist
 *   as ported, available components for future composition, same as in the
 *   Vite app itself.
 * - Delete confirmation is a real dialog with `useDialogFocusTrap`
 *   (`SandboxRunHistoryPanel.tsx`/`SaveTeamModal.tsx` precedent) instead of
 *   the source's backdrop-click-to-close-only `<div>`.
 */
export function SandboxRunView({ runId }: SandboxRunViewProps) {
  const router = useRouter();
  const { run, report, events, isLoading, error, refetch } = useSandboxRun(runId);
  const [cancelRun, { isLoading: isDeleting }] = useCancelRunMutation();

  const [metricTab, setMetricTab] = useState<MetricTabKey>("throughput");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(() => setConfirmDelete(false));

  const verdicts: Verdict[] = useMemo(() => report?.verdicts ?? [], [report]);
  const queryScores = useMemo(() => report?.query_scores ?? [], [report]);

  const kyaiAverages = useMemo(() => {
    if (queryScores.length === 0) return null;
    const sum = queryScores.reduce(
      (acc, q) => ({
        tool: acc.tool + q.tool_match,
        param: acc.param + q.param_match,
        order: acc.order + q.order_valid,
        reasoning: acc.reasoning + q.reasoning,
        overall: acc.overall + q.score,
      }),
      { tool: 0, param: 0, order: 0, reasoning: 0, overall: 0 },
    );
    const n = queryScores.length;
    return {
      tool: sum.tool / n,
      param: sum.param / n,
      order: sum.order / n,
      reasoning: sum.reasoning / n,
      overall: sum.overall / n,
    };
  }, [queryScores]);

  const liveQueryProgress = useMemo(() => {
    let scored = 0;
    let total = 0;
    let lastScore = 0;
    for (const evt of events) {
      if (evt.event_type === "query_scored") {
        const idx = (evt.data?.query_idx as number) ?? 0;
        const t = (evt.data?.total as number) ?? 0;
        if (idx + 1 > scored) scored = idx + 1;
        if (t > total) total = t;
        lastScore = (evt.data?.score as number) ?? 0;
      }
    }
    return { scored, total, lastScore };
  }, [events]);

  const failedPhaseKey = useMemo(() => {
    if (!run) return null;
    const found = (run.phases ?? []).find((p) => p.status === "failed");
    return found ? found.name : null;
  }, [run]);

  const handleReRun = useCallback(() => {
    router.push("/sandbox/new");
  }, [router]);

  const handleDownload = useCallback(() => {
    if (!run) return;
    try {
      const payload = report ?? run;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sandbox-${run.run_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Download failed");
    }
  }, [run, report]);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await cancelRun(runId).unwrap();
      setConfirmDelete(false);
      router.push("/workflows");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
    }
  }, [cancelRun, runId, router]);

  useRegisterCommand({
    id: "sandbox:re-run",
    label: "Re-run sandbox evaluation",
    group: "Actions",
    disabled: !run,
    perform: handleReRun,
  });
  useRegisterCommand({
    id: "sandbox:download-run",
    label: "Download sandbox run JSON",
    group: "Actions",
    disabled: !run,
    perform: handleDownload,
  });
  useRegisterCommand({
    id: "sandbox:delete-run",
    label: "Delete sandbox run",
    group: "Actions",
    disabled: !run,
    perform: () => setConfirmDelete(true),
  });

  if (!run && isLoading) {
    return (
      <div className={styles.loadingPage}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentPhaseLabel = run?.current_phase
    ? (PHASE_LABELS[run.current_phase] ?? run.current_phase)
    : "Queued";

  const statusClass =
    run?.status === "completed"
      ? styles.statusBadgePass
      : run?.status === "failed"
        ? styles.statusBadgeFail
        : run?.status === "running"
          ? styles.statusBadgeRunning
          : "";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push("/workflows")}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Back
          </button>
          <div className={styles.headerRight}>
            {isLoading && <Loader2 size={14} className={styles.spinIcon} aria-hidden="true" />}
            <span className={`${styles.statusBadge} ${statusClass}`}>
              <span className={styles.statusDot} aria-hidden="true" />
              {run?.status === "completed"
                ? (report?.overall_verdict ?? "Completed")
                : run?.status === "failed"
                  ? "Failed"
                  : currentPhaseLabel}
            </span>
          </div>
        </header>

        {actionError && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{actionError}</span>
            <button
              type="button"
              className={styles.dismissButton}
              onClick={() => setActionError(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {run && (
          <div className={styles.hero}>
            <div className={styles.heroTopRow}>
              <h1 className={styles.runName}>Run {run.run_id}</h1>
              <div className={styles.heroActions}>
                <Button variant="default" size="sm" onClick={handleReRun}>
                  <RefreshCw size={14} aria-hidden="true" />
                  Re-run
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <FileText size={14} aria-hidden="true" />
                  Download
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                  <AlertTriangle size={14} aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>
            <div className={styles.idGrid}>
              <div className={styles.idGridItem}>
                <span className={styles.idLabel}>Status</span>
                <span className={styles.idValue}>{run.status}</span>
              </div>
              <div className={styles.idGridItem}>
                <span className={styles.idLabel}>Run ID</span>
                <span className={`${styles.idValue} ${styles.idValueMono}`}>{run.run_id}</span>
              </div>
              {report && (
                <>
                  <div className={styles.idGridItem}>
                    <span className={styles.idLabel}>Model</span>
                    <span className={styles.idValue}>{report.model_id}</span>
                  </div>
                  <div className={styles.idGridItem}>
                    <span className={styles.idLabel}>Team</span>
                    <span className={styles.idValue}>{report.team?.join(", ") ?? "--"}</span>
                  </div>
                  <div className={styles.idGridItem}>
                    <span className={styles.idLabel}>Queries</span>
                    <span className={styles.idValue}>{report.dataset_size}</span>
                  </div>
                  <div className={styles.idGridItem}>
                    <span className={styles.idLabel}>Machines</span>
                    <span className={styles.idValue}>{report.simulated_machines}</span>
                  </div>
                  <div className={styles.idGridItem}>
                    <span className={styles.idLabel}>Duration</span>
                    <span className={`${styles.idValue} ${styles.idValueMono}`}>
                      {formatDuration(report.duration_s)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {run?.status === "running" && liveQueryProgress.total > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <h3 className={styles.sectionTitle}>Evaluating</h3>
                <span className={styles.liveIndicator}>Live</span>
              </div>
              <span
                className={styles.liveScore}
                data-tone={
                  liveQueryProgress.lastScore >= 0.7
                    ? "success"
                    : liveQueryProgress.lastScore >= 0.4
                      ? "warning"
                      : liveQueryProgress.lastScore > 0
                        ? "destructive"
                        : "muted"
                }
              >
                {liveQueryProgress.lastScore > 0 ? liveQueryProgress.lastScore.toFixed(3) : "—"}
              </span>
            </div>

            <div className={styles.liveProgressTrack}>
              <div
                className={styles.liveProgressFill}
                style={{
                  width: `${Math.round((liveQueryProgress.scored / liveQueryProgress.total) * 100)}%`,
                }}
              />
            </div>
            <div className={styles.liveProgressMeta}>
              <span>
                {liveQueryProgress.scored} of {liveQueryProgress.total} queries scored
              </span>
              <span>{Math.round((liveQueryProgress.scored / liveQueryProgress.total) * 100)}%</span>
            </div>
          </section>
        )}

        {report && verdicts.length > 0 && (
          <section className={styles.section} id="verdicts">
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Verdicts</h3>
              <span className={styles.sectionSubtitle}>
                {report.verdicts_passed}/{report.verdicts_total} passing
              </span>
            </div>
            <VerdictExplainer verdicts={verdicts} />
          </section>
        )}

        {report && kyaiAverages && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>KYAI Scores</h3>
              <span className={styles.sectionSubtitle}>
                Mean: {kyaiAverages.overall.toFixed(3)}
              </span>
            </div>
            <KyaiScoreBreakdown
              toolMatch={kyaiAverages.tool}
              paramMatch={kyaiAverages.param}
              orderValid={kyaiAverages.order}
              reasoning={kyaiAverages.reasoning}
            />
          </section>
        )}

        {report?.metrics && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Report Summary</h3>
            </div>
            <ReportSummary metrics={report.metrics} />
          </section>
        )}

        {report?.metrics && (
          <MetricsDeepDive
            metrics={report.metrics}
            infraMetrics={null}
            idracResult={null}
            activeTab={metricTab}
            onTabChange={setMetricTab}
          />
        )}

        {run && (
          <PipelineTimeline
            phases={run.phases ?? []}
            currentPhase={run.current_phase}
            failedPhaseFocus={failedPhaseKey}
            events={events}
          />
        )}

        {queryScores.length > 0 && <QueryRecordsTable queryScores={queryScores} />}

        {report?.optimization && <OptimizationSection optimization={report.optimization} />}
      </div>

      {confirmDelete && (
        <div className={styles.confirmBackdrop}>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onKeyDown` here is Escape-to-close/Tab-cycling via `useDialogFocusTrap`, supplemental to the Cancel/Delete buttons which remain fully keyboard/screen-reader operable. */}
          <div
            ref={dialogRef}
            className={styles.confirmDialog}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled divs + `useDialogFocusTrap` rather than the native `<dialog>` element, matching `SaveTeamModal`/`SandboxRunHistoryPanel`.
            role="dialog"
            aria-modal="true"
            aria-labelledby="sandbox-delete-title"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            <div className={styles.confirmHeader}>
              <AlertTriangle size={18} aria-hidden="true" />
              <div>
                <div id="sandbox-delete-title" className={styles.confirmTitle}>
                  Delete this run?
                </div>
                <div className={styles.confirmText}>
                  The run record and namespaces will be removed. Artifacts on disk are preserved.
                </div>
              </div>
            </div>
            <div className={styles.confirmActions}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className={styles.spinIcon} aria-hidden="true" />
                    Deleting...
                  </>
                ) : (
                  "Delete run"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SandboxRunView;
