/**
 * Jolly Pixel scene runtime for Voxel Realms.
 *
 * One function: startScene(canvas, realm) → a running Runtime with a
 * voxel-renderer actor showing the baked realm and a Camera3DControls
 * actor framing it. No React. No R3F. Pure engine.
 *
 * Returns a SceneHandle the shell can use to swap realms, pause, and
 * tear the whole thing down on unmount.
 */

import { type Actor, ActorComponent, Camera3DControls } from "@jolly-pixel/engine";
import { loadRuntime, Runtime } from "@jolly-pixel/runtime";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import type { RealmClimb } from "@world/climber";
import { BAKED_BLOCKS, BAKED_TILESET_ID, bakeRealmVoxels } from "@world/voxel-bake";
import * as THREE from "three";

export interface SceneHandle {
  runtime: Runtime;
  /** Replace the current voxel world with a newly baked realm. */
  loadRealm(realm: RealmClimb): Promise<void>;
  /** Pause the main loop. */
  pause(): void;
  /** Resume the main loop. */
  resume(): void;
  /** Tear everything down. Safe to call multiple times. */
  dispose(): void;
}

function tilesetBaseUrl(): string {
  const baseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

class TerrainBehavior extends ActorComponent {
  renderer: VoxelRenderer | null = null;
  private tilesetLoaded = false;

  constructor(actor: Actor) {
    super({ actor, typeName: "TerrainBehavior" });
  }

  awake(): void {
    this.renderer = this.actor.addComponentAndGet(VoxelRenderer, {
      chunkSize: 16,
      material: "lambert",
    });

    // Pre-register our two canonical blocks so load() doesn't reject them.
    for (const block of BAKED_BLOCKS) {
      this.renderer.blockRegistry.register(block);
    }
  }

  private async ensureTileset(): Promise<void> {
    if (this.tilesetLoaded || !this.renderer) return;
    try {
      await this.renderer.loadTileset({
        id: BAKED_TILESET_ID,
        src: `${tilesetBaseUrl()}assets/tilesets/${BAKED_TILESET_ID}.png`,
        tileSize: 32,
      });
      this.tilesetLoaded = true;
    } catch (error) {
      console.error("[scene] tileset load failed", error);
    }
  }

  async setRealm(realm: RealmClimb): Promise<void> {
    if (!this.renderer) return;
    await this.ensureTileset();
    const worldJson = bakeRealmVoxels(realm);
    try {
      await this.renderer.load(worldJson);
    } catch (error) {
      console.error("[scene] voxel load failed", error);
    }
  }
}

export async function startScene(
  canvas: HTMLCanvasElement,
  initialRealm?: RealmClimb
): Promise<SceneHandle> {
  const runtime = new Runtime(canvas, { includePerformanceStats: false });
  const { world } = runtime;

  // Scene background matches the project's dark/teal landing palette
  // so a cold-start doesn't flash white. Retain references to every
  // resource we own so dispose() can release them deterministically.
  const sceneSource = world.sceneManager.getSource();
  sceneSource.background = new THREE.Color("#07090d");
  const ambientLight = new THREE.AmbientLight(new THREE.Color("#ffffff"), 2.0);
  sceneSource.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(new THREE.Color("#f6faff"), 1.4);
  dirLight.position.set(20, 40, 30);
  sceneSource.add(dirLight);

  world.createActor("camera").addComponent(Camera3DControls, {}, (controls) => {
    controls.camera.position.set(20, 30, 40);
    controls.camera.lookAt(0, 0, 0);
  });

  const terrainActor = world.createActor("terrain");
  const terrainBehavior = terrainActor.addComponentAndGet(TerrainBehavior);

  await loadRuntime(runtime).catch((error) => {
    console.error("[scene] loadRuntime failed", error);
  });

  if (initialRealm) {
    await terrainBehavior.setRealm(initialRealm);
  }

  let disposed = false;

  return {
    runtime,
    async loadRealm(realm) {
      if (disposed) return;
      await terrainBehavior.setRealm(realm);
    },
    pause() {
      if (!disposed && runtime.running) {
        runtime.stop();
      }
    },
    resume() {
      if (!disposed && !runtime.running) {
        runtime.start();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // Stop the main loop first so no more render ticks run against
      // resources we're about to release.
      try {
        runtime.stop();
      } catch {}
      // Remove lights from the scene graph so they can be collected.
      try {
        sceneSource.remove(ambientLight);
        sceneSource.remove(dirLight);
        ambientLight.dispose();
        dirLight.dispose();
      } catch {}
      // Clear scene background so the THREE.Color allocation is not
      // retained by the still-referenced Scene instance.
      try {
        sceneSource.background = null;
      } catch {}
    },
  };
}
