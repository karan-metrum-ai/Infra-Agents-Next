"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/authApi";
import {
  selectIsAuthenticated,
  selectIsOrgResolved,
  selectUserRole,
} from "@/features/auth/authSelectors";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useRegisterCommand } from "@/hooks/useCommandRegistry";

function useNavCommand(id: string, label: string, path: string, allowedRoles: string[]) {
  const router = useRouter();
  const userRole = useAppSelector(selectUserRole);
  const isOrgResolved = useAppSelector(selectIsOrgResolved);

  useRegisterCommand({
    id,
    label: `Go to ${label}`,
    description: path,
    group: "Navigation",
    keywords: [path],
    disabled: isOrgResolved && !allowedRoles.includes(userRole),
    perform: () => router.push(path),
  });
}

/**
 * Registers app-wide navigation and account commands, mounted once in the
 * root layout. Per-page action commands (Save, Generate, Undo, view-mode
 * toggles, etc.) are registered locally by each page's own orchestrator via
 * `useRegisterCommand` instead of listed here -- this component only owns
 * the destinations/actions that make sense from anywhere in the app.
 *
 * One `useNavCommand`/`useRegisterCommand` call per static route rather
 * than a `.map()` over a route array: the number of hook calls must stay
 * constant across renders (Rules of Hooks), and unrolling makes that
 * invariant obvious at a glance instead of relying on a route list's
 * length never changing.
 *
 * Route list mirrors `CenterNavPanel.tsx`'s `allowedRoles` for the 3 routes
 * it already covers, extended to every other real page in the app.
 * Legal pages and dynamic detail routes (`/sandbox/runs/[id]`,
 * `/kyai/sessions/[id]`) are intentionally not registered here -- they're
 * either low-value command-search targets or need a specific id to be
 * useful, not a context-free "go to" destination.
 */
export function GlobalCommands() {
  const router = useRouter();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useNavCommand("nav:onboarding", "Onboarding", "/onboarding", ["platform_admin"]);
  useNavCommand("nav:workflows", "Team Building", "/workflows", ["platform_admin", "infra_admin"]);
  useNavCommand("nav:sandbox-new", "New Sandbox Run", "/sandbox/new", [
    "platform_admin",
    "infra_admin",
  ]);
  useNavCommand("nav:kyai", "KyAI Playground", "/kyai", ["platform_admin", "infra_admin"]);
  useNavCommand("nav:digital-twin", "Digital Twin", "/digital-twin", [
    "platform_admin",
    "infra_admin",
    "operator",
    "viewer",
  ]);
  useNavCommand("nav:dashboard", "Dashboard — Command Center", "/dashboard/live", [
    "platform_admin",
    "infra_admin",
    "operator",
    "viewer",
  ]);
  useNavCommand(
    "nav:dashboard-hardware",
    "Dashboard — Physical Systems",
    "/dashboard/live/hardware",
    ["platform_admin", "infra_admin", "operator", "viewer"],
  );
  useNavCommand("nav:dashboard-teams", "Dashboard — Agentic Team", "/dashboard/live/teams", [
    "platform_admin",
    "infra_admin",
    "operator",
    "viewer",
  ]);
  useNavCommand("nav:dashboard-reports", "Dashboard — Reporting", "/dashboard/live/reports", [
    "platform_admin",
    "infra_admin",
    "operator",
    "viewer",
  ]);

  useRegisterCommand({
    id: "account:sign-out",
    label: "Sign out",
    group: "Account",
    disabled: !isAuthenticated,
    perform: logout,
  });

  useRegisterCommand({
    id: "nav:home",
    label: "Go to Home",
    description: "/",
    group: "Navigation",
    perform: () => router.push("/"),
  });

  return null;
}

export default GlobalCommands;
