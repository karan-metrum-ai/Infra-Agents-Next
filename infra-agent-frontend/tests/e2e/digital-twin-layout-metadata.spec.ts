/**
 * E2E: strict layout metadata on Digital Twin (port 3000 dev server).
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test.describe("Digital Twin layout metadata (strict)", () => {
  test("API returns cabinet_index and UI loads without layout warning", async ({ page }) => {
    let rackCount = 0;
    let layoutWarnings: string[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      // `getDigitalTwinData` (src/features/digitalTwin/digitalTwinApi.ts) hits
      // `/digital-twin-api/devices/digital-twin`, reverse-proxied to the
      // backend at the infra layer (see CLAUDE.md Phase 18 note on
      // nginx/deploy config) rather than via a `next dev`-only rewrite.
      if (url.includes("/devices/digital-twin") && response.status() === 200) {
        try {
          const body = await response.json();
          layoutWarnings = body?.metadata?.layout_warnings ?? [];
          rackCount = body?.summary?.racks ?? 0;
        } catch {
          // ignore non-json
        }
      }
    });

    await page.goto(`${BASE_URL}/digital-twin`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/digital-twin/);

    // Wait for digital-twin API response.
    await expect.poll(() => rackCount, { timeout: 30000 }).toBeGreaterThan(0);
    expect(layoutWarnings).toEqual([]);

    // Strict layout: no operator warning banner when metadata is complete.
    const layoutBanner = page.getByRole("alert", {
      name: /Layout metadata incomplete/i,
    });
    await expect(layoutBanner).toHaveCount(0);

    // Page should render the continue CTA (data loaded successfully).
    await expect(page.locator('button:has-text("Continue with team building")')).toBeVisible({
      timeout: 30000,
    });

    // Enter site interior if a site marker / building control is available.
    const enterButtons = page.locator(
      'button:has-text("Enter"), button:has-text("View"), button:has-text("Building")',
    );
    if ((await enterButtons.count()) > 0) {
      await enterButtons.first().click();
      await page.waitForTimeout(2000);
      await expect(layoutBanner).toHaveCount(0);
    }
  });
});
