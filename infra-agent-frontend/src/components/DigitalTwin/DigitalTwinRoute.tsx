"use client";

/**
 * Route-level wrapper behind `/digital-twin`: fetches infrastructure
 * topology + live cluster health via RTK Query, merges them into
 * health-annotated `GlobeSite[]`, and renders the loading/error/ready
 * states. Kept out of `src/app/digital-twin/page.tsx` (routing-only, no
 * data-fetching per the structural rules) and out of
 * `DataCenterDigitalTwin` itself (which stays a reusable, data-agnostic
 * presentation component driven entirely by its `sites` prop).
 *
 * After a bulk upload the backend monitoring pipeline needs time to
 * process the new data, so `useDigitalTwinPolling` retries every 20s for
 * up to 3 minutes before surfacing an error, showing progress in the
 * meantime.
 */

import { useMemo } from "react";
import {
  useGetDigitalTwinDataQuery,
  useGetLiveClustersQuery,
} from "@/features/digitalTwin/digitalTwinApi";
import { transformApiToGlobeSites } from "@/features/digitalTwin/digitalTwinDataTransform";
import { DataCenterDigitalTwin } from "./DataCenterDigitalTwin";
import { DigitalTwinError } from "./DigitalTwinError";
import { DigitalTwinLoading } from "./DigitalTwinLoading";
import { useDigitalTwinPolling } from "./useDigitalTwinPolling";
import type { GlobeSite, SiteHealthStatus } from "./types";

/** Poll interval for live cluster health (matches Command Center). */
const LIVE_CLUSTERS_POLLING_INTERVAL = 10000;

export function DigitalTwinRoute() {
  const {
    data: rawData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetDigitalTwinDataQuery(undefined, {
    // Always fetch fresh data on mount (important right after a bulk upload).
    refetchOnMountOrArgChange: true,
  });

  // `getDigitalTwinData` returns the raw NetBox-shaped tree so future callers
  // needing the untransformed shape can reuse this same cached query — this
  // route transforms it into the flattened GlobeSite[] the globe renders.
  const sites = useMemo(() => (rawData ? transformApiToGlobeSites(rawData) : undefined), [rawData]);

  // Same live-health merge as Command Center / Physical Systems so critical
  // (red) and warning device highlights appear on /digital-twin.
  const { data: liveClustersData } = useGetLiveClustersQuery(undefined, {
    pollingInterval: LIVE_CLUSTERS_POLLING_INTERVAL,
  });

  const sitesWithHealth = useMemo((): GlobeSite[] => {
    if (!sites?.length) {
      return [];
    }

    if (!liveClustersData?.clusters?.length) {
      return sites.map((site) => ({ ...site, healthStatus: "unknown" as SiteHealthStatus }));
    }

    const clusterHealthMap = new Map<
      string,
      {
        status: SiteHealthStatus;
        issue: string | null;
        affectedDevice: string | null;
        affectedDevices: string[];
        warningDevices: string[];
      }
    >();

    liveClustersData.clusters.forEach((cluster) => {
      clusterHealthMap.set(cluster.primary_site, {
        status: cluster.health_status as SiteHealthStatus,
        issue: cluster.issue_summary,
        affectedDevice: cluster.affected_device,
        affectedDevices: cluster.affected_devices ?? [],
        warningDevices: cluster.warning_device_names ?? [],
      });
    });

    return sites.map((site) => {
      const healthInfo = clusterHealthMap.get(site.name);
      return {
        ...site,
        healthStatus: healthInfo?.status || "unknown",
        issueSummary: healthInfo?.issue || null,
        affectedDevice: healthInfo?.affectedDevice || null,
        affectedDevices: healthInfo?.affectedDevices ?? [],
        warningDevices: healthInfo?.warningDevices ?? [],
      };
    });
  }, [sites, liveClustersData]);

  const hasData = Array.isArray(sites) && sites.length > 0;
  const isWaiting = !isLoading && !isFetching && !hasData && !error;

  const { pollCount, elapsed, timedOut, pollIntervalSeconds, resetPolling } = useDigitalTwinPolling(
    {
      hasData,
      hasError: !!error,
      refetch,
    },
  );

  // Loading: first fetch or background refetch in progress.
  if (isLoading || isFetching) {
    return (
      <DigitalTwinLoading
        hint={
          pollCount > 0 ? `Checking for infrastructure data… (attempt ${pollCount + 1})` : undefined
        }
      />
    );
  }

  // Hard API error.
  if (error) {
    return <DigitalTwinError error={error} refetch={refetch} />;
  }

  // Data not yet available — backend pipeline is still processing the upload.
  if (!hasData) {
    if (timedOut) {
      return (
        <DigitalTwinError
          error={{
            message:
              "Infrastructure data is taking longer than expected to process. " +
              "The backend pipeline may still be running. " +
              "Please retry in a moment.",
          }}
          refetch={() => {
            resetPolling();
            refetch();
          }}
        />
      );
    }

    // Still within the wait window — show loading with progress context.
    return (
      <DigitalTwinLoading
        hint={
          isWaiting
            ? `Processing uploaded data… retrying in ${pollIntervalSeconds - (elapsed % pollIntervalSeconds)}s`
            : "Waiting for infrastructure data…"
        }
      />
    );
  }

  return (
    <DataCenterDigitalTwin
      sites={sitesWithHealth}
      initialViewMode="globe"
      onDeviceSelect={() => {}}
    />
  );
}

export default DigitalTwinRoute;
