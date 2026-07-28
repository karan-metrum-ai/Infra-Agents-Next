"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./MobileBlocker.module.css";

const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Full-screen hard-gate shown on viewports narrower than 768px.
 *
 * The InfraAgent dashboards rely on multi-column layouts, side rails, and 3D
 * canvases that are not designed to collapse below tablet width, so rather
 * than ship a degraded mobile experience, this asks the user to switch to a
 * larger device. Re-evaluates on resize/rotation via matchMedia.
 */
export function MobileBlocker() {
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsBlocked(event.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!isBlocked) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const blockerEl = dialogRef.current;
    const inertTargets: Element[] = [];

    Array.from(document.body.children).forEach((child) => {
      if (child === blockerEl || child.contains(blockerEl)) return;
      inertTargets.push(child);
      child.setAttribute("inert", "");
      child.setAttribute("aria-hidden", "true");
    });

    blockerEl?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      inertTargets.forEach((el) => {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      });
    };
  }, [isBlocked]);

  if (!isBlocked) return null;

  return (
    <div
      ref={dialogRef}
      className={styles.blocker}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-blocker-title"
      aria-describedby="mobile-blocker-body"
      tabIndex={-1}
    >
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Image
            src="/metrum-logo-white.webp"
            alt="Metrum AI"
            className={styles.logo}
            width={140}
            height={40}
            priority
          />
        </div>

        <div className={styles.iconRing} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.icon}
          >
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M2 20h20" />
            <path d="M10 20l1-4h2l1 4" />
          </svg>
        </div>

        <h1 id="mobile-blocker-title" className={styles.title}>
          Larger screen required
        </h1>

        <p id="mobile-blocker-body" className={styles.body}>
          InfraAgent is built for tablets, laptops, and desktops. Please open this site on a device
          with at least <strong>768px</strong> of screen width for the best experience.
        </p>

        <ul className={styles.deviceList} aria-label="Supported devices">
          <li className={styles.deviceItem}>
            <span className={styles.deviceLabel}>Tablet</span>
            <span className={styles.deviceMeta}>iPad and similar</span>
          </li>
          <li className={styles.deviceItem}>
            <span className={styles.deviceLabel}>Laptop</span>
            <span className={styles.deviceMeta}>13-inch and up</span>
          </li>
          <li className={styles.deviceItem}>
            <span className={styles.deviceLabel}>Desktop</span>
            <span className={styles.deviceMeta}>FHD and above</span>
          </li>
        </ul>

        <p className={styles.hint}>On a phone? Try rotating to landscape or switching devices.</p>
      </div>
    </div>
  );
}

export default MobileBlocker;
