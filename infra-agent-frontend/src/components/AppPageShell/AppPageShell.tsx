"use client";

import Image from "next/image";
import { CenterNavPanel } from "@/components/CenterNavPanel/CenterNavPanel";
import { ProfileAvatar } from "@/components/ProfileAvatar/ProfileAvatar";
import { Separator } from "@/components/ui/Separator/Separator";
import styles from "./AppPageShell.module.css";

interface AppPageShellProps {
  title: string;
  /** Page-specific controls shown at the right end, before the profile avatar. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Shared authenticated page chrome with global nav + brand + page title. */
export function AppPageShell({ title, actions, children }: AppPageShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
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
          <Separator orientation="vertical" className={styles.separator} />
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.rightPanel}>
          {actions}
          <ProfileAvatar position="inline" />
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}

export default AppPageShell;
