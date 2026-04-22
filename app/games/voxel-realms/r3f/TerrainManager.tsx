import TerrainWorker from "@logic/games/voxel-realms/engine/TerrainWorker?worker";
import { CONFIG } from "@logic/games/voxel-realms/engine/types";
import {
  type BlockData,
  type ChunkData,
  generateChunkData,
} from "@logic/games/voxel-realms/engine/voxelSimulation";
import { InstancedRigidBodies } from "@react-three/rapier";
import type { MutableRefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ChunkCoords } from "./Player";

const MATERIALS: Record<
  string,
  {
    color: string;
    emissive?: string;
    emissiveIntensity?: number;
    opacity?: number;
    roughness?: number;
    metalness?: number;
  }
> = {
  grass: { color: "#5f9f3a", roughness: 0.92 },
  dirt: { color: "#7c5a3a", roughness: 0.96 },
  stone: { color: "#8b98a6", roughness: 0.84 },
  sand: { color: "#e7c86e", roughness: 0.9 },
  water: {
    color: "#2aa8f2",
    emissive: "#075985",
    emissiveIntensity: 0.18,
    opacity: 0.62,
    roughness: 0.38,
  },
  snow: { color: "#f8fafc", roughness: 0.74 },
  wood: { color: "#6b4423", roughness: 0.88 },
  leaves: { color: "#2f8f3a", roughness: 0.96 },
  ore: {
    color: "#c56a28",
    emissive: "#f59e0b",
    emissiveIntensity: 0.22,
    metalness: 0.18,
    roughness: 0.58,
  },
};

const isVitest =
  typeof window !== "undefined" &&
  (window as unknown as { __vitest_browser__?: boolean }).__vitest_browser__;

