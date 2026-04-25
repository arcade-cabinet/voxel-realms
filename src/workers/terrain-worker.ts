import {
  type BlockData,
  type ChunkConfig,
  type ChunkData,
  generateChunkData,
} from "@engine/voxel-simulation";

export type { BlockData, ChunkConfig, ChunkData };

self.onmessage = (event: MessageEvent<{ cx: number; cz: number; config: ChunkConfig }>) => {
  const { cx, cz, config } = event.data;

  self.postMessage(generateChunkData(cx, cz, config));
};
