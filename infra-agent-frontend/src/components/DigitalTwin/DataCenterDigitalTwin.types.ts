import type { Device3D, GlobeSite, Rack3D, TransitionState, ViewMode } from "./types";

export interface DataCenterDigitalTwinProps {
  sites?: GlobeSite[];
  initialViewMode?: ViewMode;
  onDeviceSelect?: (device: Device3D) => void;
  hideNavigation?: boolean;
  clusterId?: string | null;
}

/** Shared "fade the chrome out during view transitions" style hook contract. */
export interface ShowContentProps {
  showContent: boolean;
}

export interface TransitionOverlayProps {
  transitionState: TransitionState;
  siteName?: string;
}

export interface DigitalTwinGlobeViewProps extends ShowContentProps {
  sites: GlobeSite[];
  hideNavigation: boolean;
  transitionState: TransitionState;
  onSiteClick: (site: GlobeSite) => void;
  onContinueToWorkflows: () => void;
}

export interface DigitalTwinSiteHeaderProps extends ShowContentProps {
  regionName: string;
  address: string;
  viewMode: ViewMode;
  currentFloor: number;
  totalFloors: number;
  onBackToGlobe: () => void;
}

export interface DigitalTwinFloorSelectorProps extends ShowContentProps {
  currentFloor: number;
  totalFloors: number;
  onFloorChange: (floor: number) => void;
}

export interface DigitalTwinViewModeToggleProps extends ShowContentProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export interface DigitalTwinBuildingStatsProps extends ShowContentProps {
  totalFloors: number;
  totalRacks: number;
  totalServers: number;
  currentFloor: number;
  floorRackCount: number;
  floorServerCount: number;
}

export interface DigitalTwinDeviceDetailPanelProps {
  viewMode: ViewMode;
  selectedDevice: Device3D | null;
  healthPanelDeviceId: number | null;
  healthPanelDeviceName: string;
  onCloseDeviceCard: () => void;
  onViewFullDetails: (device: Device3D) => void;
  onCloseHealthPanel: () => void;
}

export interface DigitalTwinCanvasViewProps extends ShowContentProps {
  viewMode: ViewMode;
  racks: Rack3D[];
  regionName: string;
  currentFloor: number;
  totalFloors: number;
  floorHeight: number;
  selectedRackId: string | null;
  selectedDeviceIds: Set<string>;
  layoutWarnings: string[];
  onRackClick: (rackId: string) => void;
  onDeviceClick: (device: Device3D) => void;
  onToggleSelection: (deviceId: string, selected: boolean) => void;
  onResetView: () => void;
  onFloorClickFromExterior: (floor: number) => void;
}
