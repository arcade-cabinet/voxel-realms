import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const base = process.env.VITE_BASE_PATH ?? "/";

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
