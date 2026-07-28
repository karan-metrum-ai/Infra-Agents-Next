import { Activity, Cpu, HardDrive, MemoryStick, Network, Zap } from "lucide-react";
import type { LiveDeviceDetailResponse } from "@/features/digitalTwin/digitalTwinApi.types";
import { CollapsibleSection, EmptyState } from "../DeviceHealthShared";
import {
  getHealthIndicator,
  getTempColor,
  safeArray,
  safeNumber,
  safeString,
} from "../deviceHealthHelpers";
import { StorageDriveCard } from "./StorageDriveCard";
import styles from "../DeviceHealthPanel.module.css";

/** Detailed hardware component information: processors, memory, storage, NICs, GPUs, PSUs. */
export function HardwareTab({ data }: { data: LiveDeviceDetailResponse }) {
  const processors = safeArray(data?.processors);
  const memory = safeArray(data?.memory);
  const storageDrives = safeArray(data?.storage_drives);
  const networkInterfaces = safeArray(data?.network_interfaces);
  const gpus = safeArray(data?.gpus);
  const gpusTelemetry = safeArray(data?.gpus_telemetry);
  const powerSupplies = safeArray(data?.power_supplies);
  const allSensors = safeArray(data?.sensors);

  return (
    <div className={styles.tabContent}>
      <CollapsibleSection title="Processors" icon={Cpu} count={processors.length} defaultExpanded>
        {processors.length > 0 ? (
          <div className={styles.componentGrid}>
            {processors.map((cpu, index) => {
              const indicator = getHealthIndicator(cpu?.health);
              const StatusIcon = indicator.icon;
              return (
                <div key={cpu?.id ?? index} className={styles.componentItem}>
                  <div className={styles.componentHeader}>
                    <span className={styles.componentName}>
                      {safeString(cpu?.name, `Processor ${index + 1}`)}
                    </span>
                    <StatusIcon size={14} style={{ color: indicator.color }} aria-hidden="true" />
                  </div>
                  <div className={styles.componentDetails}>
                    <span>{safeString(cpu?.model)}</span>
                    <span>
                      {cpu?.cores ?? 0} cores / {cpu?.threads ?? 0} threads
                    </span>
                    <span>
                      {cpu?.current_speed_mhz ?? 0} MHz (max {cpu?.max_speed_mhz ?? 0})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No processor information available" />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Memory DIMMs" icon={MemoryStick} count={memory.length}>
        {memory.length > 0 ? (
          <div className={styles.componentGrid}>
            {memory.map((dimm, index) => {
              const indicator = getHealthIndicator(dimm?.health);
              const StatusIcon = indicator.icon;
              return (
                <div key={dimm?.id ?? index} className={styles.componentCard}>
                  <div className={styles.componentCardHeader}>
                    <span>{safeString(dimm?.slot, `Slot ${index + 1}`)}</span>
                    <StatusIcon size={12} style={{ color: indicator.color }} aria-hidden="true" />
                  </div>
                  <span className={styles.componentCardValue}>{dimm?.capacity_gb ?? 0} GB</span>
                  <span className={styles.componentCardSub}>
                    {safeString(dimm?.type)} @ {dimm?.speed_mhz ?? 0} MHz
                  </span>
                  <span className={styles.componentCardMfg}>{safeString(dimm?.manufacturer)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No memory information available" />
        )}
      </CollapsibleSection>

      {storageDrives.length > 0 && (
        <CollapsibleSection title="Storage Drives" icon={HardDrive} count={storageDrives.length}>
          <div className={styles.componentGrid}>
            {storageDrives.map((drive, index) => (
              <StorageDriveCard
                key={drive?.id ?? index}
                drive={drive}
                index={index}
                allSensors={allSensors}
              />
            ))}
          </div>
        </CollapsibleSection>
      )}

      {networkInterfaces.length > 0 && (
        <CollapsibleSection
          title="Network Interfaces"
          icon={Network}
          count={networkInterfaces.length}
        >
          <div className={styles.componentGrid}>
            {networkInterfaces.map((nic, index) => {
              const indicator = getHealthIndicator(nic?.health);
              const StatusIcon = indicator.icon;
              const speedMbps = nic?.speed_mbps ?? 0;
              return (
                <div key={nic?.id ?? index} className={styles.componentItem}>
                  <div className={styles.componentHeader}>
                    <span className={styles.componentName}>
                      {safeString(nic?.name, `NIC ${index + 1}`)}
                    </span>
                    <div className={styles.componentHeaderRight}>
                      <span
                        className={styles.linkStatus}
                        data-status={nic?.link_status?.toLowerCase() ?? "unknown"}
                      >
                        {safeString(nic?.link_status)}
                      </span>
                      <StatusIcon size={14} style={{ color: indicator.color }} aria-hidden="true" />
                    </div>
                  </div>
                  <div className={styles.componentDetails}>
                    <span>{safeString(nic?.description)}</span>
                    <span>
                      {speedMbps >= 1000 ? `${speedMbps / 1000} Gbps` : `${speedMbps} Mbps`}
                    </span>
                    <span className={styles.macAddress}>{safeString(nic?.mac_address)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {gpus.length > 0 && (
        <CollapsibleSection title="GPUs" icon={Cpu} count={gpus.length} defaultExpanded>
          <div className={styles.componentGrid}>
            {gpus.map((gpu, index) => {
              const indicator = getHealthIndicator(gpu?.health);
              const StatusIcon = indicator.icon;
              return (
                <div key={gpu?.id ?? index} className={styles.componentItem}>
                  <div className={styles.componentHeader}>
                    <span className={styles.componentName}>
                      {safeString(gpu?.model, `GPU ${index + 1}`)}
                    </span>
                    <StatusIcon size={14} style={{ color: indicator.color }} aria-hidden="true" />
                  </div>
                  <div className={styles.componentDetails}>
                    <span>{safeString(gpu?.pci_slot)}</span>
                    <span>
                      {gpu?.memory_gb ?? 0} GB {safeString(gpu?.memory_type)}
                    </span>
                    <span>
                      Util: {gpu?.utilization_percent ?? 0}% | VRAM:{" "}
                      {gpu?.memory_utilization_percent ?? 0}%
                    </span>
                    <span>
                      Temp: {gpu?.temperature_celsius ?? 0}C | Power:{" "}
                      {gpu?.current_power_watts ?? 0}W
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {gpusTelemetry.length > 0 && (
        <CollapsibleSection
          title="GPU Telemetry"
          icon={Activity}
          count={gpusTelemetry.length}
          defaultExpanded
        >
          <div className={styles.componentGrid}>
            {gpusTelemetry.map((gpu, index) => (
              <div key={gpu?.gpu_index ?? index} className={styles.componentItem}>
                <div className={styles.componentHeader}>
                  <span className={styles.componentName}>
                    {safeString(gpu?.model, `GPU ${gpu?.gpu_index ?? index}`)}
                  </span>
                  <span className={styles.componentCardSub}>
                    {safeString(gpu?.vendor, "").toUpperCase()}
                  </span>
                </div>
                <div className={styles.componentDetails}>
                  {gpu?.utilization_percent != null && (
                    <span>Util: {gpu.utilization_percent.toFixed(1)}%</span>
                  )}
                  {gpu?.hotspot_temp_celsius != null && (
                    <span style={{ color: getTempColor(gpu.hotspot_temp_celsius) }}>
                      Hotspot: {gpu.hotspot_temp_celsius.toFixed(0)}°C
                    </span>
                  )}
                  {gpu?.power_watts != null && (
                    <span>
                      Power: {gpu.power_watts.toFixed(0)}W
                      {gpu.power_cap_watts != null ? ` / ${gpu.power_cap_watts.toFixed(0)}W` : ""}
                    </span>
                  )}
                  {gpu?.vram_used_percent != null && (
                    <span>VRAM: {gpu.vram_used_percent.toFixed(1)}%</span>
                  )}
                  {(gpu?.ecc_uncorrectable_total ?? 0) > 0 && (
                    <span style={{ color: "#f87171" }}>
                      ECC errors: {gpu.ecc_uncorrectable_total}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {powerSupplies.length > 0 && (
        <CollapsibleSection title="Power Supplies" icon={Zap} count={powerSupplies.length}>
          <div className={styles.componentGrid}>
            {powerSupplies.map((psu, index) => {
              const indicator = getHealthIndicator(psu?.health);
              const StatusIcon = indicator.icon;
              return (
                <div key={psu?.id ?? index} className={styles.componentItem}>
                  <div className={styles.componentHeader}>
                    <span className={styles.componentName}>
                      {safeString(psu?.name, `PSU ${index + 1}`)}
                    </span>
                    <StatusIcon size={14} style={{ color: indicator.color }} aria-hidden="true" />
                  </div>
                  <div className={styles.componentDetails}>
                    <span>{safeString(psu?.model)}</span>
                    <span>
                      {safeNumber(psu?.current_output_watts, 0)}W / {psu?.capacity_watts ?? 0}W
                    </span>
                    <span>
                      Input: {safeNumber(psu?.input_voltage, 1)}V |{" "}
                      {safeString(psu?.redundancy_status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

export default HardwareTab;
