import { test } from "@playwright/test";

/**
 * Store screenshot capture harness (P8.4).
 *
 * Not part of the default Playwright run — only fires when the tag
 * @store is selected: `pnpm test:store-screenshots`. Captures the
 * landing, HUD in-play, and (if reachable) the collapsed screen at
 * both phone-portrait (1080x1920) and tablet-portrait (1536x2048)
 * sizes, writing PNGs into `test-screenshots/store/`.
 *
 * These images are suggested starting points for store listings —
 * the actual store-ready screenshots often need a designer pass on
 * top (overlay copy, device frame, brand mark) before submission.
 */

const SIZES = [
  { name: "phone", width: 1080, height: 1920 },
  { name: "tablet", width: 1536, height: 2048 },
];

for (const size of SIZES) {
  test.describe(`store screenshots @store · ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test(`landing · ${size.name}`, async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector("button", { state: "visible", timeout: 20_000 });
      // Let any boot-splash fade finish so the landing renders at full opacity.
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `test-screenshots/store/landing-${size.name}.png`,
        fullPage: false,
      });
    });

    test(`in-play HUD · ${size.name}`, async ({ page }) => {
      await page.goto("/");
      const startCta = page
        .getByRole("button", { name: /start|begin|climb|enter|ascent/i })
        .first();
      await startCta.waitFor({ state: "visible", timeout: 20_000 });
      await startCta.click();

      // Wait for the viewport's realm state to publish so the scene has
      // mounted and the HUD is populated before we capture.
      await page.waitForSelector("[data-realm-extraction-state]", { timeout: 20_000 });
      await page.waitForTimeout(1_500);

      await page.screenshot({
        path: `test-screenshots/store/hud-${size.name}.png`,
        fullPage: false,
      });
    });
  });
}
