"use client";

import { ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/Card/Card";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useListReportsQuery } from "@/features/reports/reportsApi";
import type { RecentReport } from "@/features/reports/reportsApi.types";
import { formatAbsTime, formatBytes, formatRelTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { resolveReportDisplayTitle } from "./schemaUtils";
import styles from "./RecentReportsPanel.module.css";

const PAGE_SIZE = 20;

function formatReportMeta(report: RecentReport): string {
  const parts = [report.uploaded_at ? formatRelTime(report.uploaded_at) : "Unknown date"];
  if (report.size_bytes) parts.push(formatBytes(report.size_bytes));
  return parts.join(" · ");
}

interface RecentReportsPanelProps {
  /** Bump to force an immediate refetch (e.g. right after generating a report). */
  refreshKey?: number;
  selectedReportId?: string | null;
  onSelectReport: (report: RecentReport) => void;
}

export function RecentReportsPanel({
  refreshKey = 0,
  selectedReportId = null,
  onSelectReport,
}: RecentReportsPanelProps) {
  const [page, setPage] = useState(0);
  const { data, isLoading, isFetching, error, refetch } = useListReportsQuery(undefined, {
    pollingInterval: 20000,
  });

  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  const allReports = useMemo(() => data?.reports ?? [], [data]);
  const totalCount = data?.count ?? allReports.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // Derived instead of effect-corrected: clamps to the last valid page
  // whenever the list shrinks (e.g. a report is deleted elsewhere) without
  // needing a `useEffect` to re-sync `page` after the fact.
  const clampedPage = Math.min(page, totalPages - 1);

  const reports = useMemo(
    () => allReports.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [allReports, clampedPage],
  );

  const rangeStart = totalCount === 0 ? 0 : clampedPage * PAGE_SIZE + 1;
  const rangeEnd = clampedPage * PAGE_SIZE + reports.length;
  const loading = isLoading || isFetching;
  const errorMessage = error ? "Failed to load recent reports" : null;

  return (
    <aside className={styles.rightPanel}>
      <div className={styles.panelTitleBar}>
        <div className={styles.panelTitle} aria-current="page">
          Recent Reports
        </div>
      </div>

      <div className={styles.panelBody}>
        <p className={styles.panelHint}>
          Previously generated reports. Click to preview. Use the download icon to save the PDF.
        </p>

        {loading && (
          <div className={styles.panelLoading}>
            <Spinner />
            <span>Loading reports...</span>
          </div>
        )}

        {!loading && errorMessage && (
          <div className={styles.panelEmpty}>
            <p>{errorMessage}</p>
            <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !errorMessage && reports.length === 0 && (
          <div className={styles.panelEmpty}>
            <FileText size={28} style={{ opacity: 0.35 }} />
            <p>No generated reports yet.</p>
            <p className={styles.panelHint}>
              Configure your template, pick a date range, and click Generate Report to create your
              first PDF.
            </p>
          </div>
        )}

        {!loading && !errorMessage && reports.length > 0 && (
          <div className={styles.blockList}>
            {reports.map((report) => (
              <Card
                key={report.report_id}
                variant="borderless"
                className={cn(
                  styles.reportListItem,
                  selectedReportId === report.report_id && styles.reportListItemActive,
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectReport(report)}
                  className={styles.reportListItemMain}
                  aria-label={resolveReportDisplayTitle(report)}
                  title={report.uploaded_at ? formatAbsTime(report.uploaded_at) : undefined}
                >
                  <span className={styles.reportInfo}>
                    <span className={styles.reportListLabel}>
                      {resolveReportDisplayTitle(report)}
                    </span>
                    <span className={styles.reportListMeta}>{formatReportMeta(report)}</span>
                  </span>
                </button>
                {report.pdf_url && (
                  <a
                    className={styles.reportDownloadBtn}
                    href={report.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    title="Download PDF"
                    aria-label="Download PDF"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={14} />
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {!loading && !errorMessage && totalCount > 0 && (
        <div className={styles.panelFooter}>
          <div className={styles.panelPaginationFooter}>
            <button
              type="button"
              className={styles.panelPaginationBtn}
              onClick={() => setPage(clampedPage - 1)}
              disabled={clampedPage === 0 || totalPages <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className={styles.panelPaginationInfo}>
              {rangeStart}–{rangeEnd} of {totalCount}
            </span>
            <button
              type="button"
              className={styles.panelPaginationBtn}
              onClick={() => setPage(clampedPage + 1)}
              disabled={clampedPage >= totalPages - 1 || totalPages <= 1}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export default RecentReportsPanel;
