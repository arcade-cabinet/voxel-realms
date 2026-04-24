import { createSpawnCampLayout } from "@engine/voxel-simulation";
import { VoxelTrait } from "@store/traits";
import { voxelEntity } from "@store/world";
import { RigidBody } from "@react-three/rapier";
import { useTrait } from "koota/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

const RESOURCE_COLORS = {
  ore: "#b45309",
  water: "#0284c7",
  wood: "#6b4423",
  grass: "#4d7c0f",
  dirt: "#7c6a55",
  stone: "#64748b",
  sand: "#d6c06f",
  snow: "#e2e8f0",
  leaves: "#166534",
} as const;

export function SpawnCamp({ physicsEnabled = true }: { physicsEnabled?: boolean }) {
  const layout = useMemo(() => createSpawnCampLayout(), []);
  const state = useTrait(voxelEntity, VoxelTrait);
  const solidBlocks = layout.blocks.filter((block) => block.type !== "water");
  const waterBlocks = layout.blocks.filter((block) => block.type === "water");
  const recentPickup =
    state.lastPickup && state.timeSurvived - state.lastPickup.elapsedMs < 2_500
      ? state.lastPickup
      : null;

  return (
    <group>
      <MaybeRigidBody enabled={physicsEnabled}>
        {solidBlocks.map((block) => (
          <mesh key={block.id} position={block.position} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={block.color} roughness={0.88} />
          </mesh>
        ))}
      </MaybeRigidBody>

      {waterBlocks.map((block) => (
        <mesh key={block.id} position={block.position} receiveShadow>
          <boxGeometry args={[1, 0.82, 1]} />
          <meshStandardMaterial
            color={block.color}
            emissive="#075985"
            emissiveIntensity={0.08}
            roughness={0.42}
            transparent
            opacity={0.86}
          />
        </mesh>
      ))}

      {layout.resources.map((resource) => (
        <group key={resource.id} position={resource.position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.82, 0.82, 0.82]} />
            <meshStandardMaterial
              color={RESOURCE_COLORS[resource.blockType]}
              emissive={resource.accent}
              emissiveIntensity={0.18}
              roughness={0.75}
            />
          </mesh>
          <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.62, 0.035, 8, 28]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive={resource.accent}
              emissiveIntensity={1.25}
              toneMapped={false}
            />
          </mesh>
          <pointLight color={resource.accent} intensity={1.8} distance={8} />
          {recentPickup?.label === resource.label ? (
            <group>
              <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.9, 1.24, 48]} />
                <meshBasicMaterial color={resource.accent} transparent opacity={0.64} />
              </mesh>
              {[0, 1, 2, 3].map((index) => {
                const angle = (index / 4) * Math.PI * 2;
                return (
                  <mesh
                    key={`pickup-spark-${resource.id}-${index}`}
                    position={[Math.cos(angle) * 0.78, 1.05 + index * 0.12, Math.sin(angle) * 0.78]}
                  >
                    <boxGeometry args={[0.16, 0.16, 0.16]} />
                    <meshBasicMaterial color={resource.accent} transparent opacity={0.86} />
                  </mesh>
                );
              })}
            </group>
          ) : null}
        </group>
      ))}

      {layout.landmarks.map((landmark) => (
        <group key={landmark.id} position={landmark.position}>
          <MaybeRigidBody enabled={physicsEnabled}>
            <mesh position={[0, landmark.height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.55, landmark.height, 0.55]} />
              <meshStandardMaterial color="#334155" metalness={0.08} roughness={0.72} />
            </mesh>
          </MaybeRigidBody>
          <mesh position={[0, landmark.height + 0.55, 0]}>
            <octahedronGeometry args={[0.58, 0]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive={landmark.accent}
              emissiveIntensity={1.45}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.4, 1.55, 36]} />
            <meshBasicMaterial color={landmark.accent} transparent opacity={0.58} />
          </mesh>
          <pointLight
            color={landmark.accent}
            intensity={landmark.id === "north-beacon" ? 3.8 : 2.5}
            distance={landmark.id === "north-beacon" ? 24 : 16}
            position={[0, landmark.height + 0.6, 0]}
          />
        </group>
      ))}

      <group position={[0, -0.48, -6]}>
        {[-3, -2, -1, 0, 1, 2, 3].map((x) => (
          <mesh key={x} position={[x, 0, Math.abs(x) * -0.34]} receiveShadow>
            <boxGeometry args={[0.72, 0.1, 1.2]} />
            <meshStandardMaterial color="#c7b56f" roughness={0.82} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function MaybeRigidBody({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const content = <group>{children}</group>;

  return enabled ? (
    <RigidBody type="fixed" colliders="cuboid">
      {content}
    </RigidBody>
  ) : (
    content
  );
}
