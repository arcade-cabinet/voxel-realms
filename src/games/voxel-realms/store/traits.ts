import { trait } from "koota";
import { createInitialVoxelState } from "../engine/voxelSimulation";

export const VoxelTrait = trait(() => createInitialVoxelState());
