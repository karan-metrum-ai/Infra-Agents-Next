"use client";

/**
 * ArtifactsList -- Lists known artifacts for a sandbox run.
 *
 * Since the V2 backend stores artifacts on PVC and exposes them via the
 * report endpoint, this component lists the standard artifacts and
 * allows downloading the report JSON.
 *
 * Ported verbatim behavior: both known artifact rows ("report.json" and
 * "metrics.json") download the identical `GET /runs/:runId/report` payload
 * under different filenames -- that's what the Vite source's
 * `sandboxApi.getReport(runId)` call (used unconditionally in
 * `handleDownload`, regardless of `name`) actually does. Not "fixed" here;
 * see `sandboxApi.ts`'s own doc comment on `getArtifact` for the same
 * "every artifact name resolves through the report endpoint" behavior on
 * the backend side.
 *
 * Adaptation: the raw `sandboxApi.getReport` fetch call is replaced with
 * `useLazyGetReportQuery` (RTK Query) per this app's "RTK Query for all
 * API calls" rule -- `useSandboxArtifact.ts` (already built this phase)
 * does the equivalent conversion for the read-only artifact/log hooks.
 */

import { useCallback, useState } from "react";
import { Download, FileJson } from "lucide-react";

import { useLazyGetReportQuery } from "@/features/sandbox/sandboxApi";
import styles from "./ArtifactsList.module.css";

interface ArtifactsListProps {
  runId: string;
}

const KNOWN_ARTIFACTS = [
  { name: "report.json", description: "Full evaluation report" },
  { name: "metrics.json", description: "Collected OTEL metrics" },
];

export function ArtifactsList({ runId }: ArtifactsListProps) {
  const [error, setError] = useState<string | null>(null);
  const [downloadingName, setDownloadingName] = useState<string | null>(null);
  const [triggerGetReport] = useLazyGetReportQuery();

  const handleDownload = useCallback(
    async (name: string) => {
      setError(null);
      setDownloadingName(name);
      try {
        const data = await triggerGetReport(runId).unwrap();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${runId}-${name}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed");
      } finally {
        setDownloadingName(null);
      }
    },
    [runId, triggerGetReport],
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Artifacts</h3>
        <span className={styles.sectionSubtitle}>{KNOWN_ARTIFACTS.length} files</span>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
        </div>
      )}

      <div className={styles.list}>
        {KNOWN_ARTIFACTS.map((a) => (
          <div className={styles.artifactRow} key={a.name}>
            <span className={styles.artifactName} title={a.name}>
              <FileJson size={14} className={styles.artifactIcon} aria-hidden="true" />
              {a.name}
            </span>
            <span className={styles.artifactDescription}>{a.description}</span>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => handleDownload(a.name)}
              disabled={downloadingName === a.name}
            >
              <Download size={12} aria-hidden="true" />
              {downloadingName === a.name ? "Downloading…" : "Download"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ArtifactsList;
