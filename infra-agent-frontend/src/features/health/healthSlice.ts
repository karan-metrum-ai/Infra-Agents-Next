import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { healthApi } from "@/features/health/healthApi";

export type HealthStatus = "healthy" | "unhealthy" | "degraded" | "unknown" | "loading";

export interface HealthState {
  status: HealthStatus;
  database: "healthy" | "unhealthy" | "unknown";
  timestamp: string | null;
  version: string | null;
  isOnline: boolean;
  lastSuccessfulCheck: string | null;
  consecutiveFailures: number;
  /** UI state for the blinking status indicator. */
  shouldBlink: boolean;
  isPolling: boolean;
}

const initialState: HealthState = {
  status: "unknown",
  database: "unknown",
  timestamp: null,
  version: null,
  isOnline: false,
  lastSuccessfulCheck: null,
  consecutiveFailures: 0,
  shouldBlink: false,
  isPolling: false,
};

const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {
    setBlinking: (state, action: PayloadAction<boolean>) => {
      state.shouldBlink = action.payload;
    },
    setPolling: (state, action: PayloadAction<boolean>) => {
      state.isPolling = action.payload;
    },
    incrementFailures: (state) => {
      state.consecutiveFailures += 1;
      if (state.consecutiveFailures >= 2) {
        state.shouldBlink = true;
      }
    },
    resetFailures: (state) => {
      state.consecutiveFailures = 0;
      state.shouldBlink = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(healthApi.endpoints.getHealth.matchPending, (state) => {
        state.isPolling = true;
        if (state.status === "unknown") {
          state.status = "loading";
        }
      })
      .addMatcher(healthApi.endpoints.getHealth.matchFulfilled, (state, action) => {
        const { status, timestamp, database, version } = action.payload;

        state.status = status as HealthStatus;
        state.database = (database as HealthState["database"]) ?? "unknown";
        state.timestamp = timestamp;
        state.version = version ?? null;
        state.isOnline = true;
        state.lastSuccessfulCheck = new Date().toISOString();
        state.consecutiveFailures = 0;
        state.shouldBlink = status !== "healthy";
        state.isPolling = false;
      })
      .addMatcher(healthApi.endpoints.getHealth.matchRejected, (state) => {
        state.status = "unhealthy";
        state.isOnline = false;
        state.consecutiveFailures += 1;
        state.isPolling = false;
        state.shouldBlink = true;
      });
  },
});

export const { setBlinking, setPolling, incrementFailures, resetFailures } = healthSlice.actions;
export default healthSlice.reducer;
