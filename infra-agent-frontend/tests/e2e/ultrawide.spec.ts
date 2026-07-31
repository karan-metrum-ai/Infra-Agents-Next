/**
 * E2E: layout scales correctly on ultrawide / super-ultrawide monitors
 * without stretching, zooming, or distorting the existing design.
 *
 * Covers the 5 customer target resolutions:
 *   2560x1080 (21:9), 3440x1440 (21:9), 3840x1600 (24:10),
 *   5120x1440 (32:9), 7680x2160 (32:9)
 *
 * --container-max is none below 3440px (no large side gutters); numeric
 * caps apply from 3440px upward.
 *
 * The route-based checks below require an authenticated session --
 * `/dashboard/*`, `/workflows`, and `/digital-twin` redirect unauthenticated
 * visitors to the BFF-hosted login flow otherwise (`/auth-api/auth/login`,
 * cookie-session model per DESIGN.md §4 — not Auth0/Okta). Run with a valid
 * Playwright storageState/session for these to execute against the real
 * app. The token-wiring check further down runs against `/system-check`, a
 * public route, and needs no auth.
 *
 * Not covered here (left to manual QA, see the ultrawide plan doc):
 * split-view site drill-in, rack/site-room sub-views -- these require
 * live cluster data to reach and are fragile to automate against a
 * backend that may not be running in every environment.
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const VIEWPORTS = [
  { name: "2560x1080", width: 2560, height: 1080 },
  { name: "3440x1440", width: 3440, height: 1440 },
  { name: "3840x1600", width: 3840, height: 1600 },
  { name: "5120x1440", width: 5120, height: 1440 },
  { name: "7680x2160", width: 7680, height: 2160 },
];

const ROUTES = [
  { name: "dashboard-overview", path: "/dashboard/live" },
  { name: "dashboard-hardware", path: "/dashboard/live/hardware" },
  { name: "dashboard-teams", path: "/dashboard/live/teams" },
  { name: "dashboard-reports", path: "/dashboard/live/reports" },
  { name: "workflows", path: "/workflows" },
  { name: "digital-twin", path: "/digital-twin" },
];

for (const viewport of VIEWPORTS) {
  test.describe(`Ultrawide layout @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route.name}: no overflow, content capped, canvases undistorted`, async ({ page }) => {
        await page.goto(`${BASE_URL}${route.path}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(1500);

        // 1. No horizontal body scroll at any target resolution.
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          overflow.scrollWidth,
          `horizontal overflow: scrollWidth ${overflow.scrollWidth} > ` +
            `clientWidth ${overflow.clientWidth} @ ${viewport.name} ${route.path}`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);

        // 2. --container-max: none below 3440px (uncapped); numeric px
        // cap at 3440px+ must be under the viewport width.
        const containerMaxRaw = await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--container-max").trim(),
        );
        if (viewport.width < 3440) {
          expect(containerMaxRaw).toBe("none");
        } else {
          const containerMax = parseFloat(containerMaxRaw);
          expect(containerMax).toBeGreaterThan(0);
          expect(containerMax).toBeLessThan(viewport.width);
        }

        // 3. Any 3D canvas fills its container without distortion: CSS-box
        // aspect ratio should roughly match the backing-store aspect ratio
        // (a stretched/distorted canvas would diverge here).
        const canvases = page.locator("canvas");
        const canvasCount = await canvases.count();
        for (let i = 0; i < canvasCount; i++) {
          const canvas = canvases.nth(i);
          const box = await canvas.boundingBox();
          if (!box || box.width < 50 || box.height < 50) continue;

          const backing = await canvas.evaluate((el: HTMLCanvasElement) => ({
            width: el.width,
            height: el.height,
          }));
          if (!backing.width || !backing.height) continue;

          const cssAspect = box.width / box.height;
          const backingAspect = backing.width / backing.height;
          expect(
            Math.abs(cssAspect - backingAspect) / cssAspect,
            `canvas #${i} on ${route.path} @ ${viewport.name}: CSS aspect ` +
              `${cssAspect.toFixed(3)} vs backing-store aspect ` +
              `${backingAspect.toFixed(3)}`,
          ).toBeLessThan(0.05);
        }

        await page.screenshot({
          path: `test-results/ultrawide-${viewport.name}-${route.name}.png`,
        });
      });
    }
  });
}

// Globe-specific framing: canvas fills the globe container (full available
// viewport area), not a smaller centered square.
for (const viewport of VIEWPORTS) {
  test.describe(`Globe framing @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("globe canvas fills the available container", async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/live`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(2000);

      const globeRoot = page.locator(".dc-globe-root");
      if ((await globeRoot.count()) === 0) {
        test.skip(true, "globe did not mount (no live cluster/site data)");
        return;
      }
      const canvas = globeRoot.locator("canvas").first();
      const rootBox = await globeRoot.boundingBox();
      const box = await canvas.boundingBox();
      if (!box || !rootBox) {
        test.skip(true, "globe canvas has no layout box");
        return;
      }

      // Canvas should track the root container, not sit in a smaller box.
      expect(
        box.width,
        `globe canvas width ${box.width.toFixed(0)} should fill ` +
          `root ${rootBox.width.toFixed(0)} @ ${viewport.name}`,
      ).toBeGreaterThan(rootBox.width * 0.9);
      expect(
        box.height,
        `globe canvas height ${box.height.toFixed(0)} should fill ` +
          `root ${rootBox.height.toFixed(0)} @ ${viewport.name}`,
      ).toBeGreaterThan(rootBox.height * 0.9);
      expect(box.height).toBeLessThanOrEqual(viewport.height + 1);
    });
  });
}

// Token-ladder wiring check against /system-check -- a public route (no
// auth redirect), so this runs everywhere without a logged-in session.
// Confirms --container-max / --rail-w resolve at each target resolution,
// and that the app shell itself has no horizontal overflow.
const TOKEN_EXPECTATIONS: Array<{
  name: string;
  width: number;
  height: number;
  containerMax: number | "none";
  railW: number;
}> = [
  { name: "2560x1080", width: 2560, height: 1080, containerMax: "none", railW: 360 },
  { name: "3440x1440", width: 3440, height: 1440, containerMax: 2400, railW: 400 },
  { name: "3840x1600", width: 3840, height: 1600, containerMax: 2800, railW: 440 },
  { name: "5120x1440", width: 5120, height: 1440, containerMax: 3200, railW: 480 },
  { name: "7680x2160", width: 7680, height: 2160, containerMax: 3600, railW: 520 },
];

test.describe("Layout token ladder (public /system-check, no auth needed)", () => {
  for (const t of TOKEN_EXPECTATIONS) {
    test(`--container-max / --rail-w resolve correctly @ ${t.name}`, async ({ page }) => {
      await page.setViewportSize({ width: t.width, height: t.height });
      await page.goto(`${BASE_URL}/system-check`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForLoadState("networkidle").catch(() => {});

      const tokens = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return {
          containerMaxRaw: style.getPropertyValue("--container-max").trim(),
          railW: parseFloat(style.getPropertyValue("--rail-w").trim()),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });

      if (t.containerMax === "none") {
        expect(tokens.containerMaxRaw).toBe("none");
      } else {
        expect(parseFloat(tokens.containerMaxRaw)).toBe(t.containerMax);
      }
      expect(tokens.railW).toBe(t.railW);
      expect(tokens.scrollWidth).toBeLessThanOrEqual(tokens.clientWidth + 1);
    });
  }
});
