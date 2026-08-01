import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, filterAppNavByRole, groupAppNavItems, isAppNavItemActive } from "./appNav";

describe("appNav role filtering", () => {
  it("shows all items before org role is resolved", () => {
    const visible = filterAppNavByRole(APP_NAV_ITEMS, "viewer", false);
    expect(visible).toHaveLength(APP_NAV_ITEMS.length);
  });

  it("shows every group for platform_admin", () => {
    const visible = filterAppNavByRole(APP_NAV_ITEMS, "platform_admin", true);
    const groups = groupAppNavItems(visible).map((section) => section.group);
    expect(groups).toEqual(["Setup", "Explore", "Build", "Operate", "Evaluate"]);
    expect(visible.map((item) => item.label)).toEqual([
      "Onboarding",
      "Digital Twin",
      "Team Builder",
      "Dashboard",
      "Know Your AI",
      "Sandbox",
    ]);
  });

  it("hides Onboarding for infra_admin but keeps evaluate tools", () => {
    const visible = filterAppNavByRole(APP_NAV_ITEMS, "infra_admin", true);
    const labels = visible.map((item) => item.label);
    expect(labels).toEqual([
      "Digital Twin",
      "Team Builder",
      "Dashboard",
      "Know Your AI",
      "Sandbox",
    ]);
    expect(groupAppNavItems(visible).map((section) => section.group)).toEqual([
      "Explore",
      "Build",
      "Operate",
      "Evaluate",
    ]);
  });

  it("limits operator and viewer to Digital Twin and Dashboard", () => {
    for (const role of ["operator", "viewer"] as const) {
      const labels = filterAppNavByRole(APP_NAV_ITEMS, role, true).map((item) => item.label);
      expect(labels).toEqual(["Digital Twin", "Dashboard"]);
    }
  });
});

describe("appNav active matching", () => {
  const byId = Object.fromEntries(APP_NAV_ITEMS.map((item) => [item.id, item]));

  it("marks dashboard sub-routes active", () => {
    expect(isAppNavItemActive(byId["nav:dashboard"], "/dashboard/live")).toBe(true);
    expect(isAppNavItemActive(byId["nav:dashboard"], "/dashboard/live/hardware")).toBe(true);
    expect(isAppNavItemActive(byId["nav:dashboard"], "/workflows")).toBe(false);
  });

  it("marks sandbox run routes active under Sandbox", () => {
    expect(isAppNavItemActive(byId["nav:sandbox-new"], "/sandbox/new")).toBe(true);
    expect(isAppNavItemActive(byId["nav:sandbox-new"], "/sandbox/runs/abc")).toBe(true);
  });
});
