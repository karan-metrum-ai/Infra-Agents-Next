import { Fan, Thermometer, Zap } from "lucide-react";
import type { LiveDeviceDetailResponse } from "@/features/digitalTwin/digitalTwinApi.types";
import { EmptyState } from "../DeviceHealthShared";
import {
  getHealthIndicator,
  getTempColor,
  safeArray,
  safeNumber,
  safeString,
} from "../deviceHealthHelpers";
import styles from "../DeviceHealthPanel.module.css";

/** Temperature and cooling information. */
export function ThermalTab({ data }: { data: LiveDeviceDetailResponse }) {
  const thermal = data?.thermal;
  const fans = safeArray(data?.fans);
  const power = data?.power;
  const cpuTemps = safeArray(thermal?.cpu_temp_celsius);
  const gpuTemps = safeArray(thermal?.gpu_temp_celsius);

  return (
    <div className={styles.tabContent}>
      <div className={styles.thermalOverview}>
        <h4 className={styles.sectionTitle}>
          <Thermometer size={14} aria-hidden="true" />
          Temperature Readings
        </h4>
        {thermal ? (
          <>
            <div className={styles.tempGrid}>
              {thermal.inlet_temp_celsius != null && (
                <div className={styles.tempCard}>
                  <span className={styles.tempLabel}>Inlet</span>
                  <span
                    className={styles.tempValue}
                    style={{ color: getTempColor(thermal.inlet_temp_celsius) }}
                  >
                    {safeNumber(thermal.inlet_temp_celsius, 1)}C
                  </span>
                </div>
              )}
              {thermal.exhaust_temp_celsius != null && (
                <div className={styles.tempCard}>
                  <span className={styles.tempLabel}>Exhaust</span>
                  <span
                    className={styles.tempValue}
                    style={{ color: getTempColor(thermal.exhaust_temp_celsius) }}
                  >
                    {safeNumber(thermal.exhaust_temp_celsius, 1)}C
                  </span>
                </div>
              )}
              {thermal.ambient_temp_celsius != null && (
                <div className={styles.tempCard}>
                  <span className={styles.tempLabel}>Ambient</span>
                  <span
                    className={styles.tempValue}
                    style={{ color: getTempColor(thermal.ambient_temp_celsius) }}
                  >
                    {safeNumber(thermal.ambient_temp_celsius, 1)}C
                  </span>
                </div>
              )}
            </div>

            {cpuTemps.length > 0 && (
              <div className={styles.cpuTempSection}>
                <span className={styles.tempSectionLabel}>CPU Temperatures</span>
                <div className={styles.cpuTempList}>
                  {cpuTemps.map((temp, idx) => (
                    <div key={idx} className={styles.cpuTempItem}>
                      <span>CPU {idx + 1}</span>
                      <span style={{ color: getTempColor(temp) }}>{safeNumber(temp, 1)}C</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gpuTemps.length > 0 && (
              <div className={styles.cpuTempSection}>
                <span className={styles.tempSectionLabel}>GPU Temperatures</span>
                <div className={styles.cpuTempList}>
                  {gpuTemps.map((temp, idx) => (
                    <div key={idx} className={styles.cpuTempItem}>
                      <span>GPU {idx + 1}</span>
                      <span style={{ color: getTempColor(temp) }}>{safeNumber(temp, 1)}C</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState message="Temperature data not available" />
        )}
      </div>

      {(fans.length > 0 || thermal?.cooling_redundancy) && (
        <div className={styles.fanSection}>
          <h4 className={styles.sectionTitle}>
            <Fan size={14} aria-hidden="true" />
            Cooling System
          </h4>
          {thermal?.cooling_redundancy && (
            <div className={styles.fanRedundancy}>Redundancy: {thermal.cooling_redundancy}</div>
          )}
          {fans.length > 0 ? (
            <div className={styles.fanGrid}>
              {fans.map((fan, index) => {
                const indicator = getHealthIndicator(fan?.health);
                const StatusIcon = indicator.icon;
                const minRpm = fan?.min_rpm ?? 0;
                const maxRpm = fan?.max_rpm ?? 1;
                const currentRpm = fan?.current_rpm ?? 0;
                const rpmPercent =
                  maxRpm > minRpm ? ((currentRpm - minRpm) / (maxRpm - minRpm)) * 100 : 0;

                return (
                  <div key={fan?.id ?? index} className={styles.fanCard}>
                    <div className={styles.fanCardHeader}>
                      <span>{safeString(fan?.name, `Fan ${index + 1}`)}</span>
                      <StatusIcon size={12} style={{ color: indicator.color }} aria-hidden="true" />
                    </div>
                    <div className={styles.fanRpm}>{currentRpm.toLocaleString()} RPM</div>
                    <div className={styles.fanBar}>
                      <div
                        className={styles.fanBarFill}
                        style={{ width: `${Math.min(Math.max(rpmPercent, 0), 100)}%` }}
                      />
                    </div>
                    <div className={styles.fanPercent}>{fan?.speed_percent ?? 0}%</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="Fan information not available" />
          )}
        </div>
      )}

      {power &&
        ((power.current_watts ?? 0) > 0 || power.peak_watts != null || power.psu_redundancy) && (
          <div className={styles.powerSection}>
            <h4 className={styles.sectionTitle}>
              <Zap size={14} aria-hidden="true" />
              Power Metrics
            </h4>
            <div className={styles.powerGrid}>
              {(power.current_watts ?? 0) > 0 && (
                <div className={styles.powerCard}>
                  <span className={styles.powerLabel}>Current</span>
                  <span className={styles.powerValue}>{safeNumber(power.current_watts, 0)}W</span>
                </div>
              )}
              {power.peak_watts != null && (
                <div className={styles.powerCard}>
                  <span className={styles.powerLabel}>Peak</span>
                  <span className={styles.powerValue}>{safeNumber(power.peak_watts, 0)}W</span>
                </div>
              )}
              {power.psu_redundancy && (
                <div className={styles.powerCard}>
                  <span className={styles.powerLabel}>PSU Status</span>
                  <span className={styles.powerValue}>{power.psu_redundancy}</span>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

export default ThermalTab;
