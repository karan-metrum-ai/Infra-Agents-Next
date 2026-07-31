import { describe, it, expect } from "vitest";
import { healthApi } from "@/features/health/healthApi";
import healthReducer, {
  setBlinking,
  setPolling,
  incrementFailures,
  resetFailures,
} from "./healthSlice";
import {
  selectHealthStatus,
  selectHealthIsOnline,
  selectHealthShouldBlink,
  selectHealthTimestamp,
  selectHealthVersion,
  selectHealthDatabase,
} from "./healthSelectors";
import type { HealthResponse } from "./healthApi";
import type { HealthState } from "./healthSlice";

// ── Helpers ────────────────────────────────────────────────

const INITIAL_STATE: HealthState = {
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

/**
 * Ported from the Vite app's `store/slices/healthSlice.test.ts`, which
 * exercised the `getHealth` RTK Query lifecycle by dispatching a real
 * `initiate()` thunk against an `msw`-mocked `GET /api/health`. That
 * doesn't translate here: `createBaseQuery`'s baseUrl ("/api") is relative
 * -- correct for a real browser (resolves against the page origin) -- but
 * Node's native `fetch`, which both Vitest's jsdom environment and `msw`'s
 * Node interceptor sit on top of, cannot construct a `Request` from a
 * relative URL at all, and no combination of `vi.stubGlobal`/`msw`
 * fetch-wrapping in this environment gets a real request to actually reach
 * a mock handler (confirmed by direct investigation, not assumed).
 *
 * Instead of fighting the transport layer, these tests dispatch
 * hand-built actions matching the exact shape RTK Query's own
 * `matchPending`/`matchFulfilled`/`matchRejected` matchers check for
 * (`action.type` against the `executeQuery` thunk's lifecycle suffix,
 * `action.meta.arg.endpointName === "getHealth"` -- see
 * `matchesEndpoint`/`buildMatchThunkActions` in
 * `@reduxjs/toolkit`'s `query/rtk-query` source). This tests exactly what
 * `healthSlice`'s `extraReducers` care about with no network layer
 * involved at all -- arguably tighter than the original, which coupled a
 * pure reducer test to a real (mocked) HTTP round-trip.
 */
const ENDPOINT_NAME = "getHealth";
const THUNK_TYPE = `${healthApi.reducerPath}/executeQuery`;

function pendingAction() {
  return {
    type: `${THUNK_TYPE}/pending`,
    meta: { requestStatus: "pending" as const, arg: { endpointName: ENDPOINT_NAME } },
  };
}

function fulfilledAction(payload: HealthResponse) {
  return {
    type: `${THUNK_TYPE}/fulfilled`,
    payload,
    meta: { requestStatus: "fulfilled" as const, arg: { endpointName: ENDPOINT_NAME } },
  };
}

function rejectedAction() {
  return {
    type: `${THUNK_TYPE}/rejected`,
    meta: { requestStatus: "rejected" as const, arg: { endpointName: ENDPOINT_NAME } },
  };
}

// ── Reducer unit tests ─────────────────────────────────────

describe("healthSlice reducers", () => {
  it("returns initial state on undefined action", () => {
    const state = healthReducer(undefined, { type: "unknown" });
    expect(state).toEqual(INITIAL_STATE);
  });

  it("sets shouldBlink via setBlinking(true)", () => {
    const state = healthReducer(INITIAL_STATE, setBlinking(true));
    expect(state.shouldBlink).toBe(true);
  });

  it("clears shouldBlink via setBlinking(false)", () => {
    const state = healthReducer({ ...INITIAL_STATE, shouldBlink: true }, setBlinking(false));
    expect(state.shouldBlink).toBe(false);
  });

  it("sets isPolling via setPolling", () => {
    const state = healthReducer(INITIAL_STATE, setPolling(true));
    expect(state.isPolling).toBe(true);
  });

  it("increments consecutiveFailures", () => {
    let state = healthReducer(INITIAL_STATE, incrementFailures());
    expect(state.consecutiveFailures).toBe(1);
    expect(state.shouldBlink).toBe(false);

    state = healthReducer(state, incrementFailures());
    expect(state.consecutiveFailures).toBe(2);
    expect(state.shouldBlink).toBe(true);
  });

  it("starts blinking after exactly 2 failures", () => {
    let state = INITIAL_STATE;
    state = healthReducer(state, incrementFailures());
    expect(state.shouldBlink).toBe(false);
    state = healthReducer(state, incrementFailures());
    expect(state.shouldBlink).toBe(true);
  });

  it("resets failures and blinking via resetFailures", () => {
    const dirty: HealthState = { ...INITIAL_STATE, consecutiveFailures: 5, shouldBlink: true };
    const state = healthReducer(dirty, resetFailures());
    expect(state.consecutiveFailures).toBe(0);
    expect(state.shouldBlink).toBe(false);
  });
});

// ── Selectors ──────────────────────────────────────────────

describe("healthSlice selectors", () => {
  const sampleState = {
    health: {
      ...INITIAL_STATE,
      status: "degraded" as const,
      isOnline: true,
      shouldBlink: true,
      timestamp: "2026-04-13T00:00:00Z",
      version: "1.2.3",
      database: "healthy" as const,
    },
  };

  it("selectHealthStatus", () => {
    expect(selectHealthStatus(sampleState)).toBe("degraded");
  });

  it("selectHealthIsOnline", () => {
    expect(selectHealthIsOnline(sampleState)).toBe(true);
  });

  it("selectHealthShouldBlink", () => {
    expect(selectHealthShouldBlink(sampleState)).toBe(true);
  });

  it("selectHealthTimestamp", () => {
    expect(selectHealthTimestamp(sampleState)).toBe("2026-04-13T00:00:00Z");
  });

  it("selectHealthVersion", () => {
    expect(selectHealthVersion(sampleState)).toBe("1.2.3");
  });

  it("selectHealthDatabase", () => {
    expect(selectHealthDatabase(sampleState)).toBe("healthy");
  });
});

// ── extraReducers (RTK Query lifecycle integration) ────────

describe("healthSlice extraReducers", () => {
  it("transitions to loading on getHealth pending", () => {
    const state = healthReducer(INITIAL_STATE, pendingAction());
    expect(state.status).toBe("loading");
    expect(state.isPolling).toBe(true);
  });

  it("sets healthy state on successful response", () => {
    const state = healthReducer(
      INITIAL_STATE,
      fulfilledAction({
        status: "healthy",
        kubernetes: "ok",
        templates: 5,
        timestamp: "2026-04-13T00:00:00Z",
      }),
    );

    expect(state.status).toBe("healthy");
    expect(state.isOnline).toBe(true);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.shouldBlink).toBe(false);
    expect(state.isPolling).toBe(false);
    expect(state.timestamp).toBe("2026-04-13T00:00:00Z");
  });

  it("sets blink true on degraded response", () => {
    const state = healthReducer(
      INITIAL_STATE,
      fulfilledAction({
        status: "degraded",
        kubernetes: "ok",
        templates: 3,
        timestamp: "2026-04-13T00:00:00Z",
      }),
    );

    expect(state.status).toBe("degraded");
    expect(state.shouldBlink).toBe(true);
    expect(state.isOnline).toBe(true);
  });

  it("sets unhealthy and increments failures on API error", () => {
    const state = healthReducer(INITIAL_STATE, rejectedAction());

    expect(state.status).toBe("unhealthy");
    expect(state.isOnline).toBe(false);
    expect(state.consecutiveFailures).toBe(1);
    expect(state.shouldBlink).toBe(true);
    expect(state.isPolling).toBe(false);
  });

  it("does not overwrite loading if already has a status", () => {
    const state = healthReducer({ ...INITIAL_STATE, status: "healthy" }, pendingAction());
    expect(state.status).toBe("healthy");
  });
});
