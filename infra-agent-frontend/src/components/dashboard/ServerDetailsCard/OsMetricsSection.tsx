import { MonitorSmartphone } from "lucide-react";
import type { LiveDeviceOsMetrics } from "@/features/digitalTwin/digitalTwinApi.types";
import { MiniMeter } from "./MiniMeter";
import { formatBytesGib, formatBytesPerSec, formatUptimeSeconds } from "./serverDetailsFormatters";
import styles from "./ServerDetailsCard.module.css";

function levelColor(pct: number | null, warnAt: number, critAt: number): string {
  if (pct == null) return "var(--muted)";
  if (pct > critAt) return "var(--destructive)";
  if (pct > warnAt) return "var(--warning)";
  return "var(--success)";
}

export function OsMetricsSection({ os }: { os: LiveDeviceOsMetrics }) {
  const cpuPct = os.cpu_usage_percent ?? null;
  const memPct = os.mem_used_percent ?? null;
  const memUsed =
    os.mem_total_bytes != null && memPct != null ? os.mem_total_bytes * (memPct / 100) : null;
  const cpuColor = levelColor(cpuPct, 70, 90);
  const memColor = levelColor(memPct, 75, 90);

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>
        <MonitorSmartphone size={12} aria-hidden="true" />
        OS Metrics
      </h4>
      <div className={styles.osMetricsBody}>
        <div className={styles.osMetricRow}>
          <span className={styles.osMetricLabel}>CPU</span>
          <MiniMeter value={cpuPct} color={cpuColor} />
          <span className={styles.osMetricValueText} style={{ color: cpuColor }}>
            {cpuPct != null ? `${cpuPct.toFixed(1)}%` : "N/A"}
          </span>
        </div>

        <div className={styles.osMetricRow}>
          <span className={styles.osMetricLabel}>MEM</span>
          <MiniMeter value={memPct} color={memColor} />
          <span className={styles.osMetricValueText} style={{ color: memColor }}>
            {memPct != null ? `${memPct.toFixed(1)}%` : "N/A"}
          </span>
        </div>

        {memUsed != null && os.mem_total_bytes != null && (
          <div className={styles.osMetricSubline}>
            {formatBytesGib(memUsed)} / {formatBytesGib(os.mem_total_bytes)}
          </div>
        )}

        {(os.load1 != null || os.load5 != null || os.load15 != null) && (
          <div className={styles.osMetricLoadRow}>
            <span>Load: {os.load1?.toFixed(2) ?? "–"}</span>
            <span>{os.load5?.toFixed(2) ?? "–"}</span>
            <span>{os.load15?.toFixed(2) ?? "–"}</span>
          </div>
        )}

        {(os.network_rx_bytes_per_sec != null || os.network_tx_bytes_per_sec != null) && (
          <div className={styles.osMetricNetRow}>
            <span>↓ {formatBytesPerSec(os.network_rx_bytes_per_sec)}</span>
            <span>↑ {formatBytesPerSec(os.network_tx_bytes_per_sec)}</span>
          </div>
        )}

        {os.uptime_seconds != null && (
          <div className={styles.osMetricUptime}>Up: {formatUptimeSeconds(os.uptime_seconds)}</div>
        )}
      </div>
    </div>
  );
}

export default OsMetricsSection;
