"use client";

/**
 * Globe view mode of `DataCenterDigitalTwin`: the world globe, top nav,
 * profile avatar, and the "Continue with team building" onboarding CTA.
 */

import dynamic from "next/dynamic";
import { ProfileAvatar } from "@/components/ProfileAvatar/ProfileAvatar";
import { GlobalInfrastructurePanel } from "./GlobalInfrastructurePanel";
import { TransitionOverlay } from "./TransitionOverlay";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DigitalTwinGlobeViewProps } from "./DataCenterDigitalTwin.types";

/** `react-globe.gl` is a heavy, WebGL-dependent, client-only library (Phase 15). */
const DataCenterGlobe = dynamic(() => import("./DataCenterGlobe"), { ssr: false });

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

      {!hideNavigation && <GlobalInfrastructurePanel />}
      {!hideNavigation && <ProfileAvatar position="fixed" />}

      <div
        className={`${styles.globeStage} ${showContent ? styles.globeStageVisible : styles.globeStageHidden}`}
      >
        <DataCenterGlobe sites={sites} onSiteClick={onSiteClick} hideNavigation={hideNavigation} />
      </div>

      {!hideNavigation && (
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
