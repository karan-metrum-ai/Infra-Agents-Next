"use client";

/**
 * Owns all view-mode/selection/transition state for `DataCenterDigitalTwin`:
 * globe -> exterior -> interior navigation, selected site/rack/device,
 * current floor, the full device-health-panel toggle, and the zoom
 * transition overlay's phase. Extracted from the page component so the
 * ~1300-LOC Vite original's view-mode toggle logic is testable and
 * readable independent of the render tree.
 */

import { useCallback, useEffect, useState } from "react";
import type { Device3D, GlobeSite, TransitionState, ViewMode } from "./types";

export interface UseDigitalTwinViewStateOptions {
  sites: GlobeSite[];
  initialViewMode: ViewMode;
  totalFloors: number;
  onDeviceSelect?: (device: Device3D) => void;
}

export function useDigitalTwinViewState({
  sites,
  initialViewMode,
  totalFloors,
  onDeviceSelect,
}: UseDigitalTwinViewStateOptions) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [selectedSite, setSelectedSite] = useState<GlobeSite | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [selectedDevice, setSelectedDevice] = useState<Device3D | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [healthPanelDeviceId, setHealthPanelDeviceId] = useState<number | null>(null);
  const [healthPanelDeviceName, setHealthPanelDeviceName] = useState<string>("");
  const [transitionState, setTransitionState] = useState<TransitionState>("idle");
  const [showContent, setShowContent] = useState(true);

  // Update selectedSite when the `sites` prop changes (from polling) so the
  // interior view shows the latest device data.
  useEffect(() => {
    if (selectedSite && sites.length > 0) {
      const updatedSite = sites.find((site) => site.id === selectedSite.id);
      if (updatedSite && updatedSite !== selectedSite) {
        setSelectedSite(updatedSite);
      }
    }
  }, [sites, selectedSite]);

  const handleSiteClick = useCallback((site: GlobeSite) => {
    setTransitionState("zooming-in");
    setShowContent(false);

    setTimeout(() => {
      setSelectedSite(site);
      setTransitionState("loading");
    }, 400);

    setTimeout(() => {
      setViewMode("interior");
      setCurrentFloor(1);
      setSelectedRackId(null);
      setSelectedDevice(null);
      setTransitionState("idle");
      setShowContent(true);
    }, 800);
  }, []);

  const handleBackToGlobe = useCallback(() => {
    setTransitionState("zooming-out");
    setShowContent(false);

    setTimeout(() => {
      setViewMode("globe");
      setSelectedSite(null);
      setSelectedRackId(null);
      setSelectedDevice(null);
      setTransitionState("idle");
      setShowContent(true);
    }, 600);
  }, []);

  const handleToggleSelection = useCallback((deviceId: string, isSelected: boolean) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (isSelected) {
        next.add(deviceId);
      } else {
        next.delete(deviceId);
      }
      return next;
    });
  }, []);

  const handleDeviceClick = useCallback(
    (device: Device3D) => {
      setSelectedDevice(device);
      onDeviceSelect?.(device);
    },
    [onDeviceSelect],
  );

  /** Open the full health panel for a device (extracts numeric id from device_id). */
  const handleOpenHealthPanel = useCallback((device: Device3D) => {
    const numericId = parseInt(device.device_id, 10);
    if (!Number.isNaN(numericId)) {
      setHealthPanelDeviceId(numericId);
      setHealthPanelDeviceName(device.hostname);
    }
  }, []);

  const handleCloseHealthPanel = useCallback(() => {
    setHealthPanelDeviceId(null);
    setHealthPanelDeviceName("");
  }, []);

  const handleCloseDeviceCard = useCallback(() => {
    setSelectedDevice(null);
  }, []);

  const handleRackClick = useCallback((rackId: string) => {
    setSelectedRackId((prev) => (prev === rackId ? null : rackId));
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedRackId(null);
  }, []);

  const handleFloorChange = useCallback(
    (floor: number) => {
      if (floor >= 1 && floor <= totalFloors) {
        setCurrentFloor(floor);
        setSelectedRackId(null);
        setSelectedDevice(null);
      }
    },
    [totalFloors],
  );

  const handleFloorClickFromExterior = useCallback((floor: number) => {
    setCurrentFloor(floor);
    setViewMode("interior");
  }, []);

  return {
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
  };
}
