import { Gauge } from "lucide-react";
import type { LiveDeviceGpuTelemetry } from "@/features/digitalTwin/digitalTwinApi.types";
import { DetailAccordion } from "./DetailAccordion";
import { MiniMeter } from "./MiniMeter";
import { getTempColor } from "./serverDetailsFormatters";
import styles from "./ServerDetailsCard.module.css";

export function GpuTelemetrySection({ gpus }: { gpus: LiveDeviceGpuTelemetry[] }) {
  if (gpus.length === 0) return null;

  return (
    <DetailAccordion title="GPU Telemetry" icon={Gauge} count={gpus.length}>
      <div className={styles.itemGrid}>
        {gpus.map((gpu) => {
          const util = gpu.utilization_percent ?? 0;
          const utilColor =
            util > 90 ? "var(--destructive)" : util > 70 ? "var(--warning)" : "var(--success)";

          return (
            <div key={gpu.gpu_index} className={styles.itemCard}>
              <div className={styles.itemCardHeader}>
                <span className={styles.itemCardTitle}>{gpu.model || `GPU ${gpu.gpu_index}`}</span>
              </div>
              <div className={styles.itemCardBody}>
                <div className={styles.gpuMeterRow}>
                  <span className={styles.gpuMeterLabel}>Util</span>
                  <MiniMeter value={gpu.utilization_percent} color={utilColor} />
                  <span style={{ color: utilColor }}>
                    {gpu.utilization_percent != null
                      ? `${gpu.utilization_percent.toFixed(0)}%`
                      : "N/A"}
                  </span>
                </div>
                {gpu.vram_used_percent != null && (
                  <div className={styles.gpuMeterRow}>
                    <span className={styles.gpuMeterLabel}>VRAM</span>
                    <MiniMeter value={gpu.vram_used_percent} color="var(--primary)" />
                    <span>{gpu.vram_used_percent.toFixed(0)}%</span>
                  </div>
                )}
                {gpu.hotspot_temp_celsius != null && (
                  <span style={{ color: getTempColor(gpu.hotspot_temp_celsius) }}>
                    Hotspot: {gpu.hotspot_temp_celsius.toFixed(0)}°C
                  </span>
                )}
                {gpu.power_watts != null && (
                  <span>
                    Power: {gpu.power_watts.toFixed(0)}W
                    {gpu.power_cap_watts != null ? ` / ${gpu.power_cap_watts.toFixed(0)}W` : ""}
                  </span>
                )}
                {gpu.ecc_uncorrectable_total != null && gpu.ecc_uncorrectable_total > 0 && (
                  <span style={{ color: "var(--destructive)" }}>
                    ECC: {gpu.ecc_uncorrectable_total}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DetailAccordion>
  );
}

export default GpuTelemetrySection;
