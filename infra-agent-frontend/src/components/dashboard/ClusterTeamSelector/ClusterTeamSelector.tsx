"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, Circle, Loader2, Server } from "lucide-react";
import { useGetClusterIdsQuery, useGetClusterTeamQuery } from "@/features/teams/teamsApi";
import { cn } from "@/lib/utils";
import styles from "./ClusterTeamSelector.module.css";
import type { ClusterTeamSelectorProps } from "./ClusterTeamSelector.types";

/**
 * Sanitizes a cluster name by removing underscores and capitalizing each word.
 * Falls back to the raw cluster id if no name is available.
 */
function formatClusterName(name: string | undefined, clusterId: string): string {
  if (!name) return clusterId;
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Compact dropdown showing available clusters. Indicates whether the
 * selected cluster has an active deployed team.
 *
 * Supports controlled (`value` prop) and uncontrolled (`defaultClusterId`)
 * modes. Constraint: one cluster has only one active deployed team.
 */
export function ClusterTeamSelector({
  onClusterChange,
  defaultClusterId,
  value,
  disabled = false,
}: ClusterTeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalClusterId, setInternalClusterId] = useState<string | null>(
    defaultClusterId ?? null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isControlled = value !== undefined;
  const selectedClusterId = isControlled ? value : internalClusterId;

  const setSelectedClusterId = useCallback(
    (clusterId: string | null) => {
      if (!isControlled) {
        setInternalClusterId(clusterId);
      }
    },
    [isControlled],
  );

  const {
    data: clustersData,
    isLoading: isLoadingClusters,
    isError: isErrorClusters,
    refetch: refetchClusters,
  } = useGetClusterIdsQuery();

  const {
    data: clusterTeamData,
    isFetching: isFetchingTeam,
    isError: isErrorTeam,
  } = useGetClusterTeamQuery(selectedClusterId ?? "", {
    skip: !selectedClusterId,
  });

  // Consider both the deployment flag and the response status field —
  // "no_active_team" is a valid, non-error response shape.
  const hasDeployedTeam =
    clusterTeamData?.deployment?.is_deployed === true &&
    clusterTeamData?.status !== "no_active_team" &&
    clusterTeamData?.team_composition?.orchestrator !== null;

  // Notify the parent whenever the resolved team status for the current
  // cluster settles.
  useEffect(() => {
    if (selectedClusterId && !isFetchingTeam) {
      onClusterChange?.(selectedClusterId, hasDeployedTeam);
    }
  }, [selectedClusterId, hasDeployedTeam, isFetchingTeam, onClusterChange]);

  // Auto-select the first cluster once the list loads and nothing is
  // selected yet. In controlled mode this only notifies the parent — the
  // actual team status is reported by the effect above once it resolves.
  useEffect(() => {
    if (selectedClusterId || !clustersData?.cluster_ids?.length) return;
    const firstClusterId = String(clustersData.cluster_ids[0].cluster_id);
    if (isControlled) {
      onClusterChange?.(firstClusterId, false);
    } else {
      setSelectedClusterId(firstClusterId);
    }
  }, [clustersData, selectedClusterId, isControlled, onClusterChange, setSelectedClusterId]);

  const handleClusterSelect = useCallback(
    (clusterId: string) => {
      setIsOpen(false);
      if (isControlled) {
        // Don't report team status here — the effect above sends the
        // correct value once the new cluster's team data resolves.
        onClusterChange?.(clusterId, false);
      } else {
        setSelectedClusterId(clusterId);
      }
    },
    [isControlled, onClusterChange, setSelectedClusterId],
  );

  // Close the dropdown on outside click or Escape, restoring focus to the trigger.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (isLoadingClusters) {
    return (
      <div className={styles.selectorContainer}>
        <output className={styles.loadingState} aria-label="Loading clusters">
          <Loader2 className={styles.spinnerIcon} size={14} aria-hidden="true" />
        </output>
      </div>
    );
  }

  if (isErrorClusters) {
    return (
      <div className={styles.selectorContainer}>
        <button
          type="button"
          className={styles.errorState}
          onClick={() => refetchClusters()}
          aria-label="Failed to load clusters. Click to retry."
          title="Click to retry"
        >
          <AlertCircle size={14} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!clustersData?.cluster_ids?.length) {
    return (
      <div className={styles.selectorContainer}>
        <div className={styles.emptyState}>
          <Server size={14} aria-hidden="true" />
          <span>No clusters</span>
        </div>
      </div>
    );
  }

  const renderStatusIndicator = () => {
    if (isFetchingTeam) {
      return <Loader2 className={styles.statusSpinner} size={8} aria-hidden="true" />;
    }
    if (isErrorTeam && !clusterTeamData) {
      return <AlertCircle className={styles.statusInactive} size={8} aria-hidden="true" />;
    }
    if (hasDeployedTeam) {
      return <Circle className={styles.statusActive} size={8} aria-hidden="true" />;
    }
    return <Circle className={styles.statusInactive} size={8} aria-hidden="true" />;
  };

  const selectedCluster = clustersData.cluster_ids.find(
    (cluster) => String(cluster.cluster_id) === selectedClusterId,
  );
  const selectedClusterDisplayName = selectedClusterId
    ? formatClusterName(selectedCluster?.cluster_name, selectedClusterId)
    : "...";
  const statusLabel = isFetchingTeam
    ? "checking team status"
    : hasDeployedTeam
      ? "active team deployed"
      : "no active team";

  return (
    <div className={styles.selectorContainer} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.trigger, isOpen && styles.open, disabled && styles.disabled)}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Selected cluster: ${selectedClusterDisplayName}, ${statusLabel}`}
        title={`${selectedClusterDisplayName} — ${statusLabel}`}
        disabled={disabled}
      >
        {renderStatusIndicator()}
        <span className={styles.clusterLabel} aria-hidden="true">
          {selectedClusterDisplayName}
        </span>
        {!disabled && (
          <ChevronDown
            className={cn(styles.chevron, isOpen && styles.rotated)}
            size={14}
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && !disabled && (
        <div
          className={styles.dropdown}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom rich-content listbox (status dot + device count per row), a native <select> can't render this
          role="listbox"
          aria-label="Clusters"
        >
          <div className={styles.dropdownHeader}>
            <span>Clusters</span>
            <span className={styles.clusterCount}>{clustersData.total_clusters}</span>
          </div>
          <div className={styles.dropdownList}>
            {clustersData.cluster_ids.map((cluster) => {
              const clusterId = String(cluster.cluster_id);
              const isSelected = clusterId === selectedClusterId;
              const displayName = formatClusterName(cluster.cluster_name, clusterId);

              return (
                <button
                  key={clusterId}
                  type="button"
                  className={cn(styles.clusterItem, isSelected && styles.selected)}
                  onClick={() => handleClusterSelect(clusterId)}
                  // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom listbox option row (id + device count), not a native <option>
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className={styles.clusterId}>{displayName}</span>
                  <span className={styles.deviceCount}>{cluster.device_count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
