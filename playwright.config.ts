import { defineConfig, devices } from "@playwright/test";

const IS_CI = !!process.env.CI;
const IS_HEADLESS = process.env.PW_HEADLESS === "1" || IS_CI;
const CHROMIUM_CHANNEL =
  process.env.PW_CHROMIUM_CHANNEL ?? (!IS_CI && !IS_HEADLESS ? "chrome" : undefined);

const DEFAULT_PORT = 41744;
const configuredPort = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PW_PORT);
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT;
const PROD_SURFACE_MODE = process.env.PW_PROD_SURFACE === "1";
const BASE_URL = PROD_SURFACE_MODE
  ? `http://127.0.0.1:${PORT}/voxel-realms/`
  : `http://127.0.0.1:${PORT}/`;
const REUSE_SERVER = !IS_CI && process.env.PW_REUSE_SERVER === "1";

const GAME_ARGS = [
  "--no-sandbox",
  "--use-angle=gl",
  "--enable-webgl",
  "--ignore-gpu-blocklist",
  "--mute-audio",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: IS_CI ? 2 : 0,
  timeout: IS_CI ? 90_000 : 60_000,
  reporter: IS_CI ? [["list"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: BASE_URL,
    headless: IS_HEADLESS,
    trace: "on-first-retry",
    actionTimeout: IS_CI ? 30_000 : 15_000,
    navigationTimeout: IS_CI ? 30_000 : 15_000,
    browserName: "chromium",
    channel: CHROMIUM_CHANNEL,
    launchOptions: {
      args: GAME_ARGS,
    },
  },

  webServer: PROD_SURFACE_MODE
    ? {
        // Serves the built dist/ under /voxel-realms/ so @prod-surface
        // specs exercise the exact layout users hit on GitHub Pages.
        command: `node scripts/serve-prod-surface.mjs --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: REUSE_SERVER,
        timeout: 60_000,
      }
    : {
        command: `pnpm exec vite --host 127.0.0.1 --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: REUSE_SERVER,
        timeout: 120_000,
      },

  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-portrait",
      use: {
        ...devices["iPhone 14"],
      },
    },
    {
      name: "tablet-portrait",
      use: {
        ...devices["iPad (gen 7)"],
      },
    },
  ],
});
