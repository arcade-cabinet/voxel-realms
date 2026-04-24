/**
 * Coverage-only Vitest config (P7.6). The main `vitest.config.ts`
 * runs every test in a Playwright-driven Chromium browser — that's
 * right for R3F / DOM tests but the v8 coverage provider cannot
 * attach to the browser runtime. This config disables browser mode
 * and targets the pure-engine suite under `src/`, which is where
 * coverage is most useful anyway (deterministic validators,
 * generators, and progression math).
 *
 * Invoke via `pnpm test:coverage`. Emits HTML + lcov under
 * `coverage/`. CI uploads `coverage/` as an artifact.
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "app"),
      "@logic": path.resolve(__dirname, "src"),
    },
  },
});
