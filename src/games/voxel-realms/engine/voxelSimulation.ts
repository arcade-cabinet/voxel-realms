import type {
  BlockType,
  SpawnCampLayout,
  Vec3,
  VoxelControls,
  VoxelState,
  VoxelTelemetry,
} from "./types";
import { CONFIG } from "./types";

export interface ChunkConfig {
  CHUNK_SIZE: number;
  WORLD_HEIGHT: number;
  RENDER_DISTANCE: number;
}

export interface BlockData {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export interface ChunkData {
  cx: number;
  cz: number;
  blocks: BlockData[];
}

const DEFAULT_OBJECTIVE =
  "Survey the shore, mark the beacon, and gather enough ore to stabilize camp.";

const DEFAULT_CONTROLS: VoxelControls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
};

export function createInitialVoxelState(phase: VoxelState["phase"] = "menu"): VoxelState {
  return {
    phase,
    score: 0,
    hp: 20,
    maxHp: 20,
    inventory: [],
    biome: "shoreline",
    biomeDiscovery: null,
    lastPickup: null,
    objective: DEFAULT_OBJECTIVE,
    objectiveProgress: 0,
    coordinates: { ...CONFIG.PLAYER_START },
    nearestLandmarkDistance: 10,
    nearestResourceDistance: findNearestResourceDistance(CONFIG.PLAYER_START),
    surveyPings: 0,
    timeSurvived: 0,
  };
}

export function normalizeVoxelControls(input: Partial<VoxelControls> = {}): VoxelControls {
  return {
    ...DEFAULT_CONTROLS,
    ...input,
  };
}

export function createSpawnCampLayout(): SpawnCampLayout {
  const padPattern = [
    [-2, -1, -2, "stone", "#64748b"],
    [-1, -1, -2, "grass", "#5f8f3a"],
    [0, -1, -2, "grass", "#6ea545"],
    [1, -1, -2, "grass", "#5f8f3a"],
    [2, -1, -2, "stone", "#64748b"],
    [-2, -1, -1, "grass", "#5f8f3a"],
    [-1, -1, -1, "dirt", "#7c6a55"],
    [0, -1, -1, "grass", "#8bbf55"],
    [1, -1, -1, "dirt", "#7c6a55"],
    [2, -1, -1, "grass", "#5f8f3a"],
    [-2, -1, 0, "grass", "#6ea545"],
    [-1, -1, 0, "grass", "#8bbf55"],
    [0, -1, 0, "stone", "#94a3b8"],
    [1, -1, 0, "grass", "#8bbf55"],
    [2, -1, 0, "grass", "#6ea545"],
    [-2, -1, 1, "grass", "#4f7f35"],
    [-1, -1, 1, "dirt", "#7c6a55"],
    [0, -1, 1, "grass", "#6ea545"],
    [1, -1, 1, "dirt", "#7c6a55"],
    [2, -1, 1, "grass", "#4f7f35"],
    [-2, -1, 2, "stone", "#64748b"],
    [-1, -1, 2, "grass", "#4f7f35"],
    [0, -1, 2, "grass", "#5f8f3a"],
    [1, -1, 2, "grass", "#4f7f35"],
    [2, -1, 2, "stone", "#64748b"],
    [0, -2, 0, "stone", "#475569"],
  ] as const;
  const shorelinePattern = Array.from({ length: 15 }, (_, index) => index - 7).flatMap((x) => [
    [x, -1, -3, "sand", "#d6c06f"],
    [x, -1, -4, "sand", "#c9b765"],
    [x, -1, -5, "water", "#0284c7"],
    [x, -1, -6, "water", "#0369a1"],
  ]) as Array<readonly [number, number, number, BlockType, string]>;

  return {
    blocks: [...padPattern, ...shorelinePattern].map(([x, y, z, type, color], index) => ({
      id: `spawn-pad-${index + 1}`,
      position: [x, y, z],
      type,
      color,
    })),
    resources: [
      {
        id: "copper-outcrop",
        label: "Copper",
        position: [-4.5, 0.2, -5],
        blockType: "ore",
        accent: "#f59e0b",
      },
      {
        id: "sapwood-cache",
        label: "Sapwood",
        position: [4.5, 0.5, -4],
        blockType: "wood",
        accent: "#84cc16",
      },
      {
        id: "freshwater-marker",
        label: "Water",
        position: [-5.5, -0.35, 2.5],
        blockType: "water",
        accent: "#38bdf8",
      },
    ],
    landmarks: [
      {
        id: "north-beacon",
        label: "North Beacon",
        position: [0, 0, -10],
        height: 4.5,
        accent: "#38bdf8",
      },
      {
        id: "ridge-gate",
        label: "Ridge Gate",
        position: [9, 0, -15],
        height: 5.5,
        accent: "#a3e635",
      },
    ],
  };
}

