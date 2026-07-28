import type { GlobeSite, SiteHealthStatus } from "./types";

export interface DataCenterGlobeProps {
  sites: GlobeSite[];
  onSiteClick: (site: GlobeSite) => void;
  hideNavigation?: boolean;
  /** Hide the site list panel on the right */
  hideSiteListPanel?: boolean;
  /** Hide the stats panel at bottom-left */
  hideStatsPanel?: boolean;
  /** Disable click on markers (tooltip-only mode) */
  disableMarkerClick?: boolean;
  /** Hide the bottom instructions text */
  hideInstructions?: boolean;
  /** Currently selected site id (highlights globe pin + list card). */
  selectedSiteId?: number | null;
  /** Always-visible popup tips: detail card or mini issue count. */
  enablePersistentTips?: boolean;
}

/** Point data structure for react-globe.gl's points layer. */
export interface GlobePointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  site: GlobeSite;
  healthStatus: SiteHealthStatus;
}

/** Ring data for the pulsating effect on unhealthy/warning sites. */
export interface GlobeRingData {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string | string[];
  site: GlobeSite;
}
