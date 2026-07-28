import type {
  LiveDeviceSensor,
  LiveDeviceStorageDrive,
} from "@/features/digitalTwin/digitalTwinApi.types";
import { cn } from "@/lib/utils";
import {
  getDriveSensors,
  getHealthIndicator,
  getTempColor,
  safeNumber,
  safeString,
} from "../deviceHealthHelpers";
import sharedStyles from "../DeviceHealthPanel.module.css";
import styles from "./StorageDriveCard.module.css";

function formatBytesGib(bytes: number): string {
  const gib = bytes / 1024 ** 3;
  return `${gib.toFixed(1)} GB`;
}

interface StorageDriveCardProps {
  drive: LiveDeviceStorageDrive;
  index: number;
  allSensors: LiveDeviceSensor[];
}

/** Single storage-drive card: SMART health, wear/spare, error counters, PCIe AER, diskstats I/O. */
export function StorageDriveCard({ drive, index, allSensors }: StorageDriveCardProps) {
  const indicator = getHealthIndicator(drive?.health);
  const StatusIcon = indicator.icon;
  const driveSensors = getDriveSensors(allSensors, drive?.slot || "");
  const tempSensor = driveSensors.find((s) => s.name.includes("Composite Temperature"));
  const readIopsSensor = driveSensors.find((s) => s.name.includes("Read IOPS"));
  const writeIopsSensor = driveSensors.find((s) => s.name.includes("Write IOPS"));

  const tempC = drive?.temperature_celsius ?? drive?.hwmon_temp ?? tempSensor?.value ?? null;
  const wearPct = drive?.wear_level ?? drive?.wear_used_percent ?? null;
  const sparePct = drive?.spare_percent ?? drive?.available_spare_percent ?? null;
  const mediaErr = drive?.media_errors ?? null;
  const critWarn = drive?.critical_warning ?? null;
  const powerOnH = drive?.power_on_hours ?? null;
  const powerCyc = drive?.power_cycles ?? null;
  const pcieCor = drive?.pcie_aer_correctable ?? null;
  const pcieUncor = drive?.pcie_aer_uncorrectable ?? null;
  const ioTimeout = drive?.io_timeouts ?? null;
  const ioErrors = drive?.io_errors ?? null;
  const dskReads = drive?.diskstats_reads ?? null;
  const dskWrites = drive?.diskstats_writes ?? null;
  const dskRb = drive?.diskstats_read_bytes ?? null;
  const dskWb = drive?.diskstats_write_bytes ?? null;
  const ctrlState = drive?.controller_state ?? null;

  const hasLiveMetrics = drive?.has_live_metrics === true || tempC != null || wearPct != null;

  return (
    <div className={sharedStyles.componentItem}>
      <div className={sharedStyles.componentHeader}>
        <span className={sharedStyles.componentName}>
          {safeString(drive?.name, `Drive ${index + 1}`)}
        </span>
        <div className={styles.headerRight}>
          {ctrlState && (
            <span
              className={cn(
                styles.controllerBadge,
                ctrlState === "normal" ? styles.controllerBadgeNormal : styles.controllerBadgeWarn,
              )}
            >
              {ctrlState}
            </span>
          )}
          <StatusIcon size={14} style={{ color: indicator.color }} aria-hidden="true" />
        </div>
      </div>
      <div className={sharedStyles.componentDetails}>
        <span>
          {safeString(drive?.model)} | {drive?.capacity_gb ?? 0} GB |{" "}
          {safeString(drive?.media_type)} | {safeString(drive?.protocol)}
        </span>
        <span>
          S/N: {safeString(drive?.serial_number)} | Slot: {safeString(drive?.slot)}
        </span>

        <span>
          {tempC != null && (
            <span style={{ color: getTempColor(tempC), marginRight: 8 }}>
              Temp: {tempC.toFixed(1)}°C
            </span>
          )}
          {wearPct != null && (
            <span
              style={{
                color: wearPct >= 80 ? "var(--warning)" : "rgba(255,255,255,0.45)",
                marginRight: 8,
              }}
            >
              Wear: {wearPct.toFixed(1)}%
            </span>
          )}
          {sparePct != null && (
            <span className={styles.spareThreshold}>
              Spare: {sparePct.toFixed(1)}%
              {drive?.spare_threshold != null && (
                <span
                  style={{
                    color:
                      sparePct < (drive.spare_threshold ?? 10)
                        ? "var(--destructive)"
                        : "rgba(255,255,255,0.35)",
                    marginLeft: 4,
                  }}
                >
                  (thr:{drive.spare_threshold}%)
                </span>
              )}
            </span>
          )}
        </span>

        {(mediaErr != null || critWarn != null || ioTimeout != null || ioErrors != null) && (
          <span>
            {(mediaErr ?? 0) > 0 && (
              <span style={{ color: "var(--warning)", marginRight: 8 }}>
                Media Errors: {mediaErr}
              </span>
            )}
            {(critWarn ?? 0) > 0 && (
              <span style={{ color: "var(--destructive)", marginRight: 8 }}>
                Crit Warn: {critWarn}
              </span>
            )}
            {(ioTimeout ?? 0) > 0 && (
              <span style={{ color: "var(--warning)", marginRight: 8 }}>
                I/O Timeouts: {ioTimeout}
              </span>
            )}
            {(ioErrors ?? 0) > 0 && (
              <span style={{ color: "var(--warning)", marginRight: 8 }}>
                I/O Errors: {ioErrors}
              </span>
            )}
          </span>
        )}

        {(pcieCor != null || pcieUncor != null) && (
          <span>
            PCIe AER — Corr:{" "}
            <span
              style={{ color: (pcieCor ?? 0) > 0 ? "var(--warning)" : "rgba(255,255,255,0.45)" }}
            >
              {pcieCor ?? 0}
            </span>
            {" | "}
            Uncorr:{" "}
            <span
              style={{
                color: (pcieUncor ?? 0) > 0 ? "var(--destructive)" : "rgba(255,255,255,0.45)",
              }}
            >
              {pcieUncor ?? 0}
            </span>
          </span>
        )}

        {(dskReads != null || dskWrites != null) && (
          <span>
            I/O: R:{dskReads?.toLocaleString() ?? "N/A"} / W:{dskWrites?.toLocaleString() ?? "N/A"}{" "}
            ops
            {dskRb != null && dskWb != null && (
              <>
                {" "}
                ({formatBytesGib(dskRb)} / {formatBytesGib(dskWb)})
              </>
            )}
          </span>
        )}

        {!dskReads && (readIopsSensor || writeIopsSensor) && (
          <span>
            IOPS R:{safeNumber(readIopsSensor?.value, 0)} / W:
            {safeNumber(writeIopsSensor?.value, 0)}
          </span>
        )}

        {(powerOnH != null || powerCyc != null) && (
          <span>
            {powerOnH != null && `On: ${powerOnH.toLocaleString()}h `}
            {powerCyc != null && `Cycles: ${powerCyc.toLocaleString()}`}
          </span>
        )}

        {!hasLiveMetrics && <span className={styles.notice}>No live metrics available</span>}
      </div>
    </div>
  );
}

export default StorageDriveCard;
