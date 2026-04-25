import "@app/styles/globals.css";
import { bootstrapPlatform } from "@platform";
import { type SceneHandle, startScene } from "@scene";
import { RealmTrait } from "@store/traits";
import { voxelEntity } from "@store/world";
import { GameShell } from "@views/game-shell";
import { createRoot, type Root } from "react-dom/client";

/**
 * Bootstraps the app in the required order:
 *   1. Platform + persistence (so prefs reads see real values, not defaults)
 *   2. JP scene runtime against <canvas id="scene-canvas"> (owns the WebGL context)
 *   3. React HUD overlay above the canvas (drives phase switching via Koota traits)
 *
 * The HUD root sits on top of the canvas with pointer-events: none on
 * the root; interactive children opt back in.
 *
 * StrictMode is intentionally off: JP's Runtime owns the WebGL context
 * and main loop, and double-mount would kick the scene layer
 * unnecessarily.
 */

let activeRoot: Root | null = null;
let activeSceneHandle: SceneHandle | null = null;
let unloadListener: (() => void) | null = null;

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
  if (canvas && !isTestHarness()) {
    try {
      const initialRealm = voxelEntity.get(RealmTrait)?.activeRealm;
      activeSceneHandle = await startScene(canvas, initialRealm);
    } catch (error) {
      console.error("Scene bootstrap failed", error);
    }
  }

  activeRoot = createRoot(rootElement);
  activeRoot.render(<GameShell />);

  // Tear the scene down on navigation / HMR so Runtime.stop() fires
  // and three.js resources are released. Keep a reference so disposeAll
  // can also remove the listener to avoid leaving a dead handler.
  if (activeSceneHandle) {
    const handle = activeSceneHandle;
    unloadListener = () => {
      handle.dispose();
    };
    window.addEventListener("beforeunload", unloadListener, { once: true });
  }
}

function disposeAll(): void {
  if (unloadListener) {
    window.removeEventListener("beforeunload", unloadListener);
    unloadListener = null;
  }
  try {
    activeSceneHandle?.dispose();
  } catch {}
  activeSceneHandle = null;
  try {
    activeRoot?.unmount();
  } catch {}
  activeRoot = null;
}

function isTestHarness(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ === true
  );
}

// JP's loadRuntime injects its own <jolly-loading> custom element
// and fades the canvas in once GPU detection + asset loading complete.
// One rAF still defers main() past the initial paint so the JP loader
// can render before we block on construction.
if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
  window.requestAnimationFrame(() => {
    void main();
  });
} else {
  void main();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeAll();
  });
}
