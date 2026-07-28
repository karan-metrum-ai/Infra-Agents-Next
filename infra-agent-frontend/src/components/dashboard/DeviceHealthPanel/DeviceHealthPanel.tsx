"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Cpu, Server, Thermometer, Activity, X } from "lucide-react";
import { FreshnessBadge } from "@/components/ui/FreshnessBadge/FreshnessBadge";
import { useGetLiveDeviceDetailQuery } from "@/features/digitalTwin/digitalTwinApi";
import { cn } from "@/lib/utils";
import { EventsTab } from "./tabs/EventsTab";
import { HardwareTab } from "./tabs/HardwareTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { ThermalTab } from "./tabs/ThermalTab";
import { TrendsTab } from "./tabs/TrendsTab";
import { getHealthIndicator } from "./deviceHealthHelpers";
import styles from "./DeviceHealthPanel.module.css";
import type { DeviceHealthPanelProps, Tab, TabId } from "./DeviceHealthPanel.types";

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: Server },
  { id: "hardware", label: "Hardware", icon: Cpu },
  { id: "thermal", label: "Thermal", icon: Thermometer },
  { id: "trends", label: "Trends", icon: Activity },
  { id: "events", label: "Events", icon: Activity },
];

/** Tabbed detail panel for a single physical device's live health telemetry. */
export function DeviceHealthPanel({
  deviceId,
  deviceName,
  onClose,
  variant = "default",
}: DeviceHealthPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { data, isLoading, isError, refetch } = useGetLiveDeviceDetailQuery(deviceId, {
    pollingInterval: 30000,
  });

  const handleTabChange = useCallback((tabId: TabId) => setActiveTab(tabId), []);

  const renderTabContent = () => {
    if (!data) return null;
    switch (activeTab) {
      case "overview":
        return <OverviewTab data={data} />;
      case "hardware":
        return <HardwareTab data={data} />;
      case "thermal":
        return <ThermalTab data={data} />;
      case "trends":
        return <TrendsTab data={data} />;
      case "events":
        return <EventsTab data={data} />;
      default:
        return null;
    }
  };

  return (
    <div className={variant === "right" ? styles.panelRight : styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <Server size={18} aria-hidden="true" />
          <div className={styles.headerText}>
            <h3 className={styles.deviceName}>{deviceName}</h3>
            {data && (
              <span className={styles.deviceMeta}>
                {data.manufacturer ?? "N/A"} {data.model ?? "N/A"} | {data.rack ?? "N/A"} U
                {data.position ?? "?"}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close panel"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {isLoading && (
        <div className={styles.loadingState}>
          <div className={cn(styles.skeleton, styles.skeletonBanner)} />
          <div className={cn(styles.skeleton, styles.skeletonSection)} />
          <div className={styles.skeletonMetrics}>
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
            <div className={cn(styles.skeleton, styles.skeletonMetricItem)} />
          </div>
          <div className={cn(styles.skeleton, styles.skeletonSection)} />
        </div>
      )}

      {isError && (
        <div className={styles.errorState}>
          <AlertTriangle size={32} aria-hidden="true" />
          <p>Failed to load device health data</p>
          <span className={styles.errorDetail}>Unknown error</span>
          <button type="button" className={styles.retryButton} onClick={() => refetch()}>
            Retry
          </button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <>
          <div className={styles.tabs}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(styles.tab, activeTab === tab.id && styles.tabActive)}
                  onClick={() => handleTabChange(tab.id)}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                >
                  <Icon size={12} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.content}>{renderTabContent()}</div>

          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              {(() => {
                const healthStatus = data.health_status ?? "unknown";
                const indicator = getHealthIndicator(
                  healthStatus === "healthy"
                    ? "OK"
                    : healthStatus === "warning"
                      ? "Warning"
                      : healthStatus === "unhealthy"
                        ? "Critical"
                        : null,
                );
                const HealthIcon = indicator.icon;
                return (
                  <>
                    <HealthIcon size={12} style={{ color: indicator.color }} aria-hidden="true" />
                    <span className={styles.healthStatus} style={{ color: indicator.color }}>
                      {healthStatus.toUpperCase()}
                    </span>
                  </>
                );
              })()}
              {data.data_freshness && (
                <FreshnessBadge
                  dataFreshness={data.data_freshness}
                  lastTelemetryTimestamp={data.last_telemetry_timestamp}
                />
              )}
            </div>
            <button type="button" className={styles.refreshButton} onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DeviceHealthPanel;
