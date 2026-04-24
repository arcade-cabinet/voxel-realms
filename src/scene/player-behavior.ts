import type { Vec3 } from "@engine/types";
import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import { advanceRealmRuntime, RealmTrait, VoxelTrait } from "@store/traits";
import { voxelEntity } from "@store/world";
import * as THREE from "three";

interface PlayerBehaviorOptions {
  spawn: Vec3;
}

/**
 * Kinematic player controller. Reads JP world.input each frame, moves a
 * THREE.Mesh body owned by the player actor, then writes the new
 * position into the Koota RealmTrait via advanceRealmRuntime so the
 * existing realm-progress engine (signal scan, instability, exit gate,
 * extraction state) keeps running unchanged.
 *
 * Movement model is intentionally simple for the first JP slice:
 * - WASD / arrow keys → planar XZ move at PLAYER_SPEED units/sec.
 * - Space → fixed-height impulse jump.
 * - Gravity pulls the body toward the highest platform-top under it
 *   (read from RealmTrait.activeRealm.platforms) so the player stands
 *   on platforms instead of falling through the world.
 * - Touch is detected via input.isTouchDown("primary"); when held the
 *   player drifts forward along camera-relative -Z. A real virtual
 *   joystick (Touchpad device) replaces this in the next slice.
 */
export class PlayerBehavior extends ActorComponent {
  private body: THREE.Mesh;
  private velocityY = 0;
  private elapsedMs = 0;

  static readonly PLAYER_SPEED = 6;
  static readonly JUMP_VELOCITY = 8;
  static readonly GRAVITY = 22;
  static readonly PLAYER_HEIGHT = 1.6;

  constructor(actor: Actor, options: PlayerBehaviorOptions) {
    super({ actor, typeName: "PlayerBehavior" });

    const geometry = new THREE.BoxGeometry(0.6, PlayerBehavior.PLAYER_HEIGHT, 0.6);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#bcff5c"),
      roughness: 0.55,
      metalness: 0.05,
    });
    this.body = new THREE.Mesh(geometry, material);
    this.body.position.set(
      options.spawn.x,
      options.spawn.y + PlayerBehavior.PLAYER_HEIGHT / 2,
      options.spawn.z
    );
    this.actor.object3D.add(this.body);
  }

  awake(): void {
    this.needUpdate = true;
    if (typeof window !== "undefined") {
      window.addEventListener("voxel:reset-player", this.handleReset);
    }
  }

  /**
   * Bridge for the React shell's existing `voxel:reset-player` event.
   * When a realm starts / retries / next-realms, the shell rewrites
   * the RealmTrait then dispatches this event; we snap the body to
   * the new spawn so movement resumes from the right place. Migrates
   * to a per-actor SignalEvent in Pillar E.
   */
  private handleReset = (): void => {
    const realm = voxelEntity.get(RealmTrait);
    const spawn = realm?.activeRealm?.platforms[0]?.position ?? { x: 0, y: 0, z: 0 };
    this.body.position.set(spawn.x, spawn.y + PlayerBehavior.PLAYER_HEIGHT / 2, spawn.z);
    this.velocityY = 0;
    this.elapsedMs = 0;
  };

  /** Convenience accessor for follow-cam etc. */
  get position(): Vec3 {
    return {
      x: this.body.position.x,
      y: this.body.position.y - PlayerBehavior.PLAYER_HEIGHT / 2,
      z: this.body.position.z,
    };
  }

  update(deltaMs: number): void {
    // Skip simulation while we are not actively playing — landing,
    // pause, gameover, and win all freeze player input + realm tick.
    const voxelState = voxelEntity.get(VoxelTrait);
    if (voxelState && voxelState.phase !== "playing") {
      return;
    }

    const dtSec = Math.min(deltaMs, 50) / 1000;
    this.elapsedMs += deltaMs;

    const { input } = this.actor.world;

    let moveX = 0;
    let moveZ = 0;
    if (input.isKeyDown("KeyW") || input.isKeyDown("ArrowUp")) moveZ -= 1;
    if (input.isKeyDown("KeyS") || input.isKeyDown("ArrowDown")) moveZ += 1;
    if (input.isKeyDown("KeyA") || input.isKeyDown("ArrowLeft")) moveX -= 1;
    if (input.isKeyDown("KeyD") || input.isKeyDown("ArrowRight")) moveX += 1;

    // Touch fallback: any primary touch drifts forward. Replaced by a
    // proper virtual joystick (Touchpad) in the next slice.
    if (moveX === 0 && moveZ === 0 && input.isTouchDown?.("primary")) {
      moveZ = -1;
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    this.body.position.x += moveX * PlayerBehavior.PLAYER_SPEED * dtSec;
    this.body.position.z += moveZ * PlayerBehavior.PLAYER_SPEED * dtSec;

    // Gravity + ground from realm platforms.
    const realm = voxelEntity.get(RealmTrait);
    const groundY = this.sampleGroundHeight(realm) + PlayerBehavior.PLAYER_HEIGHT / 2;
    if (input.isKeyDown("Space") && Math.abs(this.body.position.y - groundY) < 0.05) {
      this.velocityY = PlayerBehavior.JUMP_VELOCITY;
    }
    this.velocityY -= PlayerBehavior.GRAVITY * dtSec;
    this.body.position.y += this.velocityY * dtSec;
    if (this.body.position.y <= groundY) {
      this.body.position.y = groundY;
      this.velocityY = 0;
    }

    // Write player position into the realm runtime so the existing
    // progress engine evaluates scan / extract / collapse off it.
    if (realm) {
      voxelEntity.set(RealmTrait, advanceRealmRuntime(realm, this.position, this.elapsedMs));
    }
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("voxel:reset-player", this.handleReset);
    }
    super.destroy();
  }

  private sampleGroundHeight(realm: ReturnType<typeof voxelEntity.get<typeof RealmTrait>>): number {
    if (!realm?.activeRealm) return 0;
    let best = -Infinity;
    for (const platform of realm.activeRealm.platforms) {
      const dx = Math.abs(this.body.position.x - platform.position.x);
      const dz = Math.abs(this.body.position.z - platform.position.z);
      const halfX = platform.size.x / 2;
      const halfZ = platform.size.z / 2;
      if (dx <= halfX && dz <= halfZ) {
        const top = platform.position.y + platform.size.y / 2;
        if (top > best) best = top;
      }
    }
    return Number.isFinite(best) ? best : 0;
  }
}
