import type { DeviceTelemetryProbes } from "@/schemas/telemetryProbe.schema";

export interface TelemetryProbesRowProps {
  probes: DeviceTelemetryProbes;
  className?: string;
}