export const VOXEL_SIM_MAX_FRAME_DELTA_MS = 50;

export function clampVoxelFrameDeltaMs(deltaMs: number) {
  return Math.min(VOXEL_SIM_MAX_FRAME_DELTA_MS, Math.max(0, deltaMs));
}

export function advanceVoxelState(
  state: VoxelState,
  deltaMs: number,
  telemetry: VoxelTelemetry
): VoxelState {
  if (state.phase !== "playing") {
    return state;
  }

  const distanceScore = Math.floor(Math.hypot(telemetry.position.x, telemetry.position.z));
  const score = Math.max(state.score, distanceScore);
  const nearbyResource = findNearbyResource(telemetry.position, state.inventory);
  const inventory = nearbyResource ? [...state.inventory, nearbyResource.label] : state.inventory;
  const nextTimeSurvived = state.timeSurvived + Math.max(0, deltaMs);
  const objectiveProgress = calculateObjectiveProgress(telemetry.position, score, inventory.length);
  const fallDamage = telemetry.position.y < CONFIG.FALL_DAMAGE_Y ? 4 : 0;
  const hp = Math.max(0, state.hp - fallDamage);
  const nearestResourceDistance = findNearestResourceDistance(telemetry.position, inventory);
  const biomeDiscovery =
    telemetry.biome !== state.biome
      ? { biome: telemetry.biome, elapsedMs: nextTimeSurvived }
      : state.biomeDiscovery && nextTimeSurvived - state.biomeDiscovery.elapsedMs < 3_000
        ? state.biomeDiscovery
        : null;
  const lastPickup = nearbyResource
    ? {
        blockType: nearbyResource.blockType,
        elapsedMs: nextTimeSurvived,
        label: nearbyResource.label,
      }
    : state.lastPickup && nextTimeSurvived - state.lastPickup.elapsedMs < 2_500
      ? state.lastPickup
      : null;

  return {
    ...state,
    phase: hp <= 0 ? "gameover" : state.phase,
    score,
    hp,
    biome: telemetry.biome,
    biomeDiscovery,
    inventory,
    lastPickup,
    objective: describeObjective(objectiveProgress, telemetry, nearbyResource?.label),
    objectiveProgress,
    coordinates: {
      x: round(telemetry.position.x, 1),
      y: round(telemetry.position.y, 1),
      z: round(telemetry.position.z, 1),
    },
    nearestLandmarkDistance: round(telemetry.nearestLandmarkDistance, 1),
    nearestResourceDistance: round(nearestResourceDistance, 1),
    surveyPings: state.surveyPings + (nearbyResource ? 1 : 0),
    timeSurvived: nextTimeSurvived,
  };
}

export function calculateMovementVelocity(
  input: Partial<VoxelControls>,
  cameraForward: Vec3,
  currentYVelocity: number
): Vec3 {
  const controls = normalizeVoxelControls(input);
  const forward = normalizeFlat(cameraForward);
  const right = normalizeFlat({ x: -forward.z, y: 0, z: forward.x });
  const direction = { x: 0, y: 0, z: 0 };

  if (controls.forward) addTo(direction, forward, 1);
  if (controls.backward) addTo(direction, forward, -1);
  if (controls.right) addTo(direction, right, 1);
  if (controls.left) addTo(direction, right, -1);

  const normalized = normalizeFlat(direction);

  return {
    x: round(normalized.x * CONFIG.MOVE_SPEED, 4),
    y: currentYVelocity,
    z: round(normalized.z * CONFIG.MOVE_SPEED, 4),
  };
}

