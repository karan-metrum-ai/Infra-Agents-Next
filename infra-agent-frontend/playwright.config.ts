/**
 * Playwright configuration for the Next.js port of Infra Agents.
 *
 * Ported from the Vite app's `playwright.config.ts` — same shape, adapted
 * for `next dev`'s default port (3000, not Vite's 5173). `webServer` stays
 * commented out, matching the source: E2E specs assume a full stack (this
 * app + auth BFF + backend API) is already running at `BASE_URL`, which
 * `next dev` alone doesn't provide.
 *
 * QUICK START:
 *   npx playwright test                     # Run all tests (headless)
 *   npx playwright test --headed            # Run with browser visible
 *   npx playwright test --project=chromium  # Run only Chromium tests
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",

  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 1,

  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    headless: process.env.HEADLESS !== "false",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // Only Chromium by default — Firefox/WebKit need extra system deps on Linux.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  timeout: 60000,
  expect: { timeout: 10000 },

  // Uncomment to auto-start the dev server before tests (still requires the
  // auth BFF + backend API to be reachable for anything past /system-check):
  // webServer: {
  //   command: "pnpm dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});
