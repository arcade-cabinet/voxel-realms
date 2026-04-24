/**
 * Jolly Pixel scene runtime for Voxel Realms.
 *
 * Bootstraps a JP Runtime against a canvas, creates the actor graph
 * (terrain → player → follow camera), and returns a SceneHandle the
 * shell uses to swap realms, pause, and tear down on unmount.
 *
 * No React. No R3F. The canvas is owned by JP; the React HUD overlay
 * sits above it and reads/writes the same Koota traits the player
 * behavior writes via advanceRealmRuntime.
 */

import { loadRuntime, Runtime } from "@jolly-pixel/runtime";
import type { RealmClimb } from "@world/climber";
import * as THREE from "three";
import { CameraFollowBehavior } from "./camera-follow-behavior";
import { PlayerBehavior } from "./player-behavior";
import { RouteBehavior } from "./route-behavior";
import { TerrainBehavior } from "./terrain-behavior";

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

export async function startScene(
  canvas: HTMLCanvasElement,
  initialRealm?: RealmClimb
): Promise<SceneHandle> {
  const runtime = new Runtime(canvas, { includePerformanceStats: false });
  const { world } = runtime;

  const sceneSource = world.sceneManager.getSource();
  sceneSource.background = new THREE.Color("#07090d");
  const ambientLight = new THREE.AmbientLight(new THREE.Color("#ffffff"), 2.0);
  sceneSource.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(new THREE.Color("#f6faff"), 1.4);
  dirLight.position.set(20, 40, 30);
  sceneSource.add(dirLight);

  // Terrain — VoxelRenderer-backed. Loads asynchronously after
  // loadRuntime starts the main loop.
  const terrainActor = world.createActor("terrain");
  const terrainBehavior = terrainActor.addComponentAndGet(TerrainBehavior);

  // Route — anomaly markers. Spawns a child actor per anomaly with a
  // JP ModelRenderer so loadRuntime's asset pipeline tracks the GLB
  // bytes and the player sees them in-world.
  const routeActor = world.createActor("route");
  const routeBehavior = routeActor.addComponentAndGet(RouteBehavior, {
    realm: initialRealm,
  });

  // Player — kinematic body, reads world.input each frame, writes
  // position into RealmTrait via advanceRealmRuntime.
  const spawn = initialRealm?.platforms[0]?.position ?? { x: 0, y: 0, z: 0 };
  const playerActor = world.createActor("player");
  const playerBehavior = playerActor.addComponentAndGet(PlayerBehavior, { spawn });

  // Camera — follows the player. Replaces the static debug camera the
  // pre-Pillar-A scene used.
  const cameraActor = world.createActor("camera");
  cameraActor.addComponentAndGet(CameraFollowBehavior, { player: playerBehavior });

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
      routeBehavior.setRealm(realm);
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
      try {
        runtime.stop();
      } catch {}
      try {
        sceneSource.remove(ambientLight);
        sceneSource.remove(dirLight);
        ambientLight.dispose();
        dirLight.dispose();
      } catch {}
      try {
        sceneSource.background = null;
      } catch {}
    },
  };
}
