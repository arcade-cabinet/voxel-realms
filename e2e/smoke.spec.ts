import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("landing renders and game canvas mounts", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/voxel realms/i);

    const root = page.locator("#root");
    await expect(root).toBeAttached();

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: 30_000 });

    const landing = page.getByTestId("start-screen");
    await expect(landing).toBeVisible({ timeout: 15_000 });
  });

  test("no console errors on first paint", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !/WebGL|three\.js|OES_texture_float|deprecationWarning|Failed to load resource/i.test(
            text
          )
        ) {
          errors.push(text);
        }
      }
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 30_000 });
    await page.waitForTimeout(1_000);

    expect(errors, `Console errors:\n${errors.join("\n")}`).toHaveLength(0);
  });
});
