"use client";

import { ArrowLeft, AlertTriangle, Cpu, Loader2, MonitorCheck, Wifi } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  checkAssetLoad,
  checkNetwork,
  checkThreeJsRender,
  getBrowserInfo,
  getMemoryInfo,
  getScreenInfo,
  INFRA_AGENTS_MIN_REQUIREMENTS,
  probeWebGL,
  type CheckStatus,
} from "@/utils/systemCheck";
import styles from "./SystemCheck.module.css";
import type { Category, CheckRow } from "./SystemCheck.types";

const CATEGORIES: Category[] = [
  {
    id: "rendering",
    label: "Rendering",
    icon: Cpu,
    rowIds: ["webgl", "hwAccel", "gpuRenderer", "threejs"],
  },
  {
    id: "environment",
    label: "Environment",
    icon: MonitorCheck,
    rowIds: ["browser", "screen", "memory"],
  },
  { id: "connectivity", label: "Connectivity", icon: Wifi, rowIds: ["network", "asset"] },
];

const ROW_LABELS: Record<string, string> = {
  webgl: "WebGL support",
  hwAccel: "Hardware acceleration",
  gpuRenderer: "GPU renderer",
  threejs: "Three.js render init",
  browser: "Browser version",
  screen: "Screen resolution",
  memory: "Available memory",
  network: "Backend connectivity",
  asset: "Asset loading",
};

function initialRows(): CheckRow[] {
  return Object.entries(ROW_LABELS).map(([id, label]) => ({
    id,
    label,
    status: "checking",
    detail: "Checking…",
  }));
}

const STATUS_WORD: Record<CheckStatus, string> = {
  checking: "Checking",
  pass: "Pass",
  warn: "Warning",
  fail: "Fail",
  info: "Info",
};

const SUMMARY_TEXT: Record<CheckStatus, string> = {
  checking: "Running browser requirement checks…",
  pass: "Your browser meets all recommended requirements.",
  warn: "Your browser will work, but some improvements are recommended.",
  fail: "Your browser is missing requirements needed for the full experience.",
  info: "Checks complete.",
};

const STATUS_SUFFIX: Record<CheckStatus, string> = {
  checking: "Checking",
  pass: "Pass",
  warn: "Warn",
  fail: "Fail",
  info: "Info",
};

/**
 * Self-contained browser requirements check: WebGL1/WebGL2 support,
 * hardware acceleration, GPU renderer, browser/screen/memory info,
 * backend reachability, static asset loading, and a live Three.js
 * render smoke test.
 */
