"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { formatAbsTime, formatDuration, formatRelTime, truncateMid } from "@/lib/formatters";
import type { RunStatus, Verdict } from "@/features/sandbox/sandboxApi.types";
import styles from "./VerdictHero.module.css";

/**
 * VerdictHero -- Layer 1 of the Sandbox Panel.
 *
 * The always-visible header that answers "did it pass?" before
 * anything else. Built around a deliberate visual hierarchy:
 *
 *   1. Status accent rail along the left edge (color = verdict).
 *   2. Compact pass donut + status pill + pass ratio (left column).
 *   3. Run name as the typographic anchor + identity strip (model,
 *      run id, created, duration) on a single meta row.
 *   4. Re-run as the primary action; download/delete as ghost + quiet
 *      danger affordances.
 *
 * Ported from the Vite app's `components/SandboxPanel/VerdictHero.tsx`.
 * `run` is a composite view of `SandboxRun` + `SandboxReport` fields
 * (`run_name`, `overall_pass`, `model_id`, `duration_seconds`) the same
 * way the Vite source assembles it -- neither canonical type carries
 * all of these fields on its own (`model_id` lives on `SandboxReport`,
 * the rest are caller-derived), so this stays a local composite
 * interface rather than importing/redeclaring `SandboxRun`.
 */
interface VerdictHeroRun {
  run_id: string;
  run_name?: string;
  status: RunStatus | string;
  overall_pass?: boolean | null;
  model_id?: string | null;
  duration_seconds?: number | null;
  created_at?: string | number | null;
  error?: string | null;
}

export interface VerdictHeroProps {
  run: VerdictHeroRun | null;
  verdicts: Verdict[];
  onReRun: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

type HeroBadgeKind = "pass" | "fail" | "running" | "pending" | "noRun";

function pickBadgeKind(
  status: RunStatus | string | undefined,
  overallPass: boolean | null | undefined,
): { kind: HeroBadgeKind; label: string } {
  if (!status || status === "pending") {
    return { kind: "pending", label: "Queued" };
  }
  if (status === "running") return { kind: "running", label: "Running" };
  if (status === "failed") return { kind: "noRun", label: "Run failed" };
  if (status === "completed") {
    if (overallPass === true) return { kind: "pass", label: "Passed" };
    if (overallPass === false) return { kind: "fail", label: "Failed" };
    return { kind: "pending", label: "Awaiting report" };
  }
  return { kind: "pending", label: status.charAt(0).toUpperCase() + status.slice(1) };
}

const HERO_RAIL_CLASS: Record<HeroBadgeKind, string> = {
  pass: styles.heroPass,
  fail: styles.heroFail,
  running: styles.heroRunning,
  pending: styles.heroPending,
  noRun: styles.heroFail,
};

const HERO_BADGE_CLASS: Record<HeroBadgeKind, string> = {
  pass: styles.verdictBadgePass,
  fail: styles.verdictBadgeFail,
  running: styles.verdictBadgeRunning,
  pending: styles.verdictBadgePending,
  noRun: styles.verdictBadgeNoRun,
};

const METER_COLOR: Record<HeroBadgeKind, string> = {
  pass: "var(--success)",
  fail: "var(--destructive)",
  running: "var(--primary)",
  pending: "var(--muted)",
  noRun: "var(--destructive)",
};

export function VerdictHero({ run, verdicts, onReRun, onDownload, onDelete }: VerdictHeroProps) {
  const [copied, setCopied] = useState(false);

  const { kind, label } = pickBadgeKind(run?.status, run?.overall_pass);
  const passed = verdicts.filter((v) => v.passed).length;
  const total = verdicts.length;
  const passPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const railClass = HERO_RAIL_CLASS[kind];
  const badgeClass = HERO_BADGE_CLASS[kind];

  const handleCopy = (text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className={`${styles.hero} ${railClass}`}>
      {run?.error && (
        <div className={styles.heroTopBanner}>
          <AlertCircle size={16} />
          <span>{run.error}</span>
        </div>
      )}

      <div className={styles.heroBadgeBlock}>
        <div className={`${styles.verdictBadge} ${badgeClass}`}>
          {kind === "pass" && <CheckCircle size={14} />}
          {kind === "fail" && <XCircle size={14} />}
          {kind === "running" && <Loader2 size={14} className={styles.spinIcon} />}
          {kind === "noRun" && <XCircle size={14} />}
          {label}
        </div>

        {total > 0 ? (
          <div className={styles.heroMeter}>
            <div
              className={styles.heroMeterRing}
              style={{ "--pct": passPct, "--col": METER_COLOR[kind] } as React.CSSProperties}
            >
              <span className={styles.heroMeterValue}>
                {passPct}
                <sub>%</sub>
              </span>
            </div>
            <div className={styles.heroMeterLabel}>
              <span className={styles.heroMeterCaption}>Targets met</span>
              <span className={styles.heroMeterDetail}>
                {passed} of {total}
              </span>
            </div>
          </div>
        ) : kind === "running" ? (
          <span className={styles.passRatio}>Targets stream in once the load test starts</span>
        ) : (
          <span className={styles.passRatio}>No targets evaluated yet</span>
        )}
      </div>

      <div className={styles.heroIdStrip}>
        <h1 className={styles.runName}>{run?.run_name ?? "Untitled run"}</h1>

        <div className={styles.idGrid}>
          <span className={styles.idLabel}>Model</span>
          <span className={styles.idValue}>{run?.model_id ?? "—"}</span>

          <span className={styles.idLabel}>Run ID</span>
          <span className={`${styles.idValue} ${styles.idValueMono}`} title={run?.run_id ?? ""}>
            {run ? truncateMid(run.run_id, 14, 6) : "—"}
            {run && (
              <button
                type="button"
                className={styles.copyButton}
                aria-label="Copy run id"
                onClick={() => handleCopy(run.run_id)}
              >
                <Copy size={11} />
              </button>
            )}
            {copied && <span className={styles.copiedLabel}>copied</span>}
          </span>

          <span className={styles.idLabel}>Created</span>
          <span
            className={styles.idValue}
            title={formatAbsTime(run?.created_at != null ? String(run.created_at) : null)}
          >
            {formatRelTime(run?.created_at != null ? String(run.created_at) : null)}
          </span>

          <span className={styles.idLabel}>Duration</span>
          <span className={`${styles.idValue} ${styles.idValueMono}`}>
            {formatDuration(run?.duration_seconds ?? null)}
          </span>
        </div>
      </div>

      <div className={styles.heroActions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          onClick={onReRun}
          disabled={!run}
        >
          <RefreshCw size={14} />
          Re-run
        </button>
        <button type="button" className={styles.actionButton} onClick={onDownload} disabled={!run}>
          <Download size={14} />
          Report
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionButtonDanger}`}
          onClick={onDelete}
          disabled={!run}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

export default VerdictHero;
