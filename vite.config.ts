import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function normalizeBasePath(value?: string) {
  if (!value) {
    return "/";
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed === "/") {
    return "/";
  }

  if (/^https?:\/\//.test(trimmed)) {
    return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

const base = normalizeBasePath(process.env.VITE_BASE_PATH);

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    copyPublicDir: false,
    // Rapier's compat ESM bundle is a single ~2 MB module. Keep that as an
    // explicit vendor budget so Vite warnings still catch growth beyond it.
    chunkSizeWarningLimit: 2200,
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@dimforge") || id.includes("@react-three/rapier")) {
              return "vendor-physics";
            }

            if (
              id.includes("@react-three/fiber") ||
              id.includes("@react-three/drei") ||
              id.includes("three-stdlib")
            ) {
              return "vendor-r3f";
            }

            if (id.includes(`${path.sep}three${path.sep}`)) {
              return "vendor-three";
            }

            if (id.includes("react") || id.includes("scheduler")) {
              return "vendor-react";
            }

            if (id.includes("koota")) {
              return "vendor-ecs";
            }

            if (
              id.includes("@capacitor") ||
              id.includes("jeep-sqlite") ||
              id.includes("sql.js") ||
              id.includes("localforage") ||
              id.includes("jszip") ||
              id.includes("@stencil") ||
              id.includes("browser-fs-access")
            ) {
              return "vendor-sqlite";
            }

            return "vendor-misc";
          }

          if (id.includes(`${path.sep}src${path.sep}games${path.sep}voxel-realms${path.sep}`)) {
            return "realm-engine";
          }
        },
      },
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
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      three: path.resolve(__dirname, "node_modules/three"),
    },
    dedupe: [
      "react",
      "react-dom",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/rapier",
      "koota",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/rapier",
      "koota",
      "lucide-react",
    ],
  },
});
