import { HardDrive } from "lucide-react";
import type {
  LiveDeviceSensor,
  LiveDeviceStorageDrive,
} from "@/features/digitalTwin/digitalTwinApi.types";
import { DetailAccordion } from "./DetailAccordion";
import { formatBytes, getDriveSensors } from "./serverDetailsFormatters";
import styles from "./ServerDetailsCard.module.css";

interface StorageDrivesSectionProps {
  data: {
    storage_drives: LiveDeviceStorageDrive[];
    sensors?: LiveDeviceSensor[];
  };
}

/** Expandable section showing NVMe drive metrics. */
export function StorageDrivesSection({ data }: StorageDrivesSectionProps) {
  const drives = data.storage_drives || [];
  if (drives.length === 0) return null;

  return (
    <DetailAccordion title="Storage Drives" icon={HardDrive} count={drives.length}>
      <div className={styles.itemGrid}>
        {drives.map((drive, index) => {
          const driveSensors = getDriveSensors(data.sensors, drive.slot || "");
          const tempSensor = driveSensors.find((s) => s.name.includes("Composite Temperature"));
          const wearSensor = driveSensors.find((s) => s.name.includes("Wear Used"));
          const isHealthy = drive.health === "OK";

          return (
            <div key={drive.id || index} className={styles.itemCard}>
              <div className={styles.itemCardHeader}>
                <span className={styles.itemCardTitle}>
                  {drive.name || drive.slot || `Drive ${index + 1}`}
                </span>
                <span className={isHealthy ? styles.driveHealthOk : styles.driveHealthWarn}>
                  {drive.health || "Unknown"}
                </span>
              </div>
              <div className={styles.itemCardBody}>
                <span>
                  {drive.model || "NVMe SSD"} | {formatBytes(drive.capacity_gb)}
                </span>
                <span>S/N: {drive.serial_number || "N/A"}</span>
                {tempSensor && <span>Temp: {tempSensor.value?.toFixed(1) ?? "N/A"}°C</span>}
                {wearSensor && <span>Wear: {wearSensor.value?.toFixed(1) ?? "N/A"}%</span>}
              </div>
            </div>
          );
        })}
      </div>
    </DetailAccordion>
  );
}

export default StorageDrivesSection;
