"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./RackInfoCard.module.css";
import type { RackInfoCardProps } from "./RackInfoCard.types";

/** Maps device status to the CSS variable driving the status dot color. */
function getStatusColor(status: string): string {
  switch (status) {
    case "online":
      return "var(--color-success)";
    case "degraded":
      return "var(--color-warning)";
    case "offline":
      return "var(--color-danger)";
    default:
      return "var(--color-text-muted)";
  }
}

function getHealthStatusDisplay(health?: string): { text: string; color: string } {
  switch (health) {
    case "ok":
      return { text: "HEALTHY", color: "var(--color-success)" };
    case "warning":
      return { text: "WARNING", color: "var(--color-warning)" };
    case "critical":
      return { text: "CRITICAL", color: "var(--color-danger)" };
    default:
      return { text: "UNKNOWN", color: "var(--color-text-muted)" };
  }
}

/** CSS Module class for an accelerator badge, keyed by accelerator kind. */
function getAcceleratorBadgeClass(accelerators: string): string {
  if (accelerators === "GPU") return styles.acceleratorBadgeGpu;
  if (accelerators === "AI Accelerator") return styles.acceleratorBadgeAi;
  return styles.acceleratorBadgeDefault;
}

export default function RackInfoCard({
  deviceData,
  isSelected,
  onClose,
  onToggleSelection,
}: RackInfoCardProps) {
  if (!deviceData) return null;

  const healthDisplay = getHealthStatusDisplay(deviceData.health_status);

  return (
    <div className={styles.rackInfoCard}>
      <div className={styles.cardHeader}>
        <div className={styles.headerTitle}>
          <h2>{deviceData.hostname}</h2>
          <span className={styles.deviceTypeBadge}>{deviceData.device_type}</span>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close device details"
        >
          ×
        </button>
      </div>

      {/* Selection Control */}
      <div className={styles.selectionControl}>
        <label className={styles.selectionCheckbox}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onToggleSelection(deviceData.device_id, e.target.checked)}
          />
          <span className={styles.checkboxCustom}>
            {isSelected && <Check size={14} aria-hidden="true" />}
          </span>
          <span className={styles.checkboxLabel}>
            {isSelected ? "Selected for Onboarding" : "Select for Onboarding"}
          </span>
        </label>
      </div>

      <div className={styles.cardContent}>
        {/* Status Section */}
        <div className={styles.infoSection}>
          <div className={styles.infoLabel}>Status</div>
          <div className={styles.infoValue}>
            <span
              className={styles.statusDot}
              style={{ backgroundColor: getStatusColor(deviceData.status) }}
              aria-hidden="true"
            />
            {deviceData.status.toUpperCase()}
          </div>
        </div>

        {deviceData.health_status && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Health</div>
            <div className={styles.infoValue} style={{ color: healthDisplay.color }}>
              {healthDisplay.text}
            </div>
          </div>
        )}

        {/* Network Information */}
        <div className={styles.infoSection}>
          <div className={styles.infoLabel}>IP Address</div>
          <div className={cn(styles.infoValue, styles.mono)}>{deviceData.ip_address}</div>
        </div>

        {/* Hardware Information */}
        <div className={styles.infoSection}>
          <div className={styles.infoLabel}>Manufacturer</div>
          <div className={styles.infoValue}>{deviceData.manufacturer}</div>
        </div>

        <div className={styles.infoSection}>
          <div className={styles.infoLabel}>Model</div>
          <div className={styles.infoValue}>{deviceData.model}</div>
        </div>

        {deviceData.firmware_version && deviceData.firmware_version !== "Unknown" && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Firmware</div>
            <div className={styles.infoValue}>{deviceData.firmware_version}</div>
          </div>
        )}

        {/* Location Information */}
        {deviceData.location && deviceData.location !== "Unknown" && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Location</div>
            <div className={styles.infoValue}>{deviceData.location}</div>
          </div>
        )}

        <div className={styles.infoSection}>
          <div className={styles.infoLabel}>Rack Position</div>
          <div className={styles.infoValue}>{deviceData.rack_position}</div>
        </div>

        {/* Performance Metrics */}
        {deviceData.power_consumption !== undefined && deviceData.power_consumption > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Power Draw</div>
            <div className={styles.infoValue}>{deviceData.power_consumption.toFixed(1)}W</div>
          </div>
        )}

        {deviceData.temperature !== undefined && deviceData.temperature > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Temperature</div>
            <div className={styles.infoValue}>{deviceData.temperature.toFixed(1)}°C</div>
          </div>
        )}

        {/* Management Information */}
        {deviceData.management_interface && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Management</div>
            <div className={styles.infoValue}>{deviceData.management_interface}</div>
          </div>
        )}

        {deviceData.protocols_found && deviceData.protocols_found.length > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Protocols</div>
            <div className={styles.infoValue}>
              {deviceData.protocols_found.join(", ").toUpperCase()}
            </div>
          </div>
        )}

        {deviceData.ports_count !== undefined && deviceData.ports_count > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Ports</div>
            <div className={styles.infoValue}>{deviceData.ports_count}</div>
          </div>
        )}

        {/* BMC Information */}
        {deviceData.bmc_ip && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>BMC IP</div>
            <div className={cn(styles.infoValue, styles.mono)}>{deviceData.bmc_ip}</div>
          </div>
        )}

        {deviceData.bmc_type && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>BMC Type</div>
            <div className={styles.infoValue}>{deviceData.bmc_type}</div>
          </div>
        )}

        {/* Accelerator Information */}
        {deviceData.accelerators && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Accelerator</div>
            <div className={styles.infoValue}>
              <span
                className={cn(
                  styles.acceleratorBadge,
                  getAcceleratorBadgeClass(deviceData.accelerators),
                )}
              >
                {deviceData.accelerators}
              </span>
            </div>
          </div>
        )}

        {deviceData.gpu_count !== undefined && deviceData.gpu_count > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>GPU Count</div>
            <div className={styles.infoValue}>{deviceData.gpu_count}</div>
          </div>
        )}

        {/* Cluster & Tenant */}
        {deviceData.cluster_id && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Cluster</div>
            <div className={styles.infoValue}>{deviceData.cluster_id}</div>
          </div>
        )}

        {deviceData.tenant && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Tenant</div>
            <div className={styles.infoValue}>{deviceData.tenant}</div>
          </div>
        )}

        {/* Asset Information */}
        {deviceData.serial && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Serial</div>
            <div className={cn(styles.infoValue, styles.mono)}>{deviceData.serial}</div>
          </div>
        )}

        {deviceData.asset_tag && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Asset Tag</div>
            <div className={styles.infoValue}>{deviceData.asset_tag}</div>
          </div>
        )}

        {/* Tags */}
        {deviceData.tags && deviceData.tags.length > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoLabel}>Tags</div>
            <div className={cn(styles.infoValue, styles.tagsList)}>
              {deviceData.tags.map((tag) => (
                <span key={tag} className={styles.tagBadge}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
