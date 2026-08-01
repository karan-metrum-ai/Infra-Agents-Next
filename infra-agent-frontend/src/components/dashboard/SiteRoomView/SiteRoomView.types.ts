import type { GlobeSite } from "@/components/DigitalTwin/types";

export interface SiteRoomViewProps {
  /** The site to display. */
  site: GlobeSite;
  /** Cluster ID for live device telemetry. */
  clusterId?: string | null;
  className?: string;
}
