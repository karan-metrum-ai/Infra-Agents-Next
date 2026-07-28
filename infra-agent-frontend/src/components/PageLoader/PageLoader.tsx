"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import styles from "./PageLoader.module.css";
import type { PageLoaderProps } from "./PageLoader.types";

interface RouteContext {
  label: string;
  sub: string;
}

const ROUTE_MAP: Array<{ match: string; ctx: RouteContext }> = [
  {
    match: "/sandbox/runs/",
    ctx: { label: "Sandbox Evaluation", sub: "Loading evaluation run..." },
  },
  {
    match: "/sandbox",
    ctx: { label: "Sandbox Evaluator", sub: "Preparing sandbox environment..." },
  },
  {
    match: "/dashboard/live/reports",
    ctx: { label: "Reporting", sub: "Loading report builder..." },
  },
  {
    match: "/dashboard/live/teams",
    ctx: { label: "Agentic Team", sub: "Connecting to agent workflows..." },
  },
  {
    match: "/dashboard/live/hardware",
    ctx: { label: "Physical Systems", sub: "Loading hardware telemetry..." },
  },
  {
    match: "/dashboard/live",
    ctx: { label: "Command Center", sub: "Connecting to live infrastructure..." },
  },
  { match: "/digital-twin", ctx: { label: "Digital Twin", sub: "Initialising 3D environment..." } },
  { match: "/topology", ctx: { label: "Topology View", sub: "Mapping network connections..." } },
  { match: "/workflows", ctx: { label: "Workflow Designer", sub: "Preparing agent workflows..." } },
  { match: "/onboarding", ctx: { label: "Onboarding", sub: "Setting up your workspace..." } },
];

const DEFAULT_CTX: RouteContext = { label: "Loading", sub: "Please wait..." };

function resolveContext(pathname: string): RouteContext {
  for (const entry of ROUTE_MAP) {
    if (pathname.startsWith(entry.match)) return entry.ctx;
  }
  return DEFAULT_CTX;
}

/** Full-screen branded loading screen shown by route-segment `loading.tsx` boundaries. */
export function PageLoader({ pathname: pathnameProp }: PageLoaderProps) {
  const pathname = usePathname();
  const { label, sub } = resolveContext(pathnameProp ?? pathname ?? "/");

  return (
    <output className={styles.overlay} aria-label={`Loading ${label}`}>
      <Image
        src="/metrum-logo-white.webp"
        alt="Metrum AI"
        width={140}
        height={40}
        className={styles.logo}
        priority
      />

      <div className={styles.ringWrapper} aria-hidden="true">
        <div className={styles.ringOuter} />
        <div className={styles.ringInner} />
      </div>

      <p className={styles.label}>{label}</p>
      <p className={styles.sub}>{sub}</p>

      <span className={styles.brand}>Metrum InfraAgents</span>
    </output>
  );
}

export default PageLoader;
