"use client";

/**
 * DataCenterDigitalTwin Page Component
 *
 * Complete data center digital twin experience with three view modes:
 * 1. Globe View - Interactive world map with site markers
 * 2. Exterior View - 3D building with clickable floors
 * 3. Interior View - Data center floor with racks and devices
 *
 * Supports animated transitions between views. State/data-derivation is
 * split into `useDigitalTwinViewState` (view mode, selection, transition
 * phase) and `useDigitalTwinTelemetry` (live telemetry + rack layout) so
 * this file stays a thin render composition of its sibling subcomponents.
 *
 * Ghost technician support was intentionally dropped: it's unreachable
 * dead code in the source app (out of scope for this whole migration),
 * so no GhostTechnician import/JSX or agent-activity polling is carried
 * forward here.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useRegisterCommand } from "@/hooks/useCommandRegistry";
import { DigitalTwinBuildingStats } from "./DigitalTwinBuildingStats";
import { DigitalTwinDeviceDetailPanel } from "./DigitalTwinDeviceDetailPanel";
import { DigitalTwinFloorSelector } from "./DigitalTwinFloorSelector";
import { DigitalTwinGlobeView } from "./DigitalTwinGlobeView";
import { DigitalTwinSiteHeader } from "./DigitalTwinSiteHeader";
import { DigitalTwinViewModeToggle } from "./DigitalTwinViewModeToggle";
import { TransitionOverlay } from "./TransitionOverlay";
import { useDigitalTwinTelemetry } from "./useDigitalTwinTelemetry";
import { useDigitalTwinViewState } from "./useDigitalTwinViewState";
import styles from "./DataCenterDigitalTwin.module.css";
import type { DataCenterDigitalTwinProps } from "./DataCenterDigitalTwin.types";
import type { GlobeSite } from "./types";

/**
 * `DigitalTwinCanvasView` pulls in `@react-three/fiber`/`@react-three/drei`/
 * `three` (the interior rack scene and the exterior building scene) --
 * genuinely heavy, WebGL-dependent, client-only libraries per Phase 15's
 * `next/dynamic` mandate. `ssr: false` is required (not just `"use client"`)
 * since WebGL canvases cannot render during SSR/prerendering.
 */
const DigitalTwinCanvasView = dynamic(
  () => import("./DigitalTwinCanvasView").then((mod) => mod.DigitalTwinCanvasView),
  { ssr: false },
);

const TOTAL_FLOORS = 9;
const FLOOR_HEIGHT = 4;

/** Stable identity so the default never re-triggers downstream memo/effects. */
const EMPTY_SITES: GlobeSite[] = [];

export function DataCenterDigitalTwin({
  sites = EMPTY_SITES,
  initialViewMode = "globe",
  onDeviceSelect,
  hideNavigation = false,
  clusterId,
}: DataCenterDigitalTwinProps) {
  const router = useRouter();
  const { markStepComplete } = useOnboardingStatus();

  const {
    viewMode,
    setViewMode,
    selectedSite,
    selectedDeviceIds,
    selectedDevice,
    selectedRackId,
    currentFloor,
    healthPanelDeviceId,
    healthPanelDeviceName,
    transitionState,
    showContent,
    handleSiteClick,
    handleBackToGlobe,
    handleToggleSelection,
    handleDeviceClick,
    handleOpenHealthPanel,
    handleCloseHealthPanel,
    handleCloseDeviceCard,
    handleRackClick,
    handleResetView,
    handleFloorChange,
    handleFloorClickFromExterior,
  } = useDigitalTwinViewState({
    sites,
    initialViewMode,
    totalFloors: TOTAL_FLOORS,
    onDeviceSelect,
  });

  const { currentFloorRacks, layoutWarnings } = useDigitalTwinTelemetry({
    clusterId,
    selectedSite,
  });

  const handleContinueToWorkflows = useCallback(() => {
    // Mark topology step as complete before navigating to workflows.
    markStepComplete("topology");
    router.push("/workflows");
  }, [router, markStepComplete]);

  useRegisterCommand({
    id: "digital-twin:back-to-globe",
    label: "Back to globe view",
    group: "Actions",
    disabled: viewMode === "globe",
    perform: handleBackToGlobe,
  });
  useRegisterCommand({
    id: "digital-twin:reset-view",
    label: "Reset digital twin view",
    group: "Actions",
    disabled: viewMode === "globe",
    perform: handleResetView,
  });
  useRegisterCommand({
    id: "digital-twin:continue-to-workflows",
    label: "Continue to Workflows",
    group: "Actions",
    disabled: viewMode !== "globe",
    perform: handleContinueToWorkflows,
  });

  if (viewMode === "globe") {
    return (
      <DigitalTwinGlobeView
        sites={sites}
        hideNavigation={hideNavigation}
        transitionState={transitionState}
        showContent={showContent}
        onSiteClick={handleSiteClick}
        onContinueToWorkflows={handleContinueToWorkflows}
      />
    );
  }

  // Data center view (interior/exterior)
  const regionName = selectedSite?.name || "Unknown";
  const floorServerCount = currentFloorRacks.reduce((acc, r) => acc + r.devices.length, 0);
  const totalRacks = currentFloorRacks.length * TOTAL_FLOORS;
  const totalServers = floorServerCount * TOTAL_FLOORS;

  return (
    <div className={styles.twinRoot}>
      <TransitionOverlay transitionState={transitionState} siteName={selectedSite?.name} />

      <DigitalTwinCanvasView
        viewMode={viewMode}
        racks={currentFloorRacks}
        regionName={regionName}
        currentFloor={currentFloor}
        totalFloors={TOTAL_FLOORS}
        floorHeight={FLOOR_HEIGHT}
        selectedRackId={selectedRackId}
        selectedDeviceIds={selectedDeviceIds}
        layoutWarnings={layoutWarnings}
        showContent={showContent}
        onRackClick={handleRackClick}
        onDeviceClick={handleDeviceClick}
        onToggleSelection={handleToggleSelection}
        onResetView={handleResetView}
        onFloorClickFromExterior={handleFloorClickFromExterior}
      />

      {!hideNavigation && (
        <DigitalTwinSiteHeader
          regionName={regionName}
          address={selectedSite?.address || "Unknown location"}
          viewMode={viewMode}
          currentFloor={currentFloor}
          totalFloors={TOTAL_FLOORS}
          showContent={showContent}
          onBackToGlobe={handleBackToGlobe}
        />
      )}

      <DigitalTwinFloorSelector
        currentFloor={currentFloor}
        totalFloors={TOTAL_FLOORS}
        showContent={showContent}
        onFloorChange={handleFloorChange}
      />

      <DigitalTwinViewModeToggle
        viewMode={viewMode}
        showContent={showContent}
        onViewModeChange={setViewMode}
      />

      <DigitalTwinDeviceDetailPanel
        viewMode={viewMode}
        selectedDevice={selectedDevice}
        healthPanelDeviceId={healthPanelDeviceId}
        healthPanelDeviceName={healthPanelDeviceName}
        onCloseDeviceCard={handleCloseDeviceCard}
        onViewFullDetails={handleOpenHealthPanel}
        onCloseHealthPanel={handleCloseHealthPanel}
      />

      {!hideNavigation && (
        <DigitalTwinBuildingStats
          totalFloors={TOTAL_FLOORS}
          totalRacks={totalRacks}
          totalServers={totalServers}
          currentFloor={currentFloor}
          floorRackCount={currentFloorRacks.length}
          floorServerCount={floorServerCount}
          showContent={showContent}
        />
      )}
    </div>
  );
}

export default DataCenterDigitalTwin;
