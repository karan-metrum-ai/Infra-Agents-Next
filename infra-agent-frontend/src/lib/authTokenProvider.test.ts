import { describe, it, expect, beforeEach } from "vitest";
import { registerIdentity, getIdentity, clearTokenGetter } from "./authTokenProvider";

/**
 * Ported from the Vite app's `lib/authTokenProvider.test.ts`. The source
 * module also covered `getAccessToken`/`registerTokenGetter` -- both
 * explicitly documented there as "kept for backward compat" no-ops with
 * zero real callers even in the Vite app. This app's port of the module
 * already dropped both (confirmed zero consumers anywhere in `src/`), so
 * their tests are dropped here too rather than re-adding dead API surface
 * just to keep a test passing.
 */
describe("authTokenProvider", () => {
  beforeEach(() => {
    clearTokenGetter();
  });

  it("getIdentity returns null by default", () => {
    expect(getIdentity()).toBeNull();
  });

  it("registerIdentity stores identity", () => {
    registerIdentity({ userId: "user-1", role: "admin", tenantId: "tenant-1" });
    const identity = getIdentity();
    expect(identity?.userId).toBe("user-1");
    expect(identity?.role).toBe("admin");
    expect(identity?.tenantId).toBe("tenant-1");
  });

  it("clearTokenGetter resets identity to null", () => {
    registerIdentity({ userId: "u", role: "r", tenantId: "t" });
    clearTokenGetter();
    expect(getIdentity()).toBeNull();
  });
});
