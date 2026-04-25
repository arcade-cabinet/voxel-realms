import { type Actor, ActorComponent, ModelRenderer } from "@jolly-pixel/engine";
import { RealmTrait } from "@store/traits";
import { voxelEntity } from "@store/world";
import { getRealmAssetRuntimeModel } from "@world/asset-budget";
import type { RealmClimb } from "@world/climber";
import * as THREE from "three";

function publicAssetUrl(publicPath: string | null | undefined): string | null {
  if (!publicPath) return null;
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const baseTrimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${baseTrimmed}${publicPath.startsWith("/") ? publicPath : `/${publicPath}`}`;
}

interface RouteBehaviorOptions {
  /** Initial realm — used for first-load anomaly placement. */
  realm?: RealmClimb;
}

/**
 * Owns the per-realm collection of anomaly markers. Each anomaly
 * becomes a child actor with a JP ModelRenderer pointing at the
 * runtime-promoted GLB, registered through world.assetManager so
 * loadRuntime's progress tracker accounts for the bytes.
 *
 * Reads RealmTrait.discoveredAnomalies each frame and tints the
 * marker's emissive when the player has scanned it. Replaces every
 * anomaly when setRealm() is called for a new realm.
 */
export class RouteBehavior extends ActorComponent {
  private anomalyActors = new Map<string, Actor>();
  private discoveredCache: string[] = [];
  private currentRealmSeed: string | null = null;
  private fallbackMarker = new Map<string, { mesh: THREE.Mesh; baseColor: THREE.Color }>();

  constructor(actor: Actor, options: RouteBehaviorOptions = {}) {
    super({ actor, typeName: "RouteBehavior" });
    const initialRealm = options.realm;
    if (initialRealm) {
      // Defer placement until awake() so we can use addComponentAndGet.
      queueMicrotask(() => this.setRealm(initialRealm));
    }
  }

  awake(): void {
    this.needUpdate = true;
  }

  setRealm(realm: RealmClimb): void {
    if (this.currentRealmSeed === realm.seed) return;
    this.currentRealmSeed = realm.seed;
    this.clearAnomalies();

    for (const anomaly of realm.anomalies) {
      this.spawnAnomaly(anomaly);
    }
    this.discoveredCache = [];
  }

  update(_deltaMs: number): void {
    const realm = voxelEntity.get(RealmTrait);
    if (!realm) return;
    if (realm.activeRealm.seed !== this.currentRealmSeed) {
      this.setRealm(realm.activeRealm);
      return;
    }
    if (realm.discoveredAnomalies.length === this.discoveredCache.length) return;

    for (const id of realm.discoveredAnomalies) {
      if (this.discoveredCache.includes(id)) continue;
      this.markDiscovered(id);
    }
    this.discoveredCache = [...realm.discoveredAnomalies];
  }

  destroy(): void {
    this.clearAnomalies();
    super.destroy();
  }

  private spawnAnomaly(anomaly: RealmClimb["anomalies"][number]): void {
    const runtimeModel = getRealmAssetRuntimeModel(anomaly.asset);
    const url = publicAssetUrl(runtimeModel.publicPath);
    const child = this.actor.world.createActor(`anomaly:${anomaly.id}`);
    child.object3D.position.set(anomaly.position.x, anomaly.position.y, anomaly.position.z);

    if (runtimeModel.canLoadAtRuntime && url) {
      child.addComponent(ModelRenderer, { path: url });
    } else {
      // Static / deferred / reference assets get a minimal placeholder
      // so the player can still see *something* at the anomaly site.
      const baseColor = new THREE.Color("#41dce8");
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 0.6),
        new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: new THREE.Color("#41dce8"),
          emissiveIntensity: 0.35,
        })
      );
      child.object3D.add(mesh);
      this.fallbackMarker.set(anomaly.id, { mesh, baseColor });
    }

    this.anomalyActors.set(anomaly.id, child);
  }

  private markDiscovered(anomalyId: string): void {
    const fallback = this.fallbackMarker.get(anomalyId);
    if (fallback) {
      const material = fallback.mesh.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.setHex(0xbcff5c);
        material.emissiveIntensity = 0.85;
      }
    }
    // For real GLB models, JP's ModelRenderer doesn't expose easy
    // material tinting. Visual feedback for discovered anomalies on
    // GLBs lives in the React HUD (signal-pulse, gallery) until we
    // build a dedicated ScanHighlightBehavior in a later slice.
  }

  private clearAnomalies(): void {
    for (const [, actor] of this.anomalyActors) {
      try {
        actor.destroy();
      } catch {}
    }
    this.anomalyActors.clear();
    this.fallbackMarker.clear();
  }
}