export function calculateJumpVelocity(currentVelocity: Vec3, grounded: boolean): Vec3 {
  return grounded
    ? { x: currentVelocity.x, y: CONFIG.JUMP_SPEED, z: currentVelocity.z }
    : { ...currentVelocity };
}

export function calculateObjectiveProgress(
  position: Vec3,
  score: number,
  inventoryCount = 0
): number {
  const distanceProgress = Math.min(score / CONFIG.EXPLORATION_GOAL, 1) * 70;
  const altitudeProgress = Math.min(Math.max(position.y, 0) / 18, 1) * 30;
  const resourceProgress = Math.min(inventoryCount * 6, 18);

  return clamp(Math.round(distanceProgress + altitudeProgress + resourceProgress), 0, 100);
}

export function classifyBiome(height: number): string {
  if (height < -1) return "tidal shallows";
  if (height <= 0) return "sandbar";
  if (height > 11) return "snow ridge";
  if (height > 5) return "stone highland";
  return "greenwood";
}

export function getProceduralHeight(x: number, z: number): number {
  const spawnDistance = Math.hypot(x, z);
  if (spawnDistance < CONFIG.SPAWN_CLEAR_RADIUS) {
    if (spawnDistance < 5) return -1;

    const ringProgress = (spawnDistance - 5) / Math.max(1, CONFIG.SPAWN_CLEAR_RADIUS - 5);
    const islandRise = Math.sin(ringProgress * Math.PI) * 2.4;
    const shorelineBias = z < -5 ? -1.2 : z < -1 ? -0.35 : 0.15;
    const detail = Math.sin(x * 0.34) * 0.45 + Math.cos(z * 0.29) * 0.38;

    return Math.max(-1, Math.floor(shorelineBias + islandRise + detail));
  }

  const ridge = valueNoise(x * 0.025, z * 0.025, 11) * 19;
  const detail = valueNoise(x * 0.09 + 20, z * 0.09 - 8, 23) * 4.5;
  const mountain = valueNoise(x * 0.008 - 40, z * 0.008 + 17, 47);
  const terraceBlend = valueNoise(x * 0.04 + 3, z * 0.04 - 5, 71) * 0.5 + 0.5;
  const elevation = ridge + detail + Math.max(0, mountain - 0.38) * 58;
  const terrace = Math.floor(elevation / 3) * 3;

  return Math.floor(elevation * (1 - terraceBlend) + terrace * terraceBlend);
}

export function generateChunkData(cx: number, cz: number, config: ChunkConfig): ChunkData {
  const blocks: BlockData[] = [];

  for (let lx = 0; lx < config.CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < config.CHUNK_SIZE; lz++) {
      const wx = cx * config.CHUNK_SIZE + lx;
      const wz = cz * config.CHUNK_SIZE + lz;
      const wy = getProceduralHeight(wx, wz);
      const surfaceType = pickSurfaceBlock(wy);

      if (wy < -1) {
        blocks.push({ x: lx, y: -1, z: lz, type: "water" });
        blocks.push({ x: lx, y: wy, z: lz, type: "sand" });
      } else {
        blocks.push({ x: lx, y: wy, z: lz, type: surfaceType });
      }

      blocks.push({ x: lx, y: wy - 1, z: lz, type: wy <= 0 ? "sand" : "dirt" });

      for (let depth = wy - 2; depth > wy - 4; depth--) {
        blocks.push({ x: lx, y: depth, z: lz, type: "stone" });
      }

      if (shouldPlaceTree(wx, wz, wy)) {
        blocks.push(...createTreeBlocks(lx, wy, lz, config.CHUNK_SIZE));
      }

      if (shouldPlaceOre(wx, wz, wy)) {
        blocks.push({ x: lx, y: wy - 1, z: lz, type: "ore" });
      }
    }
  }

  return { cx, cz, blocks };
}

export function findNearestLandmarkDistance(position: Vec3, layout = createSpawnCampLayout()) {
  return layout.landmarks.reduce((nearest, landmark) => {
    const [x, y, z] = landmark.position;
    const distance = Math.hypot(position.x - x, position.y - y, position.z - z);
    return Math.min(nearest, distance);
  }, Number.POSITIVE_INFINITY);
}

