import { expect, test } from "@playwright/test";

test.describe("cold player journey", () => {
  test("landing exposes a start affordance and an explainer", async ({ page }) => {
    await page.goto("/");

    const startCta = page.getByRole("button", { name: /start|begin|climb|enter|ascent/i }).first();
    await expect(startCta).toBeVisible({ timeout: 20_000 });

    const hero = page.locator("h1").first();
    await expect(hero).toBeVisible();
  });

  test("starting a realm mounts the play canvas and shows HUD", async ({ page }) => {
    await page.goto("/");

    const startCta = page.getByRole("button", { name: /start|begin|climb|enter|ascent/i }).first();
    await startCta.waitFor({ state: "visible", timeout: 20_000 });
    await startCta.click();

    const viewport = page.locator("[data-realm-extraction-state]");
    await expect(viewport).toBeAttached({ timeout: 20_000 });

    const state = await viewport.getAttribute("data-realm-extraction-state");
    expect(state, "realm state should be published to the viewport").not.toBeNull();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });
});
