import { expect, type Page, test } from "@playwright/test";

// @prod-surface — exercises the built dist the way users hit Pages.
// Run via `pnpm test:e2e:prod-surface`, which builds with
// VITE_BASE_PATH=voxel-realms and serves dist/ under /voxel-realms/.
// The Playwright webServer launches the right static server for that.
//
// These assertions are deliberately strict so production-only
// regressions (wrong asset base path, canvas collapsing to 0px, R3F
// attr crashes) cannot slip past green CI like they did through the
// last five merges.

const IGNORABLE_URL_SUFFIXES = ["/favicon.ico"];

function isIgnorable(url: string) {
  return IGNORABLE_URL_SUFFIXES.some((suffix) => url.endsWith(suffix));
}

interface PageErrorRecorder {
  pageErrors: string[];
  consoleErrors: string[];
  fourohfours: string[];
  // Combined human-readable diagnostic lines for assertion messages.
  summary: () => string[];
}

function recordPageErrors(page: Page): PageErrorRecorder {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const fourohfours: string[] = [];

  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("response", (res) => {
    if (res.status() === 404 && !isIgnorable(res.url())) {
      fourohfours.push(res.url());
    }
  });

  return {
    pageErrors,
    consoleErrors,
    fourohfours,
    summary() {
      const lines: string[] = [];
      for (const err of pageErrors) lines.push(`[pageerror] ${err}`);
      for (const url of fourohfours) lines.push(`[404] ${url}`);
      // "Failed to load resource" console noise is redundant with the
      // 404 URLs we already captured — drop the generic one but keep
      // real errors like R3F crashes.
      for (const msg of consoleErrors) {
        if (/Failed to load resource/i.test(msg)) continue;
        lines.push(`[console] ${msg}`);
      }
      return lines;
    },
  };
}

test.describe("@prod-surface production surface", () => {
  test.describe.configure({ timeout: 120_000 });

  test("cold player loads landing with no 404s or console errors", async ({ page }) => {
    const rec = recordPageErrors(page);

    await page.goto("/voxel-realms/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /enter realm/i }).waitFor({ timeout: 20_000 });
    // Give the preload loop a beat to finish — 404s often fire slightly
    // after the button appears.
    await page.waitForTimeout(1_500);

    const diagnostics = rec.summary();
    expect(diagnostics, `Unexpected landing-time errors:\n${diagnostics.join("\n")}`).toHaveLength(
      0
    );
  });

  test("Enter Realm mounts a canvas that actually fills the viewport", async ({ page }) => {
    const rec = recordPageErrors(page);

    await page.goto("/voxel-realms/", { waitUntil: "domcontentloaded" });
    const startButton = page.getByRole("button", { name: /enter realm/i });
    await startButton.waitFor({ state: "visible", timeout: 30_000 });
    // Landing has animated shader layers; Playwright's strict-mode
    // stability check times out in slow CI. We only need the click
    // to fire — force it.
    await startButton.click({ force: true });

    const viewportHandle = page.locator("[data-realm-extraction-state]");
    await viewportHandle.waitFor({ state: "attached", timeout: 20_000 });

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "visible", timeout: 20_000 });

    // Let any late-mount preload + runtime GLB fetches settle.
    await page.waitForTimeout(3_000);

    const layout = await page.evaluate(() => {
      const c = document.querySelector("canvas") as HTMLCanvasElement | null;
      const root = document.getElementById("root");
      return {
        clientWidth: c?.clientWidth ?? 0,
        clientHeight: c?.clientHeight ?? 0,
        rootHeight: root?.clientHeight ?? 0,
        rootWidth: root?.clientWidth ?? 0,
        bodyHeight: document.body?.clientHeight ?? 0,
        windowInnerHeight: window.innerHeight,
        windowInnerWidth: window.innerWidth,
      };
    });
    const { clientWidth, clientHeight } = layout;
    const layoutMessage = JSON.stringify(layout);

    // Canvas must fill the layout viewport. Before PR #81 this
    // collapsed to ~150px tall on mobile (GameViewport:height:100%
    // chained off #root with only min-height set), producing a black
    // strip at the top with a dead void below.
    const viewport = page.viewportSize();
    const targetHeight = viewport?.height ?? 600;
    const targetWidth = viewport?.width ?? 320;
    expect(
      clientHeight,
      `canvas clientHeight (${clientHeight}) should fill viewport (${targetHeight}). layout=${layoutMessage}`
    ).toBeGreaterThan(targetHeight * 0.6);
    expect(
      clientWidth,
      `canvas clientWidth (${clientWidth}) should fill viewport (${targetWidth}). layout=${layoutMessage}`
    ).toBeGreaterThan(targetWidth * 0.6);

    await expect(page.getByText(/RUN\s*1/i).first()).toBeVisible({ timeout: 10_000 });

    const diagnostics = rec.summary();
    expect(
      diagnostics,
      `Unexpected runtime errors during play mount (this often indicates a wrong asset base path or an R3F attr crash):\n${diagnostics.join("\n")}`
    ).toHaveLength(0);
  });
});
