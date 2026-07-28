import { describe, expect, it } from "vitest";
import { getUserInitials, isAuth0AvatarUrl, shouldUseInitialsAvatar } from "./userInitials";

describe("getUserInitials", () => {
  it("uses first and last name letters", () => {
    expect(getUserInitials("Sagi Varma")).toBe("SV");
  });

  it("uses one letter for a single name", () => {
    expect(getUserInitials("Sagi")).toBe("S");
  });

  it("falls back to email", () => {
    expect(getUserInitials(undefined, "platform.admin@metrum.ai")).toBe("P");
  });

  it("returns U when name and email are missing", () => {
    expect(getUserInitials()).toBe("U");
  });
});

describe("isAuth0AvatarUrl", () => {
  it("detects cdn.auth0.com avatars", () => {
    expect(isAuth0AvatarUrl("https://cdn.auth0.com/avatars/co.png")).toBe(true);
  });

  it("detects proxied auth0 avatars", () => {
    expect(isAuth0AvatarUrl("/auth0-avatars/co.png")).toBe(true);
  });

  it("returns false for third-party avatars", () => {
    expect(isAuth0AvatarUrl("https://lh3.googleusercontent.com/a/abc")).toBe(false);
  });
});

describe("shouldUseInitialsAvatar", () => {
  it("is true without a picture", () => {
    expect(shouldUseInitialsAvatar(undefined)).toBe(true);
  });

  it("is true for auth0 default avatars", () => {
    expect(shouldUseInitialsAvatar("https://cdn.auth0.com/avatars/co.png")).toBe(true);
  });

  it("is false for real profile pictures", () => {
    expect(shouldUseInitialsAvatar("https://lh3.googleusercontent.com/a/abc")).toBe(false);
  });
});
