import { PhaseTrait, ScoreTrait, TimerTrait } from "@logic/shared";
import { createWorld } from "koota";
import { VoxelTrait } from "./traits";

export const voxelWorld = createWorld();
export const voxelEntity = voxelWorld.spawn(
  PhaseTrait({ phase: "menu" }),
  ScoreTrait({ value: 0, label: "SCORE" }),
  TimerTrait({ elapsedMs: 0, remainingMs: 0, label: "TIME" }),
  VoxelTrait()
);
