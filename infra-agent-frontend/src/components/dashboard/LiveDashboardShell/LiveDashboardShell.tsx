"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrainCircuit, Boxes, Presentation, Radar } from "lucide-react";
import { ApprovalAlertBadge } from "@/components/ApprovalAlertBadge/ApprovalAlertBadge";
import { CenterNavPanel } from "@/components/CenterNavPanel/CenterNavPanel";
import { ClusterTeamSelector } from "@/components/dashboard/ClusterTeamSelector/ClusterTeamSelector";
import { ProfileAvatar } from "@/components/ProfileAvatar/ProfileAvatar";
import { Separator } from "@/components/ui/Separator/Separator";
import { NavHoverEffect } from "@/components/ui/NavHoverEffect/NavHoverEffect";
import { cn } from "@/lib/utils";
import styles from "./LiveDashboardShell.module.css";
import type { LiveDashboardShellProps } from "./LiveDashboardShell.types";

const NAV_ITEMS = [
  {
    href: "/dashboard/live",
    label: "Command Center",
    Icon: Radar,
    match: (p: string) => p === "/dashboard/live",
  },
  {
    href: "/dashboard/live/hardware",
    label: "Physical Systems",
    Icon: Boxes,
    match: (p: string) => p.startsWith("/dashboard/live/hardware"),
  },
  {
    href: "/dashboard/live/teams",
    label: "Agentic Team",
    Icon: BrainCircuit,
    match: (p: string) => p.startsWith("/dashboard/live/teams"),
    requiresTeam: true,
  },
  {
    href: "/dashboard/live/reports",
    label: "Reporting",
    Icon: Presentation,
    match: (p: string) => p.startsWith("/dashboard/live/reports"),
  },
];

/**
 * Shared top bar — Vite LiveDashboard parity for /dashboard/live/*, and
 * reused verbatim (via `title`) as the universal app shell for
 * /digital-twin and /workflows so every top-level page shares the same
 * nav, notifications, and profile menu.
 */
export function LiveDashboardShell({ children, title = "Dashboard" }: LiveDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasActiveTeam, setHasActiveTeam] = useState(false);

  const selectedClusterId = searchParams.get("cluster");
  const activeIndex = NAV_ITEMS.findIndex(({ match }) => match(pathname));

  const handleClusterChange = useCallback(
    (clusterId: string, active: boolean) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("cluster", clusterId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      setHasActiveTeam(active);
    },
    [searchParams, pathname, router],
  );

  const navigateTo = useCallback(
    (href: string) => {
      const query = selectedClusterId ? `?cluster=${encodeURIComponent(selectedClusterId)}` : "";
      router.push(`${href}${query}`);
    },
    [router, selectedClusterId],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <div className={styles.logoPanel}>
          <CenterNavPanel />
          <Image
            src="/metrum-logo-white.webp"
            alt="Metrum AI"
            width={140}
            height={40}
            className={styles.logo}
            priority
          />
          <Image
            src="/android-chrome-512x512.png"
            alt="Metrum AI"
            width={28}
            height={28}
            className={styles.logoIcon}
          />
          <Separator orientation="vertical" className={styles.separatorSm} />
          <h1 className={styles.title}>{title}</h1>
          <Separator orientation="vertical" className={styles.separatorMd} />
          <ClusterTeamSelector value={selectedClusterId} onClusterChange={handleClusterChange} />
        </div>

        <nav className={styles.navPanel} aria-label="Live dashboard sections">
          <NavHoverEffect activeIndex={activeIndex}>
            {NAV_ITEMS.map(({ href, label, Icon, match, requiresTeam }) => {
              const active = match(pathname);
              const disabled = requiresTeam && !hasActiveTeam;
              return (
                <button
                  key={href}
                  type="button"
                  className={cn(styles.navButton, active && styles.active)}
                  onClick={() => navigateTo(href)}
                  disabled={disabled}
                  aria-current={active ? "page" : undefined}
                  // Phase 16: the label `<span>` is hidden below 1024px
                  // (`.navButton span { display: none }`), which would
                  // otherwise strip these buttons of any accessible name for
                  // screen reader users at that viewport width.
                  aria-label={label}
                  title={disabled ? "Select a cluster with an active deployed team" : undefined}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </NavHoverEffect>

          <Separator orientation="vertical" className={styles.separatorSm} />

          {/*
           * Enabled only on the "teams" tab, matching the Vite source's
           * `disabled={currentView !== 'teams'}`. `onPlanApprovalClick` is
           * left unset — no route here mounts a trace panel to scroll to
           * yet; wire it once `/dashboard/live/teams` gets a real chat/query
           * view (see the doc comment in ApprovalAlertBadge.tsx).
           */}
          <ApprovalAlertBadge disabled={!pathname.startsWith("/dashboard/live/teams")} />
          <Separator orientation="vertical" className={styles.separatorSm} />
          <ProfileAvatar position="inline" />
        </nav>
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}

export default LiveDashboardShell;
