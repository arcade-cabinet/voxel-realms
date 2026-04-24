import "@app/styles/globals.css";
import { bootstrapPlatform } from "@platform";
import { type SceneHandle, startScene } from "@scene";
import { RealmTrait } from "@store/traits";
import { voxelEntity } from "@store/world";
import { GameShell } from "@views/game-shell";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/**
 * Bootstraps the app in the required order:
 *   1. Platform + persistence (so prefs reads see real values, not defaults)
 *   2. JP scene runtime against <canvas id="scene-canvas"> (owns the WebGL context)
 *   3. React HUD overlay above the canvas (drives phase switching via Koota traits)
 *
 * The HUD root sits on top of the canvas with pointer-events: none on
 * the root; interactive children opt back in.
 */
async function main(): Promise<void> {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Failed to find the root element");
  }

  const canvas = document.getElementById("scene-canvas") as HTMLCanvasElement | null;

  // Bootstrap persistence first so Koota traits + preference reads see
  // real values when the HUD mounts.
  try {
    await bootstrapPlatform();
  } catch (error) {
    console.error("Platform bootstrap failed", error);
  }

  // Mount the scene if the canvas is present. In the browser test
  // harness we leave the canvas out intentionally so the HUD stays
  // testable without a WebGL context.
  let sceneHandle: SceneHandle | null = null;
  if (canvas && !isTestHarness()) {
    try {
      const initialRealm = voxelEntity.get(RealmTrait)?.activeRealm;
      sceneHandle = await startScene(canvas, initialRealm);
    } catch (error) {
      console.error("Scene bootstrap failed", error);
    }
  }

  // StrictMode intentionally disabled here: JP's Runtime owns the
  // WebGL context and main loop, and double-mount would kick the
  // scene layer unnecessarily. The overlay is side-effect-light.
  createRoot(rootElement).render(<GameShell />);

  dismissBootSplash();

  // Tear the scene down on navigation / HMR so Runtime.stop() fires.
  if (sceneHandle) {
    const handle = sceneHandle;
    window.addEventListener("beforeunload", () => handle.dispose(), { once: true });
    if (import.meta.hot) {
      import.meta.hot.dispose(() => handle.dispose());
    }
  }
}

function isTestHarness(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ === true
  );
}

function dismissBootSplash(): void {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  splash.setAttribute("data-hidden", "true");
  window.setTimeout(() => splash.remove(), 420);
}

// Use two rAFs only as a no-op when not available (SSR / node).
if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
  window.requestAnimationFrame(() => {
    void main();
  });
} else {
  void main();
}

// StrictMode is exported to satisfy the linter if something else
// decides to consume it; keep the reference so esbuild doesn't tree-
// shake the import in an unexpected way.
export { StrictMode };
