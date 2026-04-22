import { CONFIG } from "@logic/games/voxel-realms/engine/types";
import { PointerLockControls, Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useEffect, useMemo, useState } from "react";
import { type ChunkCoords, Player } from "./Player";
import { SpawnCamp } from "./SpawnCamp";
import { TerrainManager } from "./TerrainManager";

export function World({ interactive = true }: { interactive?: boolean }) {
  const [playerChunk, setPlayerChunk] = useState<ChunkCoords>(() => ({
    cx: Math.floor(CONFIG.PLAYER_START.x / CONFIG.CHUNK_SIZE),
    cz: Math.floor(CONFIG.PLAYER_START.z / CONFIG.CHUNK_SIZE),
  }));

  return (
    <>
      <color attach="background" args={["#8ecfe7"]} />
      <fog attach="fog" args={["#a8dced", 26, 118]} />
      <Sky sunPosition={[-52, 42, -78]} turbidity={3.8} rayleigh={0.82} mieCoefficient={0.006} />
      <BlockClouds />
      <OceanPlane />
      <DistantBlockRidges />
      <BiomeSilhouettes />
      <ambientLight intensity={0.42} color="#dff7ff" />
      <directionalLight
        castShadow
        position={[-54, 96, -72]}
        intensity={1.68}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight args={["#c7f3ff", "#31522c", 0.38]} />
      {interactive ? (
        <Physics gravity={[0, -15, 0]}>
          <Player onChunkChange={setPlayerChunk} />
          <TerrainManager playerChunk={playerChunk} physicsEnabled streamingEnabled />
          <SpawnCamp physicsEnabled />
        </Physics>
      ) : (
        <>
          <PreviewCamera />
          <TerrainManager
            playerChunk={playerChunk}
            physicsEnabled={false}
            streamingEnabled={false}
          />
          <SpawnCamp physicsEnabled={false} />
        </>
      )}
      {interactive ? <PointerLockControls /> : null}
    </>
  );
}

function BiomeSilhouettes() {
  const silhouettes = useMemo(
    () => [
      {
        key: "pine-a",
        position: [-28, 3, 18],
        scale: [2.4, 6.5, 2.4],
        color: "#1f6f42",
      },
      {
        key: "pine-b",
        position: [-23, 4.2, 23],
        scale: [2.8, 8.5, 2.8],
        color: "#265f39",
      },
      {
        key: "mesa-a",
        position: [30, 2.6, 14],
        scale: [5.6, 5.2, 4.2],
        color: "#b98f4c",
      },
      {
        key: "snow-a",
        position: [22, 5.2, 38],
        scale: [4.8, 8.4, 4.8],
        color: "#dcefff",
      },
    ],
    []
  );

  return (
    <group>
      {silhouettes.map((item) => (
        <mesh
          key={item.key}
          position={item.position as [number, number, number]}
          scale={item.scale as [number, number, number]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={item.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function PreviewCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(CONFIG.PLAYER_START.x, CONFIG.PLAYER_START.y + 0.75, CONFIG.PLAYER_START.z);
    camera.lookAt(0, 0.4, -12);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function BlockClouds() {
  const clouds = useMemo(
    () => [
      { position: [-24, 18, -26], scale: [8, 1.2, 2.6] },
      { position: [-18, 18.7, -25], scale: [4, 1, 2.2] },
      { position: [18, 16, -18], scale: [9, 1.3, 2.8] },
      { position: [25, 16.8, -17], scale: [4.5, 1, 2.2] },
      { position: [-12, 20, 28], scale: [10, 1.2, 3] },
      { position: [6, 22, 36], scale: [7, 1, 2.4] },
    ],
    []
  );

  return (
    <group>
      {clouds.map((cloud) => (
        <mesh
          key={cloud.position.join(",")}
          position={cloud.position as [number, number, number]}
          scale={cloud.scale as [number, number, number]}
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#f8fbff" roughness={0.95} transparent opacity={0.78} />
        </mesh>
      ))}
    </group>
  );
}

function OceanPlane() {
  return (
    <mesh position={[0, -0.42, -18]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[160, 110, 1, 1]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#075985"
        emissiveIntensity={0.16}
        roughness={0.38}
        metalness={0.05}
        transparent
        opacity={0.32}
      />
    </mesh>
  );
}

function DistantBlockRidges() {
  const blocks = useMemo(
    () => [
      ...createRidgeLine({
        key: "shore",
        z: -38,
        xStart: -46,
        count: 20,
        step: 4.8,
        heightOffset: 0,
      }),
      ...createRidgeLine({
        key: "inland",
        z: 46,
        xStart: -42,
        count: 18,
        step: 5,
        heightOffset: 1,
      }),
    ],
    []
  );

  return (
    <group>
      {blocks.map((block) => (
        <mesh key={block.key} position={block.position} scale={block.scale} receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={block.color} roughness={0.86} />
        </mesh>
      ))}
    </group>
  );
}

function createRidgeLine({
  key,
  z,
  xStart,
  count,
  step,
  heightOffset,
}: {
  key: string;
  z: number;
  xStart: number;
  count: number;
  step: number;
  heightOffset: number;
}) {
  return Array.from({ length: count }, (_, index) => {
    const x = xStart + index * step;
    const height = 2 + ((index * 7 + heightOffset) % 5);
    const palette = index % 5 === 0 ? "#d6c06f" : index % 3 === 0 ? "#47783a" : "#708090";

    return {
      key: `${key}-ridge-${index}`,
      position: [x, height / 2 - 1, z + (index % 3) * 3] as [number, number, number],
      scale: [4, height, 4] as [number, number, number],
      color: palette,
    };
  });
}
