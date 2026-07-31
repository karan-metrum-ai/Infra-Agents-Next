"use client";

import { useCallback, useMemo } from "react";
import { Download, FileSpreadsheet, FileText, FolderDown, Layers, X } from "lucide-react";
import { toast } from "sonner";
import { LEVEL_CONFIG, LEVEL_ORDER } from "@/features/onboarding/onboardingApi.types";
import {
  BULK_UPLOAD_TEMPLATE_FILENAME,
  downloadBulkUploadTemplate,
} from "@/utils/bulkUploadTemplate";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { cn } from "@/lib/utils";
import styles from "./CsvFormatModal.module.css";

interface CsvFormatModalProps {
  onClose: () => void;
}

/**
 * "Format reference" dialog — the 5-hierarchy-level breakdown plus a
 * "download template" action. Ported from `BulkUploadStepper.tsx`'s local
 * `CsvFormatStepsModal` sub-component in the Vite source, extracted to its
 * own co-located sibling file here.
 *
 * Wired onto `useDialogFocusTrap` (real focus trap + Tab-cycling) instead
 * of the Vite original's ad-hoc `window`-level Escape listener, matching
 * the dialog convention `SaveTeamModal`/`NodeDetailsModal` already use in
 * this app.
 */
export function CsvFormatModal({ onClose }: CsvFormatModalProps) {
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  const totalObjectTypes = useMemo(
    () => LEVEL_ORDER.reduce((sum, level) => sum + LEVEL_CONFIG[level].objectTypes.length, 0),
    [],
  );

  const handleExportTemplate = useCallback(() => {
    downloadBulkUploadTemplate();
    toast.success("Template downloaded", {
      description: `${BULK_UPLOAD_TEMPLATE_FILENAME} saved to your Downloads folder.`,
    });
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- backdrop-click-to-close is a supplemental mouse affordance; Escape (via handleKeyDown on the dialog itself) and the close button already cover keyboard/screen-reader users.
    <div className={styles.backdrop} onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onClick` stops backdrop-close clicks from bubbling past the dialog card; `onKeyDown` is Escape-to-close/Tab-cycling via `useDialogFocusTrap`. Both are supplemental to the close button, which remains fully keyboard/screen-reader operable. */}
      <div
        ref={dialogRef}
        className={styles.modal}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled divs + `useDialogFocusTrap` rather than the native `<dialog>` element, for consistent theming/animation across every modal.
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-format-steps-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.headerIcon} aria-hidden="true">
              <FileText size={17} strokeWidth={2} />
            </span>
            <div className={styles.headerText}>
              <h4 id="csv-format-steps-title" className={styles.title}>
                CSV format reference
              </h4>
              <p className={styles.sub}>Hierarchy levels and example template</p>
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          <section className={styles.guideSection}>
            <div className={styles.guideSectionHead}>
              <Layers size={12} aria-hidden="true" />
              <span>Hierarchy levels</span>
              <span className={styles.guideSectionCount}>{LEVEL_ORDER.length} levels</span>
            </div>

            <div className={styles.guideLevelsGrid}>
              {LEVEL_ORDER.map((n) => {
                const cfg = LEVEL_CONFIG[n];
                const isOptional = cfg.optional === true;

                return (
                  <div
                    key={n}
                    className={cn(
                      styles.guideLevelCard,
                      n === 1 && styles.guideLevelCardWide,
                      isOptional && styles.guideLevelCardOptional,
                    )}
                  >
                    <div className={styles.guideLevelCardHead}>
                      <span className={styles.guideLevelNum}>L{n}</span>
                      <div className={styles.guideLevelCardTitle}>
                        <p className={styles.guideLevelName}>{cfg.name}</p>
                        {isOptional && <span className={styles.guideLevelOptional}>Optional</span>}
                      </div>
                    </div>
                    <div className={styles.guideTypeTags}>
                      {cfg.objectTypes.map((t) => (
                        <code key={t} className={styles.guideTag}>
                          {t}
                        </code>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.guideSection}>
            <div className={styles.guideSectionHead}>
              <Download size={12} aria-hidden="true" />
              <span>Example template</span>
            </div>

            <div className={styles.guideTemplateCard}>
              <div className={styles.guideTemplateBody}>
                <span className={styles.guideTemplateIcon} aria-hidden="true">
                  <FileSpreadsheet size={20} strokeWidth={2} />
                </span>

                <div className={styles.guideTemplateContent}>
                  <p className={styles.guideTemplateTitle}>Sample CSV with all hierarchy levels</p>
                  <p className={styles.guideTemplateDesc}>
                    Export a ready-made file with every section header and column name. Use it as a
                    starting point when preparing your onboarding CSV.
                  </p>
                  <div className={styles.guideTemplateBadges}>
                    <span className={styles.guideTemplateBadge}>{LEVEL_ORDER.length} levels</span>
                    <span className={styles.guideTemplateBadge}>
                      {totalObjectTypes} object types
                    </span>
                    <span className={styles.guideTemplateBadge}>CSV format</span>
                  </div>
                </div>
              </div>

              <div className={styles.guideTemplateFooter}>
                <div className={styles.guideTemplateFileInfo}>
                  <code className={styles.guideTemplateFilename}>
                    {BULK_UPLOAD_TEMPLATE_FILENAME}
                  </code>
                  <span className={styles.guideTemplateSaveHint}>
                    <FolderDown size={12} aria-hidden="true" />
                    Saved to your browser&apos;s Downloads folder
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.guideTemplateBtn}
                  onClick={handleExportTemplate}
                  aria-label={`Download ${BULK_UPLOAD_TEMPLATE_FILENAME}`}
                >
                  <Download size={15} aria-hidden="true" />
                  Download template
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CsvFormatModal;
