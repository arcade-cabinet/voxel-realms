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
    // Engine coverage targets the pure-engine suite only. Audio /
    // platform / shared error-telemetry tests use DOM globals
    // (window, AudioContext, Capacitor plugin shims) and are
    // covered by the browser-mode vitest config.
    include: [
      "src/world/**/*.test.{ts,tsx}",
      "src/engine/**/*.test.{ts,tsx}",
      "src/ai/**/*.test.{ts,tsx}",
      "src/assets/**/*.test.{ts,tsx}",
      "src/store/**/*.test.{ts,tsx}",
    ],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/world/**/*.{ts,tsx}",
        "src/engine/**/*.{ts,tsx}",
        "src/ai/**/*.{ts,tsx}",
        "src/assets/**/*.{ts,tsx}",
        "src/store/**/*.{ts,tsx}",
      ],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@world": path.resolve(__dirname, "src/world"),
      "@engine": path.resolve(__dirname, "src/engine"),
      "@ai": path.resolve(__dirname, "src/ai"),
      "@assets": path.resolve(__dirname, "src/assets"),
      "@scene": path.resolve(__dirname, "src/scene"),
      "@audio": path.resolve(__dirname, "src/audio"),
      "@store": path.resolve(__dirname, "src/store"),
      "@platform": path.resolve(__dirname, "src/platform"),
      "@workers": path.resolve(__dirname, "src/workers"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@views": path.resolve(__dirname, "app/views"),
      "@components": path.resolve(__dirname, "app/components"),
      "@atoms": path.resolve(__dirname, "app/atoms"),
      "@hooks": path.resolve(__dirname, "app/hooks"),
      "@app": path.resolve(__dirname, "app"),
      "@logic": path.resolve(__dirname, "src"),
    },
  },
});
