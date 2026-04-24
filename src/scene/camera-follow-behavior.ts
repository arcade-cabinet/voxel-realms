import { type Actor, ActorComponent, Camera3DControls } from "@jolly-pixel/engine";
import * as THREE from "three";
import type { PlayerBehavior } from "./player-behavior";

interface CameraFollowOptions {
  player: PlayerBehavior;
  /** Offset from the player position in world units. */
  offset?: THREE.Vector3;
  /** Lerp factor 0..1 — higher = snappier. */
  responsiveness?: number;
}

/**
 * Third-person follow camera. Owns a Camera3DControls component (so JP
 * still drives the projection / matrix) but each frame we override the
 * world-space camera position to a smoothed offset behind the player,
 * looking at the player's torso. Replaces the static camera in the
 * pre-Pillar-A runtime.
 *
 * The Camera3DControls' default WASD/mouse bindings remain attached;
 * they're harmless because we overwrite position every tick. A future
 * slice can replace this with a CameraOrbitBehavior driven by touch
 * drag for mobile look.
 */
export class CameraFollowBehavior extends ActorComponent {
  private controls: Camera3DControls;
  private offset: THREE.Vector3;
  private responsiveness: number;
  private playerRef: PlayerBehavior;
  private lookTarget = new THREE.Vector3();

  constructor(actor: Actor, options: CameraFollowOptions) {
    super({ actor, typeName: "CameraFollowBehavior" });
    this.playerRef = options.player;
    this.offset = options.offset?.clone() ?? new THREE.Vector3(0, 6, 9);
    this.responsiveness = options.responsiveness ?? 0.12;
    this.controls = this.actor.addComponentAndGet(Camera3DControls, {});
  }

  awake(): void {
    this.needUpdate = true;
    const spawn = this.playerRef.position;
    this.controls.camera.position.set(
      spawn.x + this.offset.x,
      spawn.y + this.offset.y,
      spawn.z + this.offset.z
    );
    this.controls.camera.lookAt(spawn.x, spawn.y + 1, spawn.z);
  }

  update(_deltaMs: number): void {
    const player = this.playerRef.position;
    const target = new THREE.Vector3(
      player.x + this.offset.x,
      player.y + this.offset.y,
      player.z + this.offset.z
    );
    this.controls.camera.position.lerp(target, this.responsiveness);
    this.lookTarget.set(player.x, player.y + 1, player.z);
    this.controls.camera.lookAt(this.lookTarget);
  }
}
