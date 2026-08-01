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

/** Shared top bar across the three /dashboard/live tabs: logo, cluster/team selector, tab nav. */
export function LiveDashboardShell({ children }: LiveDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasActiveTeam, setHasActiveTeam] = useState(false);

  const selectedClusterId = searchParams.get("cluster");

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
            width={110}
            height={28}
            className={styles.logo}
            priority
          />
          <Separator orientation="vertical" className={styles.separatorSm} />
          <h1 className={styles.title}>Dashboard</h1>
          <ClusterTeamSelector value={selectedClusterId} onClusterChange={handleClusterChange} />
        </div>

        <div className={styles.rightSection}>
          <nav className={styles.navPanel} aria-label="Live dashboard sections">
            {NAV_ITEMS.map(({ href, label, Icon, match, requiresTeam }) => {
              const active = match(pathname);
              const disabled = requiresTeam && !hasActiveTeam;
              return (
                <button
                  key={href}
                  type="button"
                  className={cn(styles.navButton, active && styles.navButtonActive)}
                  onClick={() => navigateTo(href)}
                  disabled={disabled}
                  aria-current={active ? "page" : undefined}
                  // Phase 16: the label `<span>` is hidden below 900px
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
          </nav>

          {/*
           * Enabled only on the "teams" tab, matching the Vite source's
           * `disabled={currentView !== 'teams'}`. `onPlanApprovalClick` is
           * left unset — no route here mounts a trace panel to scroll to
           * yet; wire it once `/dashboard/live/teams` gets a real chat/query
           * view (see the doc comment in ApprovalAlertBadge.tsx).
           */}
          <div className={styles.rightPanel}>
            <ApprovalAlertBadge disabled={!pathname.startsWith("/dashboard/live/teams")} />
            <ProfileAvatar position="inline" />
          </div>
        </div>
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}

export default LiveDashboardShell;
