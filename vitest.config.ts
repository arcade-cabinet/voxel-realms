import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    fileParallelism: false,
    testTimeout: 30_000,
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions:
          process.env.GITHUB_ACTIONS === "true"
            ? {
                channel: "chrome",
              }
            : undefined,
      }),
      instances: [{ browser: "chromium" }],
      headless: true,
    },
    setupFiles: "./app/test/setup.ts",
    include: ["app/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
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
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "three/addons": path.resolve(__dirname, "node_modules/three/examples/jsm"),
      three: path.resolve(__dirname, "node_modules/three"),
      "@dimforge/rapier3d": path.resolve(__dirname, "src/scene/rapier-stub.ts"),
      "@dimforge/rapier3d-compat": path.resolve(__dirname, "src/scene/rapier-stub.ts"),
    },
    dedupe: ["react", "react-dom", "three", "koota"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "three",
      "koota",
      "lucide-react",
      "@testing-library/jest-dom/vitest",
    ],
  },
});
