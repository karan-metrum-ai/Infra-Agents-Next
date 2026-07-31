/**
 * Map Command Center site API rows onto GlobeSite for the overview globe.
 *
 * Twin hierarchy (locations/racks) is merged separately when opening a
 * deeper split-view drill-down. `LiveDashboardOverview` (Phase 13) does not
 * currently open that split-view — see `mergeTwinIntoCommandCenterSite`'s
 * doc comment below for why it's ported but unused today.
 */

import type { GlobeSite, SiteHealthStatus } from "@/components/DigitalTwin/types";
import type { CommandCenterSite } from "@/features/digitalTwin/digitalTwinApi.types";

function mapStatus(status: string): SiteHealthStatus {
  if (status === "healthy") return "healthy";
  if (status === "warning") return "warning";
  if (status === "unhealthy" || status === "critical") return "unhealthy";
  return "unknown";
}

/**
 * Convert a Command Center site into a GlobeSite for markers / sidebar.
 *
 * Args:
 *   site: Command Center API site row.
 *
 * Returns:
 *   GlobeSite with CC enrichment fields; empty locations until twin merge.
 */
export function commandCenterSiteToGlobeSite(site: CommandCenterSite): GlobeSite {
  const lat = site.latitude;
  const lng = site.longitude;
  const location = site.location?.trim() || "";

  return {
    id: site.id,
    name: site.name,
    slug: site.name.toLowerCase().replace(/\s+/g, "-"),
    status: site.status,
    regionName: location,
    regionSlug: location.toLowerCase().replace(/\s+/g, "-"),
    latitude: lat ?? Number.NaN,
    longitude: lng ?? Number.NaN,
    address: location,
    rackCount: site.rack_count ?? 0,
    deviceCount: site.assets ?? 0,
    gpuCount: 0,
    locations: [],
    healthStatus: mapStatus(site.status),
    issueSummary: site.issue_summary,
    clusterId: site.cluster_id,
    healthPercent: site.health_percent ?? 0,
    incidentCounts: {
      critical: site.incident_counts?.critical ?? 0,
      warning: site.incident_counts?.warning ?? 0,
      unknown: site.incident_counts?.unknown ?? 0,
    },
    inventory: {
      compute: site.inventory?.compute ?? 0,
      storage: site.inventory?.storage ?? 0,
      network: site.inventory?.network ?? 0,
      other: site.inventory?.other ?? 0,
    },
    // `CommandCenterSite.utilization` is a required field on the wire
    // contract (missing per-role samples come through as `null` per-field,
    // never an absent object) — spread as-is, no fallback needed.
    utilization: { ...site.utilization },
    powerWattsAvg: site.power_watts_avg ?? null,
    powerWattsTotal: site.power_watts_total ?? null,
  };
}

/**
 * Merge twin hierarchy into a CC overview site for a deeper split-view.
 *
 * Ported 1:1 from the Vite source for future use (e.g. if a site
 * drill-down view lands later), but no current caller in this app invokes
 * it: `LiveDashboardOverview` renders the plain `commandCenterSiteToGlobeSite`
 * output directly — a real `GlobeSite` on its own — and its `onSiteClick`
 * navigates to the full `/digital-twin` route instead of merging in twin
 * data for an inline split-view (that split-view itself isn't in scope; see
 * the digitalTwinApi.ts doc comment). Wiring this up would require a second
 * `getDigitalTwinData` call the overview doesn't otherwise need.
 *
 * Args:
 *   ccSite: Overview site from /command-center/sites.
 *   twinSites: Full digital-twin GlobeSite list.
 *
 * Returns:
 *   Site with locations/racks from twin when matched by id or name.
 */
export function mergeTwinIntoCommandCenterSite(
  ccSite: GlobeSite,
  twinSites: GlobeSite[],
): GlobeSite {
  const twin =
    twinSites.find((s) => s.id === ccSite.id) ||
    twinSites.find((s) => s.name.toLowerCase() === ccSite.name.toLowerCase());

  if (!twin) return ccSite;

  return {
    ...ccSite,
    slug: twin.slug || ccSite.slug,
    regionName: twin.regionName || ccSite.regionName,
    regionSlug: twin.regionSlug || ccSite.regionSlug,
    address: twin.address || ccSite.address,
    latitude: twin.latitude || ccSite.latitude,
    longitude: twin.longitude || ccSite.longitude,
    rackCount: twin.rackCount || ccSite.rackCount,
    deviceCount: twin.deviceCount || ccSite.deviceCount,
    gpuCount: twin.gpuCount,
    locations: twin.locations,
    layoutWarnings: twin.layoutWarnings,
  };
}