export function SystemCheck() {
  const [rows, setRows] = useState<CheckRow[]>(initialRows);
  const [runToken, setRunToken] = useState(0);

  const updateRow = useCallback((id: string, status: CheckStatus, detail: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status, detail } : row)));
  }, []);

  useEffect(() => {
    setRows(initialRows());

    const probe = probeWebGL();
    const webglStatus: CheckStatus = probe.webgl2 ? "pass" : probe.webgl1 ? "warn" : "fail";
    const webglDetail = probe.webgl2
      ? "WebGL2 supported — preferred for the digital twin renderer."
      : probe.webgl1
        ? "WebGL1 supported — works fine, but WebGL2 is preferred."
        : "WebGL is not supported. The digital twin view will not load.";
    updateRow("webgl", webglStatus, webglDetail);

    const hasAnyWebGL = probe.webgl1 || probe.webgl2;
    const hwStatus: CheckStatus = !hasAnyWebGL ? "fail" : probe.isSoftware ? "warn" : "pass";
    const hwDetail = !hasAnyWebGL
      ? "Cannot verify — no WebGL context available."
      : probe.isSoftware
        ? `Rendering in software (${probe.renderer || "unknown"}). Enable GPU acceleration for best performance.`
        : "GPU-accelerated rendering detected.";
    updateRow("hwAccel", hwStatus, hwDetail);

    updateRow(
      "gpuRenderer",
      probe.renderer ? "pass" : "info",
      probe.renderer
        ? `${probe.vendor ? `${probe.vendor} — ` : ""}${probe.renderer}`
        : "Hidden by this browser for privacy — not an error.",
    );

    const browser = getBrowserInfo();
    updateRow("browser", "pass", `${browser.name} ${browser.version}`.trim());

    const screen = getScreenInfo();
    const screenStatus: CheckStatus = screen.width >= 1024 ? "pass" : "warn";
    updateRow(
      "screen",
      screenStatus,
      `${screen.width}×${screen.height} @ ${screen.dpr}x DPR` +
        (screenStatus === "warn" ? " — 1024px+ width recommended" : ""),
    );

    const memory = getMemoryInfo();
    if (memory.deviceMemory == null) {
      updateRow(
        "memory",
        "info",
        "Not reported by this browser (Chrome/Edge only) — not required.",
      );
    } else {
      updateRow(
        "memory",
        memory.deviceMemory >= 4 ? "pass" : "warn",
        `${memory.deviceMemory} GB reported` +
          (memory.deviceMemory < 4 ? " — 4 GB+ recommended" : ""),
      );
    }

    checkNetwork().then((result) => {
      if (result.ok) {
        updateRow(
          "network",
          "pass",
          `Backend reachable — HTTP ${result.status}, ${result.latencyMs}ms.`,
        );
      } else if (result.status != null) {
        updateRow("network", "warn", `Backend responded with HTTP ${result.status}.`);
      } else {
        updateRow(
          "network",
          "fail",
          `Could not reach backend: ${result.error || "network error"}.`,
        );
      }
    });

    checkAssetLoad().then((result) => {
      if (result.ok) {
        updateRow("asset", "pass", `Static asset loaded in ${result.latencyMs}ms.`);
      } else {
        updateRow(
          "asset",
          "fail",
          `Failed to load test asset: ${result.error || "unknown error"}.`,
        );
      }
    });

    checkThreeJsRender().then((result) => {
      if (result.ok) {
        updateRow("threejs", "pass", `${result.rendererInfo} initialized and rendered a frame.`);
      } else {
        updateRow("threejs", "fail", `Three.js failed: ${result.error || "unknown error"}.`);
      }
    });
  }, [runToken, updateRow]);

  const overall: CheckStatus = rows.some((r) => r.status === "checking")
    ? "checking"
    : rows.some((r) => r.status === "fail")
      ? "fail"
      : rows.some((r) => r.status === "warn")
        ? "warn"
        : "pass";

  const passCount = rows.filter((r) => r.status === "pass").length;
  const hasFailures = rows.some((r) => r.status === "fail");
  const showRequirements = hasFailures && overall !== "checking";
  const rowById = new Map(rows.map((row) => [row.id, row]));

  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Page navigation">
        <div className={styles.navInner}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          <Link href="/" className={styles.navLogo} aria-label="Metrum AI home">
            <Image
              src="/metrum-logo-white.webp"
              alt=""
              className={styles.navLogoImg}
              width={110}
              height={28}
              draggable={false}
            />
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Browser Diagnostic</span>
          <h1 className={styles.title}>System Check</h1>
          <p className={styles.subtitle}>
            Verifies your browser meets the requirements for the Infra Agents dashboard and digital
            twin renderer. WebGL2 is preferred; WebGL1 works fine.
          </p>
        </header>

        <div className={styles.showcase}>
          <section
            className={cn(
              styles.meter,
              styles[`meter${STATUS_SUFFIX[overall]}` as keyof typeof styles],
            )}
            aria-label="Overall readiness"
          >
            <div className={styles.meterTop}>
              <div className={styles.meterCount}>
                <span className={styles.meterNumber}>{String(passCount).padStart(2, "0")}</span>
                <span className={styles.meterDivider}>/</span>
                <span className={styles.meterTotal}>{String(rows.length).padStart(2, "0")}</span>
              </div>
              <span className={styles.meterCaption}>checks passed</span>
            </div>
            <div className={styles.meterBar}>
              {rows.map((row) => (
                <span
                  key={row.id}
                  className={cn(
                    styles.meterSegment,
                    styles[`meterSegment${STATUS_SUFFIX[row.status]}` as keyof typeof styles],
                  )}
                  title={`${row.label}: ${STATUS_WORD[row.status]}`}
                />
              ))}
            </div>
            <p className={styles.meterStatus}>
              {overall === "checking" && (
                <Loader2 className={styles.meterStatusSpinner} aria-hidden="true" />
              )}
              {SUMMARY_TEXT[overall]}
            </p>
          </section>

          {showRequirements && (
            <section className={styles.requirements} aria-labelledby="min-requirements-title">
              <header className={styles.requirementsHeader}>
                <AlertTriangle className={styles.requirementsIcon} aria-hidden="true" />
                <div className={styles.requirementsHeading}>
                  <h2 id="min-requirements-title" className={styles.requirementsTitle}>
                    Minimum requirements to run Infra Agents
                  </h2>
                  <p className={styles.requirementsIntro}>
                    One or more checks failed. Work with your IT team to confirm the environment
                    below before using the dashboard and digital twin.
                  </p>
                </div>
              </header>
              <div className={styles.requirementsGrid}>
                {INFRA_AGENTS_MIN_REQUIREMENTS.map((group) => (
                  <div key={group.category} className={styles.requirementsGroup}>
                    <h3 className={styles.requirementsGroupTitle}>{group.category}</h3>
                    <ul className={styles.requirementsList}>
                      {group.items.map((item) => (
                        <li key={item} className={styles.requirementsItem}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className={styles.categories}>
            {CATEGORIES.map((category) => (
              <section className={styles.category} key={category.id}>
                <header className={styles.categoryHeader}>
                  <category.icon
                    className={cn(
                      styles.categoryIcon,
                      styles[
                        `categoryIcon${category.id.charAt(0).toUpperCase()}${category.id.slice(1)}` as keyof typeof styles
                      ],
                    )}
                    aria-hidden="true"
                  />
                  <span className={styles.categoryLabel}>{category.label}</span>
                </header>
                <div className={styles.categoryRows}>
                  {category.rowIds.map((id) => {
                    const row = rowById.get(id);
                    if (!row) return null;
                    return (
                      <div
                        key={row.id}
                        className={cn(
                          styles.row,
                          styles[`row${STATUS_SUFFIX[row.status]}` as keyof typeof styles],
                        )}
                      >
                        <div className={styles.rowTop}>
                          <span className={styles.rowLabel}>{row.label}</span>
                          <span
                            className={cn(
                              styles.rowStatus,
                              styles[
                                `rowStatus${STATUS_SUFFIX[row.status]}` as keyof typeof styles
                              ],
                            )}
                          >
                            {STATUS_WORD[row.status]}
                          </span>
                        </div>
                        <p className={styles.rowDetail}>{row.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.rerunActions}>
            <button
              type="button"
              className={styles.rerunButton}
              onClick={() => setRunToken((t) => t + 1)}
              aria-label="Re-run system checks"
            >
              <span>Re-run checks</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SystemCheck;
