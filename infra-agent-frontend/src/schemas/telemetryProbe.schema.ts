import { z } from "zod";

/** Per-stream telemetry liveness status (BMC or OS). */
export const telemetryProbeStatusSchema = z.enum(["flowing", "stale", "missing"]);
export type TelemetryProbeStatus = z.infer<typeof telemetryProbeStatusSchema>;

/** Liveness probe for a single telemetry stream. */
export const telemetryProbeSchema = z.object({
  status: telemetryProbeStatusSchema,
  last_seen_at: z.string().nullable(),
  source: z.string().nullable(),
  age_seconds: z.number().nullable(),
});
export type TelemetryProbe = z.infer<typeof telemetryProbeSchema>;

/** Separate BMC and OS telemetry liveness probes. */
export const deviceTelemetryProbesSchema = z.object({
  bmc: telemetryProbeSchema,
  os: telemetryProbeSchema,
});
export type DeviceTelemetryProbes = z.infer<typeof deviceTelemetryProbesSchema>;