function InstancedBlocks({
  type,
  blocks,
  cx,
  cz,
  physicsEnabled,
}: {
  type: string;
  blocks: BlockData[];
  cx: number;
  cz: number;
  physicsEnabled: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const material = MATERIALS[type] ?? { color: "#ffffff", roughness: 0.8 };
  const shouldUsePhysics = physicsEnabled && !isVitest && type !== "water";

  const instances = useMemo(
    () =>
      blocks.map((block, index) => ({
        key: `${type}-${cx}-${cz}-${index}`,
        position: [
          cx * CONFIG.CHUNK_SIZE + block.x + 0.5,
          block.y + 0.5,
          cz * CONFIG.CHUNK_SIZE + block.z + 0.5,
        ] as [number, number, number],
      })),
    [blocks, cx, cz, type]
  );

  useEffect(() => {
    if (!shouldUsePhysics && meshRef.current) {
      const dummy = new THREE.Object3D();
      blocks.forEach((block, i) => {
        dummy.position.set(
          cx * CONFIG.CHUNK_SIZE + block.x + 0.5,
          block.y + 0.5,
          cz * CONFIG.CHUNK_SIZE + block.z + 0.5
        );
        dummy.updateMatrix();
        meshRef.current?.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [blocks, cx, cz, shouldUsePhysics]);

  return (
    <>
      {shouldUsePhysics && (
        <InstancedRigidBodies instances={instances} colliders="cuboid" type="fixed">
          <instancedMesh args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <VoxelBlockMaterial material={material} />
          </instancedMesh>
        </InstancedRigidBodies>
      )}
      {!shouldUsePhysics && (
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, blocks.length]}
          castShadow={type !== "water"}
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <VoxelBlockMaterial material={material} />
        </instancedMesh>
      )}
    </>
  );
}

function VoxelBlockMaterial({ material }: { material: (typeof MATERIALS)[string] }) {
  return (
    <meshStandardMaterial
      color={material.color}
      emissive={material.emissive}
      emissiveIntensity={material.emissiveIntensity ?? 0}
      metalness={material.metalness ?? 0}
      roughness={material.roughness ?? 0.82}
      transparent={material.opacity !== undefined}
      opacity={material.opacity ?? 1}
    />
  );
}

function Chunk({ data, physicsEnabled }: { data: ChunkData; physicsEnabled: boolean }) {
  const blocksByType = useMemo(() => {
    const grouped = new Map<string, BlockData[]>();
    data.blocks.forEach((block) => {
      const arr = grouped.get(block.type) || [];
      arr.push(block);
      grouped.set(block.type, arr);
    });
    return grouped;
  }, [data]);

  return (
    <group>
      {Array.from(blocksByType.entries()).map(([type, blocks]) => (
        <InstancedBlocks
          key={type}
          type={type}
          blocks={blocks}
          cx={data.cx}
          cz={data.cz}
          physicsEnabled={physicsEnabled}
        />
      ))}
    </group>
  );
}

export function TerrainManager({
  playerChunk,
  physicsEnabled,
  streamingEnabled,
}: {
  playerChunk: ChunkCoords;
  physicsEnabled: boolean;
  streamingEnabled: boolean;
}) {
  const initialChunks = useMemo(() => createInitialChunkRing(), []);
  const [chunks, setChunks] = useState<Map<string, ChunkData>>(initialChunks);
  const workerRef = useRef<Worker>(null);
  const requestedChunks = useRef<Set<string>>(new Set(initialChunks.keys()));
  const queuedChunks = useRef<Set<string>>(new Set());
  const streamQueue = useRef<Array<[number, number]>>([]);
  const streamingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!streamingEnabled) return undefined;

    workerRef.current = new TerrainWorker();

    workerRef.current.onmessage = (e) => {
      const data = e.data as ChunkData;
      const key = `${data.cx},${data.cz}`;
      setChunks((prev) => {
        const next = new Map(prev);
        next.set(key, data);
        return next;
      });
    };

    return () => {
      if (streamingTimer.current) {
        window.clearTimeout(streamingTimer.current);
      }
      workerRef.current?.terminate();
    };
  }, [streamingEnabled]);

  useEffect(() => {
    if (!streamingEnabled || !workerRef.current) return;

    const pCx = playerChunk.cx;
    const pCz = playerChunk.cz;

    const R = CONFIG.RENDER_DISTANCE;
    const currentVisibleKeys = new Set<string>();

    const pendingKeys: Array<[string, number, number, number]> = [];

    for (let cx = pCx - R; cx <= pCx + R; cx++) {
      for (let cz = pCz - R; cz <= pCz + R; cz++) {
        const key = `${cx},${cz}`;
        currentVisibleKeys.add(key);
        if (!requestedChunks.current.has(key) && !queuedChunks.current.has(key)) {
          queuedChunks.current.add(key);
          pendingKeys.push([key, cx, cz, Math.max(Math.abs(cx - pCx), Math.abs(cz - pCz))]);
        }
      }
    }

    streamChunkRequests({
      pendingKeys,
      worker: workerRef.current,
      timerRef: streamingTimer,
      queueRef: streamQueue,
      queuedRef: queuedChunks,
      requestedRef: requestedChunks,
    });

    setChunks((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const key of next.keys()) {
        if (!currentVisibleKeys.has(key)) {
          next.delete(key);
          requestedChunks.current.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [playerChunk.cx, playerChunk.cz, streamingEnabled]);

  return (
    <>
      {Array.from(chunks.values()).map((data) => (
        <Chunk key={`${data.cx},${data.cz}`} data={data} physicsEnabled={physicsEnabled} />
      ))}
    </>
  );
}

function createInitialChunkRing() {
  const chunks = new Map<string, ChunkData>();
  const pCx = Math.floor(CONFIG.PLAYER_START.x / CONFIG.CHUNK_SIZE);
  const pCz = Math.floor(CONFIG.PLAYER_START.z / CONFIG.CHUNK_SIZE);
  const radius = Math.min(CONFIG.RENDER_DISTANCE, 1);

  for (let cx = pCx - radius; cx <= pCx + radius; cx++) {
    for (let cz = pCz - radius; cz <= pCz + radius; cz++) {
      chunks.set(`${cx},${cz}`, generateChunkData(cx, cz, CONFIG));
    }
  }

  return chunks;
}

function streamChunkRequests({
  pendingKeys,
  worker,
  timerRef,
  queueRef,
  queuedRef,
  requestedRef,
}: {
  pendingKeys: Array<[string, number, number, number]>;
  worker: Worker;
  timerRef: MutableRefObject<number | null>;
  queueRef: MutableRefObject<Array<[number, number]>>;
  queuedRef: MutableRefObject<Set<string>>;
  requestedRef: MutableRefObject<Set<string>>;
}) {
  if (pendingKeys.length === 0) return;

  queueRef.current.push(
    ...pendingKeys.sort((a, b) => a[3] - b[3]).map(([, cx, cz]) => [cx, cz] as [number, number])
  );

  if (timerRef.current) return;

  const sendNext = () => {
    const next = queueRef.current.shift();

    if (!next) {
      timerRef.current = null;
      return;
    }

    const [cx, cz] = next;
    const key = `${cx},${cz}`;
    queuedRef.current.delete(key);
    requestedRef.current.add(key);
    worker.postMessage({ cx, cz, config: CONFIG });
    timerRef.current = window.setTimeout(sendNext, 32);
  };

  timerRef.current = window.setTimeout(sendNext, 250);
}
