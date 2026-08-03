"use client";

import Image from "next/image";
import { CenterNavPanel } from "@/components/CenterNavPanel/CenterNavPanel";
import { ProfileAvatar } from "@/components/ProfileAvatar/ProfileAvatar";
import { Separator } from "@/components/ui/Separator/Separator";
import styles from "./PageHeaderBar.module.css";

interface PageHeaderBarProps {
  title: string;
  rightContent?: React.ReactNode;
}

/** Dashboard-style global top header used by full-screen pages. */
export function PageHeaderBar({ title, rightContent }: PageHeaderBarProps) {
  return (
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
      </div>

      <div className={styles.rightPanel}>{rightContent ?? <ProfileAvatar position="inline" />}</div>
    </div>
  );
}

export default PageHeaderBar;
