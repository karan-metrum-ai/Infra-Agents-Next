"use client";

import { FileText } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/Badge/Badge";
import { Card } from "@/components/ui/Card/Card";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useListTemplatesQuery } from "@/features/reports/reportsApi";
import { cn } from "@/lib/utils";

import type { ReportSchema } from "./reportSchema.types";
import {
  DEFAULT_TEMPLATE_ID,
  formatTemplateLabel,
  isTemplateDisabled,
  sortTemplates,
  templateToSchema,
} from "./schemaUtils";
import styles from "./TemplateCards.module.css";

interface TemplateCardsProps {
  onLoadTemplate: (schema: ReportSchema) => void;
  activeTemplateId?: string;
  onGenerateDirect?: (templateId: string, title?: string) => void;
  generating?: boolean;
}

export function TemplateCards({
  onLoadTemplate,
  activeTemplateId = "",
  onGenerateDirect,
  generating = false,
}: TemplateCardsProps) {
  const { data, isLoading, error, refetch } = useListTemplatesQuery();
  const templates = sortTemplates(data?.templates ?? []);
  const autoLoadedRef = useRef(false);

  // One-time reaction to the template list landing: auto-load the default
  // (or first editable) template into the editor unless one is already
  // active. Ported from the Vite source's identical mount effect.
  useEffect(() => {
    if (autoLoadedRef.current || activeTemplateId || templates.length === 0) {
      return;
    }
    const defaultTemplate =
      templates.find((t) => t.template_id === DEFAULT_TEMPLATE_ID) ??
      templates.find((t) => !t.generate_only) ??
      templates[0];
    autoLoadedRef.current = true;
    if (defaultTemplate && !defaultTemplate.generate_only) {
      onLoadTemplate(templateToSchema(defaultTemplate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onLoadTemplate is a stable parent callback, not a reactive dep we want to re-fire on
  }, [activeTemplateId, templates]);

  if (isLoading) {
    return (
      <div className={styles.panelLoading}>
        <Spinner />
        <span>Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.panelEmpty}>
        <p>Failed to load templates</p>
        <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={styles.panelEmpty}>
        <p>No templates available from the backend.</p>
      </div>
    );
  }

  return (
    <>
      <p className={styles.panelHint}>Select a template to load into the editor.</p>
      <div className={styles.templateGrid}>
        {templates.map((t) => {
          const disabled = isTemplateDisabled(t.template_id);
          const isGenerateOnly = Boolean(t.generate_only);
          const busy = isGenerateOnly && generating;
          const label = t.title ?? formatTemplateLabel(t.template_id);
          const selected = activeTemplateId === t.template_id;

          return (
            <Card
              key={t.template_id}
              variant="borderless"
              className={cn(
                styles.templateCard,
                selected && styles.templateCardSelected,
                disabled && styles.templateCardDisabled,
              )}
            >
              <button
                type="button"
                className={styles.templateCardButton}
                disabled={disabled || busy}
                aria-disabled={disabled || busy}
                title={
                  disabled
                    ? "This template is not available yet"
                    : isGenerateOnly
                      ? "Generate this report (last 7 days)"
                      : undefined
                }
                onClick={() => {
                  if (disabled || generating) return;
                  if (isGenerateOnly) {
                    onGenerateDirect?.(t.template_id, t.title);
                    return;
                  }
                  onLoadTemplate(templateToSchema(t));
                }}
              >
                <span className={styles.templateCardIcon}>
                  {busy ? <Spinner size="sm" /> : <FileText size={16} />}
                </span>
                <span className={styles.templateCardBody}>
                  <span className={styles.templateCardTitle}>{label}</span>
                  <span className={styles.templateCardMeta}>
                    {isGenerateOnly
                      ? busy
                        ? "Generating…"
                        : "One-click · last 7 days"
                      : `v${t.version} · ${t.section_count} sections`}
                  </span>
                </span>
                <Badge
                  className={styles.templateCardBadge}
                  variant={isGenerateOnly || t.source === "custom" ? "default" : "secondary"}
                >
                  {isGenerateOnly ? "generate" : t.source}
                </Badge>
              </button>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default TemplateCards;