export function findNearestResourceDistance(
  position: Vec3,
  inventory: string[] = [],
  layout = createSpawnCampLayout()
) {
  const distances = layout.resources
    .filter((resource) => !inventory.includes(resource.label))
    .map((resource) => {
      const [x, y, z] = resource.position;
      return Math.hypot(position.x - x, position.y - y, position.z - z);
    });

  return distances.length > 0 ? Math.min(...distances) : 0;
}

export function findNearbyResource(
  position: Vec3,
  inventory: string[] = [],
  layout = createSpawnCampLayout()
) {
  return layout.resources.find((resource) => {
    if (inventory.includes(resource.label)) return false;
    const [x, y, z] = resource.position;
    return Math.hypot(position.x - x, position.y - y, position.z - z) <= 2.8;
  });
}

function pickSurfaceBlock(height: number): BlockType {
  if (height < -1) return "water";
  if (height <= 0) return "sand";
  if (height > 11) return "snow";
  if (height > 5) return "stone";
  return "grass";
}

function shouldPlaceTree(x: number, z: number, height: number): boolean {
  if (height <= 0 || height > 7) return false;

  return hash2d(x, z, 101) > 0.965;
}

function shouldPlaceOre(x: number, z: number, height: number): boolean {
  if (height < 2) return false;

  return hash2d(x, z, 211) > 0.988;
}

function createTreeBlocks(x: number, surfaceY: number, z: number, chunkSize: number): BlockData[] {
  const blocks: BlockData[] = [
    { x, y: surfaceY + 1, z, type: "wood" },
    { x, y: surfaceY + 2, z, type: "wood" },
    { x, y: surfaceY + 3, z, type: "wood" },
    { x, y: surfaceY + 4, z, type: "leaves" },
  ];

  const crownOffsets = [
    [-1, 3, 0],
    [1, 3, 0],
    [0, 3, -1],
    [0, 3, 1],
    [-1, 4, 0],
    [1, 4, 0],
    [0, 4, -1],
    [0, 4, 1],
    [0, 5, 0],
  ] as const;

  for (const [dx, dy, dz] of crownOffsets) {
    const lx = x + dx;
    const lz = z + dz;

    if (lx >= 0 && lx < chunkSize && lz >= 0 && lz < chunkSize) {
      blocks.push({ x: lx, y: surfaceY + dy, z: lz, type: "leaves" });
    }
  }

  return blocks;
}

function describeObjective(
  progress: number,
  telemetry: VoxelTelemetry,
  collectedResource?: string
): string {
  if (collectedResource) {
    return `${collectedResource} logged in the survey kit. Keep mapping the route beyond camp.`;
  }

  if (telemetry.position.y < CONFIG.FALL_DAMAGE_Y + 5) {
    return "Climb back to stable blocks before the realm consumes your signal.";
  }

  if (telemetry.nearestLandmarkDistance <= CONFIG.LANDMARK_RADIUS) {
    return "Landmark registered. Push outward and map the next ridge.";
  }

  if (progress >= 80) {
    return "Survey nearly complete. Hold altitude and confirm a route home.";
  }

  if (progress >= 42) {
    return "Camp is stable. Track resources between shore, forest, and ridge.";
  }

  return DEFAULT_OBJECTIVE;
}

function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const xf = smoothstep(x - x0);
  const zf = smoothstep(z - z0);
  const a = hash2d(x0, z0, seed);
  const b = hash2d(x0 + 1, z0, seed);
  const c = hash2d(x0, z0 + 1, seed);
  const d = hash2d(x0 + 1, z0 + 1, seed);
  const top = lerp(a, b, xf);
  const bottom = lerp(c, d, xf);

  return lerp(top, bottom, zf) * 2 - 1;
}

function hash2d(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalizeFlat(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.z);

  if (length <= Number.EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: vector.x / length,
    y: 0,
    z: vector.z / length,
  };
}

function addTo(target: Vec3, vector: Vec3, scalar: number) {
  target.x += vector.x * scalar;
  target.z += vector.z * scalar;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
