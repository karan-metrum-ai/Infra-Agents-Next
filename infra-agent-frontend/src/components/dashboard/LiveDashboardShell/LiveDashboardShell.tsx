"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrainCircuit, Boxes, Presentation, Radar } from "lucide-react";
import { ClusterTeamSelector } from "@/components/dashboard/ClusterTeamSelector/ClusterTeamSelector";
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
          <Image
            src="/metrum-logo-white.webp"
            alt="Metrum AI"
            width={110}
            height={28}
            className={styles.logo}
            priority
          />
          <h1 className={styles.title}>Dashboard</h1>
          <ClusterTeamSelector value={selectedClusterId} onClusterChange={handleClusterChange} />
        </div>

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
                title={disabled ? "Select a cluster with an active deployed team" : undefined}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}

export default LiveDashboardShell;
