"use client";

import { Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import styles from "./JinjaPreview.module.css";

/**
 * Renders the Jinja-exported report preview: either a generated PDF (via
 * `pdfUrl`, remounted on `pdfReloadKey` change so a fresh generation always
 * re-fetches instead of showing a stale cached iframe) or the raw Jinja
 * HTML export (via `srcDoc`, sandboxed to same-origin only -- no scripts).
 * Ported from the Vite app's `components/ReportBuilder/JinjaPreview.tsx`.
 */
export interface JinjaPreviewProps {
  html: string | null;
  pdfUrl?: string | null;
  pdfReloadKey?: number;
  reportTitle?: string | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function JinjaPreview({
  html,
  pdfUrl = null,
  pdfReloadKey = 0,
  reportTitle = null,
  loading,
  error,
  onRefresh,
}: JinjaPreviewProps) {
  const showingPdf = Boolean(pdfUrl);

  return (
    <div className={styles.jinjaPreview}>
      {showingPdf && pdfUrl ? (
        <div className={styles.previewPdfToolbar}>
          <span className={styles.previewPdfTitle}>{reportTitle || "Generated report"}</span>
          <div className={styles.previewPdfActions}>
            <Button
              variant="secondary"
              size="sm"
              render={
                <a href={pdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} />
                  Open in new tab
                </a>
              }
              nativeButton={false}
            />
            <Button
              variant="default"
              size="sm"
              render={
                <a href={pdfUrl} download>
                  <Download size={13} />
                  Download PDF
                </a>
              }
              nativeButton={false}
            />
          </div>
        </div>
      ) : null}

      {loading && (
        <div className={styles.previewState}>
          <Loader2 className={styles.spinner} size={28} />
          <span>{showingPdf ? "Loading report preview..." : "Rendering Jinja preview..."}</span>
        </div>
      )}

      {!loading && error && (
        <div className={styles.previewState}>
          <p className={styles.previewError}>{error}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && showingPdf && pdfUrl && (
        <iframe
          key={pdfReloadKey}
          title="Report PDF preview"
          src={pdfUrl}
          className={styles.jinjaIframe}
        />
      )}

      {!loading && !error && !showingPdf && html && (
        <iframe
          title="Jinja report preview"
          srcDoc={html}
          className={styles.jinjaIframe}
          sandbox="allow-same-origin"
        />
      )}

      {!loading && !error && !showingPdf && !html && (
        <div className={styles.previewState}>
          <span>Add sections in the editor to generate a preview.</span>
        </div>
      )}
    </div>
  );
}
