/**
 * Playwright E2E Test: Digital Twin to Workflows Onboarding Flow
 *
 * Covers: Digital Twin -> Workflows -> Recommend Team -> team loads on
 * canvas -> (Save & Deploy, currently gated off - see note below).
 *
 * Ported from the Vite app's `tests/e2e/onboarding-digital-twin.spec.ts`.
 * The deploy/dashboard-navigation half of the original golden path is
 * adapted, not ported verbatim: `ActionButtonsPanel.tsx`'s Save & Deploy
 * (and every other action) button is currently rendered
 * `disabled={WORKFLOW_ACTIONS_UI_DISABLED || ...}` with
 * `WORKFLOW_ACTIONS_UI_DISABLED = true` (see CLAUDE.md Phase 14's note on
 * this flag) - a real, deliberate, already-shipped product state, not a
 * porting gap. Asserting the button is visible-but-disabled and skipping
 * the deploy-dependent steps keeps this suite honestly green against the
 * app's real current behavior; flip the assertion back to a real click
 * once that flag is lifted.
 *
 * Usage:
 *   npx playwright test tests/e2e/onboarding-digital-twin.spec.ts --project=chromium
 *   npx playwright test tests/e2e/onboarding-digital-twin.spec.ts --headed
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const DEFAULT_TIMEOUT = 30000;
const NAVIGATION_TIMEOUT = 15000;
const ANIMATION_WAIT = 1000;

test.describe("Digital Twin to Workflows Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(DEFAULT_TIMEOUT);
  });

  test("Complete flow: Digital Twin -> Workflows -> Recommend Team -> team on canvas -> deploy gated off", async ({
    page,
  }) => {
    await test.step("Navigate to Digital Twin page", async () => {
      await page.goto(`${BASE_URL}/digital-twin`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      await expect(page).toHaveURL(/digital-twin/);
      await page.waitForFunction(() => document.body.innerText.length > 100, {
        timeout: DEFAULT_TIMEOUT,
      });
    });

    await test.step("Click Continue to Team Building and navigate to Workflows", async () => {
      await page.waitForTimeout(ANIMATION_WAIT);

      const continueButton = page.locator('button:has-text("Continue with team building")');
      await expect(continueButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
      await continueButton.click();

      await page.waitForURL("**/workflows", { timeout: NAVIGATION_TIMEOUT });
      await expect(page).toHaveURL(/workflows/);

      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(ANIMATION_WAIT);
    });

    await test.step("Open Recommend Team modal", async () => {
      const recommendButton = page.locator('button:has-text("Recommend Team")');
      await expect(recommendButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
      await recommendButton.click();

      await page.waitForTimeout(500);

      const modalContent = page.locator("text=capabilities selected");
      await expect(modalContent).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    });

    await test.step("Generate the recommended team", async () => {
      await page.waitForTimeout(500);

      const showTeamButton = page.locator('button:has-text("Show Recommended Team")');
      await expect(showTeamButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
      await expect(showTeamButton).toBeEnabled();
      await showTeamButton.click();

      await page.waitForTimeout(1500);

      await expect(showTeamButton).not.toBeVisible({ timeout: 5000 });
    });

    await test.step("Verify team is loaded on the workflow canvas", async () => {
      await page.waitForTimeout(1000);

      const canvasNodes = page.locator('[class*="react-flow__node"]');
      await expect(canvasNodes.first()).toBeVisible({ timeout: DEFAULT_TIMEOUT });

      const nodeCount = await canvasNodes.count();
      expect(nodeCount).toBeGreaterThan(0);
    });

    await test.step("Save & Deploy is currently gated off (WORKFLOW_ACTIONS_UI_DISABLED)", async () => {
      const deployButton = page.locator('button:has-text("Save & Deploy")');
      await expect(deployButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
      await expect(deployButton).toBeDisabled();
    });
  });

  test("Smoke test: Digital Twin page loads and renders correctly", async ({ page }) => {
    await page.goto(`${BASE_URL}/digital-twin`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/digital-twin/);

    const continueButton = page.locator('button:has-text("Continue with team building")');
    await expect(continueButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(1000);
  });

  test("Smoke test: Workflows page loads with expected UI elements", async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(ANIMATION_WAIT);

    await expect(page).toHaveURL(/workflows/);

    const recommendButton = page.locator('button:has-text("Recommend Team")');
    await expect(recommendButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    // Present but disabled while WORKFLOW_ACTIONS_UI_DISABLED is true.
    const saveDeployButton = page.locator('button:has-text("Save & Deploy")');
    await expect(saveDeployButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
  });

  test("Recommend Team modal opens, closes via Cancel", async ({ page }) => {
    await page.goto(`${BASE_URL}/workflows`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(ANIMATION_WAIT);

    const recommendButton = page.locator('button:has-text("Recommend Team")');
    await expect(recommendButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });
    await recommendButton.click();
    await page.waitForTimeout(500);

    const modalContent = page.locator("text=capabilities selected");
    await expect(modalContent).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    const showTeamButton = page.locator('button:has-text("Show Recommended Team")');
    await expect(showTeamButton).toBeVisible({ timeout: DEFAULT_TIMEOUT });

    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible({ timeout: 5000 });

    await cancelButton.click();
    await page.waitForTimeout(500);

    await expect(showTeamButton).not.toBeVisible({ timeout: 5000 });
  });
});
