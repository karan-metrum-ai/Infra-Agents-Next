import { describe, it, expect, beforeEach } from "vitest";
import {
  getAvatarSet,
  setAvatarSet,
  toggleAvatarSet,
  getAvatar,
  AVATAR_SET_1,
  AVATAR_SET_2,
} from "./avatars";

describe("avatars", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getAvatarSet defaults to 1", () => {
    expect(getAvatarSet()).toBe(1);
  });

  it("setAvatarSet persists preference", () => {
    setAvatarSet(2);
    expect(getAvatarSet()).toBe(2);
  });

  it("toggleAvatarSet flips 1 to 2", () => {
    expect(toggleAvatarSet()).toBe(2);
    expect(getAvatarSet()).toBe(2);
  });

  it("toggleAvatarSet flips 2 to 1", () => {
    setAvatarSet(2);
    expect(toggleAvatarSet()).toBe(1);
  });

  it("getAvatar returns set 1 path by default", () => {
    const path = getAvatar("Operations Manager");
    expect(path).toBe(AVATAR_SET_1["Operations Manager"]);
  });

  it("getAvatar returns set 2 path when forced", () => {
    const path = getAvatar("Operations Manager", 2);
    expect(path).toBe(AVATAR_SET_2["Operations Manager"]);
  });

  it("getAvatar returns undefined for unknown label", () => {
    expect(getAvatar("Nonexistent Agent")).toBeUndefined();
  });

  it("getAvatar returns undefined when label is undefined", () => {
    expect(getAvatar(undefined)).toBeUndefined();
  });

  it("getAvatar uses stored preference", () => {
    setAvatarSet(2);
    const path = getAvatar("Hardware Operations");
    expect(path).toBe(AVATAR_SET_2["Hardware Operations"]);
  });
});
