"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  HardDrive,
  Monitor,
  Network,
  Server,
  Sparkles,
  Thermometer,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import styles from "./RecommendTeamModal.module.css";
import type { RecommendFeature, RecommendTeamModalProps } from "./RecommendTeamModal.types";

const AVAILABLE_FEATURES: RecommendFeature[] = [
  {
    id: "autonomous-monitoring",
    name: "Autonomous Monitoring",
    description: "AI-driven continuous system health and performance surveillance",
    icon: Monitor,
    category: "monitoring",
    row: "top",
  },
  {
    id: "server-provisioning",
    name: "Server Provisioning",
    description: "Automated server deployment and configuration management",
    icon: Server,
    category: "infrastructure",
    row: "top",
  },
  {
    id: "incident-response",
    name: "Incident Response",
    description: "Rapid detection, analysis, and automated issue resolution",
    icon: AlertTriangle,
    category: "troubleshooting",
    row: "top",
  },
  {
    id: "reporting",
    name: "Reporting",
    description: "Comprehensive analytics and automated report generation",
    icon: FileText,
    category: "reporting",
    row: "bottom",
  },
  {
    id: "cooling-systems-oversight",
    name: "Cooling Systems Oversight",
    description: "Thermal management and HVAC system optimization",
    icon: Thermometer,
    category: "infrastructure",
    row: "bottom",
  },
  {
    id: "network-management",
    name: "Network Management",
    description: "Network topology monitoring and traffic optimization",
    icon: Network,
    category: "infrastructure",
    row: "bottom",
  },
  {
    id: "vm-management",
    name: "VM Management",
    description: "Virtual machine lifecycle, power operations, and resource optimization",
    icon: HardDrive,
    category: "infrastructure",
    row: "bottom",
  },
];

const DEFAULT_SELECTED_FEATURES = AVAILABLE_FEATURES.map((feature) => feature.id);
const CLOSE_ANIMATION_MS = 200;

function RecommendTeamModalContent({
  onClose,
  onShowRecommendedTeam,
}: Omit<RecommendTeamModalProps, "isOpen">) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(DEFAULT_SELECTED_FEATURES);
  const [isClosing, setIsClosing] = useState(false);
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  };

  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId],
    );
  };

  const handleShowRecommendedTeam = () => {
    onShowRecommendedTeam(selectedFeatures);
    handleClose();
  };

  const renderFeatureCard = (feature: RecommendFeature) => {
    const isSelected = selectedFeatures.includes(feature.id);
    const Icon = feature.icon;

    return (
      <button
        key={feature.id}
        type="button"
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom-styled selection card; a native `<input type="checkbox">` can't be skinned to this card layout without losing the design system's visual language.
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`${feature.name}: ${feature.description}`}
        onClick={() => handleFeatureToggle(feature.id)}
        className={cn(styles.featureCard, isSelected && styles.featureSelected)}
      >
        <div className={styles.featureHeader}>
          <div className={styles.featureIconWrapper}>
            <Icon className={styles.featureIcon} aria-hidden="true" />
          </div>
          <div
            className={cn(styles.checkbox, isSelected && styles.checkboxSelected)}
            aria-hidden="true"
          >
            {isSelected && <CheckCircle className={styles.checkIcon} />}
          </div>
        </div>

        <div className={styles.featureContent}>
          <h3 className={styles.featureName}>{feature.name}</h3>
          <p className={styles.featureDescription}>{feature.description}</p>
          <span className={styles.featureCategory}>
            {feature.category.charAt(0).toUpperCase() + feature.category.slice(1)}
          </span>
        </div>
      </button>
    );
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- backdrop-click-to-close is a supplemental mouse affordance; Escape (via handleKeyDown on the dialog itself) and the close button already cover keyboard/screen-reader users.
    <div
      className={cn(styles.modalBackdrop, isClosing && styles.backdropClosing)}
      onClick={handleClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onClick` stops backdrop-close clicks from bubbling past the dialog card; `onKeyDown` below is Escape-to-close/Tab-cycling via `useDialogFocusTrap`. Both are supplemental to the close button, which remains fully keyboard/screen-reader operable. */}
      <div
        ref={dialogRef}
        className={cn(styles.modalContainer, isClosing && styles.modalClosing)}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled divs + `useDialogFocusTrap` rather than the native `<dialog>` element, for consistent theming/animation across every modal.
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommend-team-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 id="recommend-team-modal-title" className={styles.modalTitle}>
              AI Team Recommendation
            </h2>
            <p className={styles.modalSubtitle}>
              Select the capabilities you need for your infrastructure team
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <X className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.activeFeaturesGrid}>
            {AVAILABLE_FEATURES.filter((feature) => feature.row === "top").map(renderFeatureCard)}
          </div>
          <div className={styles.disabledFeaturesGrid}>
            {AVAILABLE_FEATURES.filter((feature) => feature.row === "bottom").map(
              renderFeatureCard,
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.footerSummary}>
            <Sparkles className={styles.activityIcon} aria-hidden="true" />
            <div className={styles.summaryText}>
              <span className={styles.summaryCount}>
                {selectedFeatures.length} capabilities selected
              </span>
              <span className={styles.summaryDescription}>Specialized agents for these areas</span>
            </div>
          </div>
          <div className={styles.footerActions}>
            <button type="button" className={styles.cancelButton} onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleShowRecommendedTeam}
              disabled={selectedFeatures.length === 0}
            >
              <Sparkles className={styles.buttonIcon} aria-hidden="true" />
              Show Recommended Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Pure feature-selection UI for the "Recommend Team" flow — no API calls of
 * its own. Confirming calls `onShowRecommendedTeam(selectedFeatureIds)`; the
 * orchestrator that owns this modal is what actually calls
 * `getRecommendedTeam` and loads the result onto the canvas.
 */
export function RecommendTeamModal({ isOpen, ...rest }: RecommendTeamModalProps) {
  if (!isOpen) return null;
  return <RecommendTeamModalContent {...rest} />;
}

export default RecommendTeamModal;
