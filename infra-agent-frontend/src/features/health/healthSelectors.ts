import type { HealthState } from "@/features/health/healthSlice";

interface HealthRootState {
  health: HealthState;
}

export const selectHealthStatus = (state: HealthRootState) => state.health.status;
export const selectHealthIsOnline = (state: HealthRootState) => state.health.isOnline;
export const selectHealthShouldBlink = (state: HealthRootState) => state.health.shouldBlink;
export const selectHealthTimestamp = (state: HealthRootState) => state.health.timestamp;
export const selectHealthVersion = (state: HealthRootState) => state.health.version;
export const selectHealthDatabase = (state: HealthRootState) => state.health.database;
