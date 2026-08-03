"use client";

/**
 * Globe view mode of `DataCenterDigitalTwin`: the world globe and the
 * "Continue with team building" onboarding CTA. Global chrome (hamburger,
 * logo, nav, avatar) comes from `LiveDashboardShell`, mounted by
 * `app/digital-twin/layout.tsx`.
 */

import dynamic from "next/dynamic";
import { TransitionOverlay } from "./TransitionOverlay";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinGlobeViewProps } from "./DataCenterDigitalTwin.types";

/** `react-globe.gl` is a heavy, WebGL-dependent, client-only library (Phase 15). */
const DataCenterGlobe = dynamic(() => import("./DataCenterGlobe"), { ssr: false });

/** Temporarily hide the onboarding CTA; the command palette still exposes it. */
const CONTINUE_CTA_ENABLED = false;

export function DigitalTwinGlobeView({
  sites,
  hideNavigation,
  transitionState,
  showContent,
  onSiteClick,
  onContinueToWorkflows,
}: DigitalTwinGlobeViewProps) {
  return (
    <div className={styles.twinRoot}>
      <TransitionOverlay transitionState={transitionState} />

      <div
        className={`${styles.globeStage} ${showContent ? styles.globeStageVisible : styles.globeStageHidden}`}
      >
        <DataCenterGlobe sites={sites} onSiteClick={onSiteClick} hideNavigation={hideNavigation} />
      </div>

      {CONTINUE_CTA_ENABLED && !hideNavigation && (
        <div
          className={`${styles.continueButtonWrap} ${showContent ? styles.continueButtonVisible : styles.continueButtonHidden}`}
        >
          <button type="button" onClick={onContinueToWorkflows} className={styles.continueButton}>
            Continue with team building
          </button>
        </div>
      )}
    </div>
  );
}
