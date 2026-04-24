import { CONFIG } from "@engine/types";
import {
  advanceVoxelState,
  calculateJumpVelocity,
  calculateMovementVelocity,
  clampVoxelFrameDeltaMs,
  classifyBiome,
  createInitialVoxelState,
  createSpawnCampLayout,
  findNearbyResource,
  findNearestLandmarkDistance,
  findNearestResourceDistance,
  generateChunkData,
  getProceduralHeight,
  VOXEL_SIM_MAX_FRAME_DELTA_MS,
} from "@engine/voxel-simulation";
import { describe, expect, test } from "vitest";

describe("voxel simulation", () => {
  test("creates a complete boot state for menu and play", () => {
    const state = createInitialVoxelState("playing");

    expect(state.phase).toBe("playing");
    expect(state.hp).toBe(state.maxHp);
    expect(state.coordinates).toEqual(CONFIG.PLAYER_START);
    expect(state.objective).toContain("Survey");
    expect(state.nearestResourceDistance).toBeGreaterThan(0);
    expect(state.surveyPings).toBe(0);
    expect(state.lastPickup).toBeNull();
    expect(state.biomeDiscovery).toBeNull();
  });

  test("keeps spawn camp layout deterministic and readable", () => {
    const layout = createSpawnCampLayout();
    const again = createSpawnCampLayout();

    expect(layout).toEqual(again);
    expect(layout.blocks).toHaveLength(86);
    expect(layout.resources.map((resource) => resource.id)).toEqual([
      "copper-outcrop",
      "sapwood-cache",
      "freshwater-marker",
    ]);
    expect(layout.landmarks.map((landmark) => landmark.id)).toEqual(["north-beacon", "ridge-gate"]);
  });

  test("generates deterministic terrain chunks with biomes and resources", () => {
    const chunk = generateChunkData(2, -1, CONFIG);
    const again = generateChunkData(2, -1, CONFIG);
    const distant = generateChunkData(3, -2, CONFIG);

    expect(chunk).toEqual(again);
    expect(chunk.blocks.length).toBeGreaterThan(CONFIG.CHUNK_SIZE * CONFIG.CHUNK_SIZE * 3);
    expect(new Set(chunk.blocks.map((block) => block.type)).size).toBeGreaterThan(2);
    expect(distant).not.toEqual(chunk);
    expect(getProceduralHeight(0, 0)).toBe(-1);
    expect(getProceduralHeight(-5, -17)).toBeGreaterThanOrEqual(-1);
    expect(getProceduralHeight(10, 0)).toBeGreaterThanOrEqual(1);
    expect(classifyBiome(getProceduralHeight(0, 0))).toBeTruthy();
  });

  test("calculates camera-relative movement and grounded jump velocity", () => {
    const move = calculateMovementVelocity(
      { forward: true, right: true },
      { x: 0, y: 0, z: -1 },
      -2
    );

    expect(move.x).toBeCloseTo(3.8891);
    expect(move.z).toBeCloseTo(-3.8891);
    expect(move.y).toBe(-2);
    expect(calculateJumpVelocity(move, true).y).toBe(CONFIG.JUMP_SPEED);
    expect(calculateJumpVelocity(move, false).y).toBe(-2);
  });

  test("advances survival telemetry and objective progress without mutating input", () => {
    const state = createInitialVoxelState("playing");
    const next = advanceVoxelState(state, 1_500, {
      position: { x: 36, y: 8, z: -48 },
      velocity: { x: 1, y: 0, z: -2 },
      grounded: true,
      biome: "greenwood",
      nearestLandmarkDistance: 4,
    });

    expect(next).not.toBe(state);
    expect(next.score).toBe(60);
    expect(next.objectiveProgress).toBeGreaterThan(40);
    expect(next.objective).toContain("Landmark");
    expect(next.biomeDiscovery).toEqual({
      biome: "greenwood",
      elapsedMs: 1_500,
    });
    expect(next.coordinates).toEqual({ x: 36, y: 8, z: -48 });
    expect(next.timeSurvived).toBe(1_500);
    expect(state.score).toBe(0);
  });

  test("clampVoxelFrameDeltaMs caps huge wall-clock deltas so the simulation is frame-rate independent", () => {
    expect(clampVoxelFrameDeltaMs(-5)).toBe(0);
    expect(clampVoxelFrameDeltaMs(0)).toBe(0);
    expect(clampVoxelFrameDeltaMs(16)).toBe(16);
    expect(clampVoxelFrameDeltaMs(VOXEL_SIM_MAX_FRAME_DELTA_MS)).toBe(VOXEL_SIM_MAX_FRAME_DELTA_MS);
    expect(clampVoxelFrameDeltaMs(500)).toBe(VOXEL_SIM_MAX_FRAME_DELTA_MS);
    expect(clampVoxelFrameDeltaMs(5_000)).toBe(VOXEL_SIM_MAX_FRAME_DELTA_MS);
  });

  test("finds nearest authored landmark and applies fall damage", () => {
    const distance = findNearestLandmarkDistance({ x: 0, y: 0, z: -9 });
    const state = createInitialVoxelState("playing");
    const fallen = advanceVoxelState(state, 100, {
      position: { x: 0, y: -22, z: 0 },
      velocity: { x: 0, y: -18, z: 0 },
      grounded: false,
      biome: "void shelf",
      nearestLandmarkDistance: 20,
    });

    expect(distance).toBeLessThan(2);
    expect(fallen.hp).toBe(16);
    expect(fallen.phase).toBe("playing");
  });

  test("surveys nearby authored resources into the expedition kit", () => {
    const layout = createSpawnCampLayout();
    const resource = layout.resources[0];
    const state = createInitialVoxelState("playing");
    const next = advanceVoxelState(state, 500, {
      position: {
        x: resource.position[0],
        y: resource.position[1],
        z: resource.position[2],
      },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      biome: "greenwood",
      nearestLandmarkDistance: 4,
    });

    expect(findNearbyResource(next.coordinates)?.id).toBe(resource.id);
    expect(findNearestResourceDistance(state.coordinates)).toBe(state.nearestResourceDistance);
    expect(next.inventory).toEqual([resource.label]);
    expect(next.lastPickup).toEqual({
      blockType: resource.blockType,
      elapsedMs: 500,
      label: resource.label,
    });
    expect(next.surveyPings).toBe(1);
    expect(next.nearestResourceDistance).toBeGreaterThanOrEqual(0);
    expect(next.objective).toContain(resource.label);
  });
});
