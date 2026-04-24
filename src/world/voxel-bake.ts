/**
 * Pure bake: RealmClimb → Jolly Pixel VoxelWorldJSON.
 *
 * No runtime dependencies — this module is testable in Node and
 * produces deterministic output from the deterministic realm
 * generator. The JP scene layer consumes the result and feeds it
 * into VoxelRenderer.load().
 *
 * Design:
 *  - One "terrain" layer that holds all platform voxels.
 *  - One "hazards" layer that holds hazard markers (kept as separate
 *    voxels so they can be tinted or swapped without touching the
 *    terrain mesh).
 *  - Block definitions are embedded so the output is self-contained.
 *  - Block ID 1 = platform cube, 2 = hazard cube. Air is 0 (implicit).
 *  - Coordinates are rounded to integer voxel space; platforms are
 *    rendered as axis-aligned cubic "bricks" at their bounding box.
 */

// We depend on JP's exported types only. No value imports — keeps this
// module tree-shakeable and Node-testable.
import type {
  BlockDefinition,
  VoxelEntryKey,
  VoxelLayerJSON,
  VoxelWorldJSON,
} from "@jolly-pixel/voxel.renderer";
import type { RealmClimb, RealmHazard, RealmPlatform } from "@world/climber";

/** Primary tileset id used for both layers. Scene loader resolves the actual PNG. */
export const BAKED_TILESET_ID = "realm-primary";

/** Chunk size chosen to cover a typical realm platform stack in one chunk. */
export const BAKED_CHUNK_SIZE = 16;

/** Block ID reserved for platform voxels. Stays stable across bakes. */
export const PLATFORM_BLOCK_ID = 1;

/** Block ID reserved for hazard marker voxels. */
export const HAZARD_BLOCK_ID = 2;

/** Shared block definitions embedded with every bake. */
export const BAKED_BLOCKS: BlockDefinition[] = [
  {
    id: PLATFORM_BLOCK_ID,
    name: "platform",
    shapeId: "cube",
    faceTextures: {},
    defaultTexture: { tilesetId: BAKED_TILESET_ID, col: 0, row: 0 },
    collidable: true,
  },
  {
    id: HAZARD_BLOCK_ID,
    name: "hazard",
    shapeId: "cube",
    faceTextures: {},
    defaultTexture: { tilesetId: BAKED_TILESET_ID, col: 1, row: 0 },
    collidable: false,
  },
];

interface BakeOptions {
  /** Voxel scale factor. 1 voxel = scale world units. Keep at 1 for parity. */
  scale?: number;
}

/**
 * Bake a deterministic RealmClimb into a JP VoxelWorldJSON.
 *
 * Same seed → same bake.
 */
export function bakeRealmVoxels(realm: RealmClimb, options: BakeOptions = {}): VoxelWorldJSON {
  const scale = options.scale ?? 1;
  const terrainVoxels: Record<VoxelEntryKey, { block: number; transform: number }> = {};
  const hazardVoxels: Record<VoxelEntryKey, { block: number; transform: number }> = {};

  for (const platform of realm.platforms) {
    addPlatformVoxels(platform, scale, terrainVoxels);
  }
  for (const hazard of realm.hazards) {
    addHazardVoxels(hazard, scale, hazardVoxels);
  }

  const layers: VoxelLayerJSON[] = [
    {
      id: "terrain",
      name: "terrain",
      visible: true,
      order: 0,
      voxels: terrainVoxels,
    },
    {
      id: "hazards",
      name: "hazards",
      visible: true,
      order: 1,
      voxels: hazardVoxels,
    },
  ];

  return {
    version: 1,
    chunkSize: BAKED_CHUNK_SIZE,
    tilesets: [
      {
        id: BAKED_TILESET_ID,
        src: `assets/tilesets/${BAKED_TILESET_ID}.png`,
        tileSize: 32,
      },
    ],
    blocks: BAKED_BLOCKS,
    layers,
  };
}

function addPlatformVoxels(
  platform: RealmPlatform,
  scale: number,
  out: Record<VoxelEntryKey, { block: number; transform: number }>
): void {
  const halfX = Math.max(1, Math.round((platform.size.x * scale) / 2));
  const halfY = Math.max(1, Math.round((platform.size.y * scale) / 2));
  const halfZ = Math.max(1, Math.round((platform.size.z * scale) / 2));
  const cx = Math.round(platform.position.x * scale);
  const cy = Math.round(platform.position.y * scale);
  const cz = Math.round(platform.position.z * scale);

  for (let dx = -halfX; dx < halfX; dx++) {
    for (let dy = -halfY; dy < halfY; dy++) {
      for (let dz = -halfZ; dz < halfZ; dz++) {
        const key: VoxelEntryKey = `${cx + dx},${cy + dy},${cz + dz}`;
        out[key] = { block: PLATFORM_BLOCK_ID, transform: 0 };
      }
    }
  }
}

function addHazardVoxels(
  hazard: RealmHazard,
  scale: number,
  out: Record<VoxelEntryKey, { block: number; transform: number }>
): void {
  // Single marker voxel at hazard center. Scene layer handles visual feedback
  // (glow, oscillation) via a behavior — no need to bake motion into voxels.
  const x = Math.round(hazard.position.x * scale);
  const y = Math.round(hazard.position.y * scale);
  const z = Math.round(hazard.position.z * scale);
  const key: VoxelEntryKey = `${x},${y},${z}`;
  out[key] = { block: HAZARD_BLOCK_ID, transform: 0 };
}
