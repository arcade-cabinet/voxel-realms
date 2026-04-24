import { test } from "@playwright/test";

/**
 * Trailer-loop capture (P8.5). Tagged `@trailer` so it never runs in
 * the default E2E matrix. Records a ~25-second WebM of a cold player
 * landing → entering a realm → watching the first realm mount and
 * the HUD populate. The WebM lands in `test-results/<project>/` and
 * can be cropped / re-encoded to MP4/GIF for the store listing.
 *
 * Invoke via `pnpm test:trailer`. Single-run (no retries, no
 * fullyParallel) so the output is deterministic.
 */

test.describe("voxel realms trailer capture @trailer", () => {
  test.use({
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
  });

  test("cold player → realm mount → HUD populated", async ({ page }) => {
    // 1. Landing (2.5 s — enough to read the hero copy)
    await page.goto("/");
    await page.waitForSelector("button", { state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2_500);

    // 2. Enter realm
    const startCta = page.getByRole("button", { name: /start|begin|climb|enter|ascent/i }).first();
    await startCta.click();

    // 3. Realm mounts (wait for the viewport to publish state)
    await page.waitForSelector("[data-realm-extraction-state]", { timeout: 20_000 });

    // 4. Hold on the HUD for ~10 s so the trailer has room to read the
    //    objective line, signal count, stability meter, and route
    //    guidance.
    await page.waitForTimeout(10_000);

    // 5. Dismiss the first-run coach if it's visible (one coach tap
    //    per step so viewers see the coach progress).
    for (let step = 0; step < 3; step++) {
      const nextBtn = page.getByRole("button", { name: /next|got it|ready|go|begin/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click().catch(() => undefined);
        await page.waitForTimeout(1_800);
      }
    }

    // 6. Final hold so the trailer ends on the populated HUD.
    await page.waitForTimeout(5_000);
  });
});
