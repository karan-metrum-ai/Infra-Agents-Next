"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Construction, Shield, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./PolicyLayout.module.css";
import type { PolicyLayoutProps } from "./PolicyLayout.types";

const POLICY_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy", icon: Shield },
  { href: "/terms-and-conditions", label: "Terms and Conditions", icon: ScrollText },
] as const;

export function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  const pathname = usePathname();

  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Page navigation">
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>
            <Image
              src="/metrum-logo-white.webp"
              alt="Metrum AI"
              width={112}
              height={28}
              className={styles.logoImg}
            />
          </Link>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.devBadge}>
            <Construction size={14} aria-hidden="true" />
            <span>Under Development</span>
          </div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>
            Last updated: {lastUpdated} &middot; Metrum AI &middot; Infra Agents Platform
          </p>
        </div>
      </header>

      <div className={styles.bodyWrap}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSticky}>
            <h2 className={styles.sidebarTitle}>Compliance Documents</h2>
            <nav className={styles.sidebarNav} aria-label="Compliance documents">
              {POLICY_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(styles.sidebarLink, active && styles.sidebarLinkActive)}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className={styles.sidebarIcon} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <article className={styles.article}>
          <div className={styles.body}>{children}</div>
        </article>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p>&copy; {new Date().getFullYear()} Metrum AI. All rights reserved.</p>
          <p className={styles.footerNote}>
            For questions about these policies, contact{" "}
            <a href="mailto:privacy@metrum.ai">privacy@metrum.ai</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PolicyLayout;
