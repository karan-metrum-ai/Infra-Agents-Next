import type { LucideIcon } from "lucide-react";
import { Boxes, FlaskConical, LayoutDashboard, Rocket, ScanSearch, UsersRound } from "lucide-react";
import type { AppRole } from "@/features/auth/authSelectors";

export type AppNavGroup = "Setup" | "Explore" | "Build" | "Operate" | "Evaluate";

export interface AppNavItem {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
  group: AppNavGroup;
  allowedRoles: AppRole[];
  /** Path prefixes that count as active for this item (in addition to `path`). */
  activePrefixes?: string[];
}

const ALL_ROLES: AppRole[] = ["platform_admin", "infra_admin", "operator", "viewer"];
const ADMIN_ROLES: AppRole[] = ["platform_admin", "infra_admin"];

/** Primary destinations shown in the floating nav menu (and mirrored in Cmd+K). */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    id: "nav:onboarding",
    label: "Onboarding",
    description: "Import and discover infrastructure",
    path: "/onboarding",
    icon: Rocket,
    group: "Setup",
    allowedRoles: ["platform_admin"],
  },
  {
    id: "nav:digital-twin",
    label: "Digital Twin",
    description: "View sites, racks, and assets",
    path: "/digital-twin",
    icon: Boxes,
    group: "Explore",
    allowedRoles: ALL_ROLES,
  },
  {
    id: "nav:workflows",
    label: "Team Builder",
    description: "Compose and deploy agent teams",
    path: "/workflows",
    icon: UsersRound,
    group: "Build",
    allowedRoles: ADMIN_ROLES,
  },
  {
    id: "nav:dashboard",
    label: "Dashboard",
    description: "Live ops, teams, and reports",
    path: "/dashboard/live",
    icon: LayoutDashboard,
    group: "Operate",
    allowedRoles: ALL_ROLES,
    activePrefixes: ["/dashboard/live"],
  },
  {
    id: "nav:kyai",
    label: "Know Your AI",
    description: "Inspect and evaluate agent behavior",
    path: "/kyai",
    icon: ScanSearch,
    group: "Evaluate",
    allowedRoles: ADMIN_ROLES,
  },
  {
    id: "nav:sandbox-new",
    label: "Sandbox",
    description: "Run sandbox evaluations",
    path: "/sandbox/new",
    icon: FlaskConical,
    group: "Evaluate",
    allowedRoles: ADMIN_ROLES,
    activePrefixes: ["/sandbox"],
  },
] as const;

/** Display order for group headers in the floating menu. */
export const APP_NAV_GROUP_ORDER: readonly AppNavGroup[] = [
  "Setup",
  "Explore",
  "Build",
  "Operate",
  "Evaluate",
];

export function isAppNavItemActive(item: AppNavItem, pathname: string): boolean {
  if (
    item.activePrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return true;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function filterAppNavByRole(
  items: readonly AppNavItem[],
  role: AppRole | string,
  isOrgResolved: boolean,
): AppNavItem[] {
  if (!isOrgResolved) {
    return [...items];
  }
  return items.filter((item) => item.allowedRoles.includes(role as AppRole));
}

export interface AppNavGroupSection {
  group: AppNavGroup;
  items: AppNavItem[];
}

export function groupAppNavItems(items: readonly AppNavItem[]): AppNavGroupSection[] {
  return APP_NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0);
}

export function getAppNavItemById(id: string): AppNavItem {
  const item = APP_NAV_ITEMS.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`Unknown app nav item: ${id}`);
  }
  return item;
}
