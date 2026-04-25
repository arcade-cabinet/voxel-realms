export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type BlockType =
  | "grass"
  | "dirt"
  | "stone"
  | "sand"
  | "water"
  | "snow"
  | "wood"
  | "leaves"
  | "ore";

export interface VoxelControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface VoxelTelemetry {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  biome: string;
  nearestLandmarkDistance: number;
}

export interface VoxelState {
  phase: "menu" | "playing" | "gameover";
  score: number;
  hp: number;
  maxHp: number;
  inventory: string[];
  biome: string;
  biomeDiscovery: { biome: string; elapsedMs: number } | null;
  lastPickup: { blockType: BlockType; elapsedMs: number; label: string } | null;
  objective: string;
  objectiveProgress: number;
  coordinates: Vec3;
  nearestLandmarkDistance: number;
  nearestResourceDistance: number;
  surveyPings: number;
  timeSurvived: number;
}

export interface SpawnBlock {
  id: string;
  position: [number, number, number];
  type: BlockType;
  color: string;
}

export interface ResourceNode {
  id: string;
  label: string;
  position: [number, number, number];
  blockType: BlockType;
  accent: string;
}

export interface RealmLandmark {
  id: string;
  label: string;
  position: [number, number, number];
  height: number;
  accent: string;
}

export interface SpawnCampLayout {
  blocks: SpawnBlock[];
  resources: ResourceNode[];
  landmarks: RealmLandmark[];
}

export const CONFIG = {
  CHUNK_SIZE: 16,
  WORLD_HEIGHT: 64,
  RENDER_DISTANCE: 2,
  PLAYER_START: { x: 0, y: 4, z: 0 },
  SPAWN_CLEAR_RADIUS: 18,
  MOVE_SPEED: 5.5,
  JUMP_SPEED: 6,
  FALL_DAMAGE_Y: -18,
  EXPLORATION_GOAL: 96,
  LANDMARK_RADIUS: 8,
};
