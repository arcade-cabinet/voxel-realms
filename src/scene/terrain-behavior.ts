import { type Actor, ActorComponent } from "@jolly-pixel/engine";
import { VoxelRenderer } from "@jolly-pixel/voxel.renderer";
import type { RealmClimb } from "@world/climber";
import { BAKED_BLOCKS, BAKED_TILESET_ID, bakeRealmVoxels } from "@world/voxel-bake";

function tilesetBaseUrl(): string {
  const baseUrl =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

/**
 * Terrain actor behavior. Owns the VoxelRenderer and feeds it baked
 * RealmClimb data. setRealm() serialises chunked loads so back-to-back
 * realm swaps cannot race two parallel VoxelRenderer.load() calls
 * through the same chunk pipeline.
 */
export class TerrainBehavior extends ActorComponent {
  renderer: VoxelRenderer | null = null;
  private tilesetPromise: Promise<void> | null = null;
  private loadChain: Promise<void> = Promise.resolve();

  constructor(actor: Actor) {
    super({ actor, typeName: "TerrainBehavior" });
  }

  awake(): void {
    this.renderer = this.actor.addComponentAndGet(VoxelRenderer, {
      chunkSize: 16,
      material: "lambert",
    });

    for (const block of BAKED_BLOCKS) {
      this.renderer.blockRegistry.register(block);
    }
  }

  private ensureTileset(): Promise<void> {
    if (!this.renderer) return Promise.resolve();
    if (this.tilesetPromise) return this.tilesetPromise;
    const renderer = this.renderer;
    this.tilesetPromise = renderer
      .loadTileset({
        id: BAKED_TILESET_ID,
        src: `${tilesetBaseUrl()}assets/tilesets/${BAKED_TILESET_ID}.png`,
        tileSize: 32,
      })
      .catch((error) => {
        console.error("[scene] tileset load failed", error);
        this.tilesetPromise = null;
      });
    return this.tilesetPromise;
  }

  async setRealm(realm: RealmClimb): Promise<void> {
    if (!this.renderer) return;
    const prior = this.loadChain.catch(() => undefined);
    const run = prior.then(async () => {
      await this.ensureTileset();
      if (!this.renderer) return;
      const worldJson = bakeRealmVoxels(realm);
      try {
        // Reference example passes { mergeLayers: true } here, but the
        // published @jolly-pixel/voxel.renderer@1.4.0 dist/.d.ts does
        // not include the options arg yet. Drop until upstream ships
        // typed options; per-layer mesh fragmentation is not
        // gameplay-blocking and our bake only produces 2 layers.
        await this.renderer.load(worldJson);
      } catch (error) {
        console.error("[scene] voxel load failed", error);
      }
    });
    this.loadChain = run.catch(() => undefined);
    return run;
  }
}
