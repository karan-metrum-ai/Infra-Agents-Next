/** GreptimeDB metric row — schema varies per table, hence the index signature. */
export type MetricRecord = Record<string, unknown>;

export interface MetricsHealthCheck {
  status: "healthy" | "unhealthy" | "unavailable";
  service_available: boolean;
  greptimedb_url?: string;
  available_tables_count?: number;
  available_tables?: string[];
  error?: string;
}

export interface DeviceHealthMetrics {
  powerSupplyHealth: MetricRecord[];
  systemHealth: MetricRecord[];
  temperature: MetricRecord[];
  events: MetricRecord[];
  voltage: MetricRecord[];
  current: MetricRecord[];
  fan: MetricRecord[];
  memory: MetricRecord[];
  storage: MetricRecord[];
  processor: MetricRecord[];
}

export const COMMON_METRIC_TABLES = {
  POWER_SUPPLY_HEALTH: "power_supply_health",
  SYSTEM_HEALTH: "system_health",
  SENSORS_TEMPERATURE: "sensors_temperature",
  EVENTS_LOG_ENTRY: "events_log_entry",
  SENSORS_VOLTAGE: "sensors_voltage",
  SENSORS_CURRENT: "sensors_current",
  SENSORS_FAN: "sensors_fan",
  MEMORY_HEALTH: "memory_health",
  STORAGE_HEALTH: "storage_health",
  NETWORK_HEALTH: "network_health",
  PROCESSOR_HEALTH: "processor_health",
} as const;
