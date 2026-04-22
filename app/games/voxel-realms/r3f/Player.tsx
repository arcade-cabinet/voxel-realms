import { CONFIG, type VoxelControls } from "@logic/games/voxel-realms/engine/types";
import {
  advanceVoxelState,
  calculateJumpVelocity,
  calculateMovementVelocity,
  classifyBiome,
  findNearestLandmarkDistance,
  getProceduralHeight,
} from "@logic/games/voxel-realms/engine/voxelSimulation";
import { VoxelTrait } from "@logic/games/voxel-realms/store/traits";
import { voxelEntity } from "@logic/games/voxel-realms/store/world";
import { useFrame, useThree } from "@react-three/fiber";
import { type RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface ChunkCoords {
  cx: number;
  cz: number;
}

export function Player({ onChunkChange }: { onChunkChange: (chunk: ChunkCoords) => void }) {
  const { camera } = useThree();
  const rbRef = useRef<RapierRigidBody>(null);
  const position = useRef(new THREE.Vector3(CONFIG.PLAYER_START.x, CONFIG.PLAYER_START.y, 0));
  const lastChunk = useRef<ChunkCoords>(
    toChunkCoords(CONFIG.PLAYER_START.x, CONFIG.PLAYER_START.z)
  );

  const movement = useRef<VoxelControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });

  useEffect(() => {
    camera.position.set(CONFIG.PLAYER_START.x, CONFIG.PLAYER_START.y + 0.75, CONFIG.PLAYER_START.z);
    camera.lookAt(0, 0.4, -12);
  }, [camera]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          movement.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          movement.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          movement.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          movement.current.right = true;
          break;
        case "Space":
          movement.current.jump = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          movement.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          movement.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          movement.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          movement.current.right = false;
          break;
        case "Space":
          movement.current.jump = false;
          break;
      }
    };

    const setMobileControl = (key: keyof VoxelControls, value: boolean) => {
      movement.current[key] = value;
    };
    const handleJump = () => {
      movement.current.jump = true;
    };
    const handleJoystickMove = (event: Event) => {
      const detail = (event as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      const x = detail.x ?? 0;
      const y = detail.y ?? 0;

      movement.current.forward = y < 0;
      movement.current.backward = y > 0;
      movement.current.left = x < 0;
      movement.current.right = x > 0;
    };
    const handleForwardStart = () => setMobileControl("forward", true);
    const handleForwardEnd = () => setMobileControl("forward", false);
    const handleLeftStart = () => setMobileControl("left", true);
    const handleLeftEnd = () => setMobileControl("left", false);
    const handleRightStart = () => setMobileControl("right", true);
    const handleRightEnd = () => setMobileControl("right", false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("voxel:forward-start", handleForwardStart);
    window.addEventListener("voxel:forward-end", handleForwardEnd);
    window.addEventListener("voxel:left-start", handleLeftStart);
    window.addEventListener("voxel:left-end", handleLeftEnd);
    window.addEventListener("voxel:right-start", handleRightStart);
    window.addEventListener("voxel:right-end", handleRightEnd);
    window.addEventListener("voxel:jump", handleJump);
    window.addEventListener("voxel:move", handleJoystickMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("voxel:forward-start", handleForwardStart);
      window.removeEventListener("voxel:forward-end", handleForwardEnd);
      window.removeEventListener("voxel:left-start", handleLeftStart);
      window.removeEventListener("voxel:left-end", handleLeftEnd);
      window.removeEventListener("voxel:right-start", handleRightStart);
      window.removeEventListener("voxel:right-end", handleRightEnd);
      window.removeEventListener("voxel:jump", handleJump);
      window.removeEventListener("voxel:move", handleJoystickMove);
    };
  }, []);

  useFrame((_state, _delta) => {
    if (!rbRef.current) return;

    const currentTrans = rbRef.current.translation();
    const currentVel = rbRef.current.linvel();
    position.current.set(currentTrans.x, currentTrans.y, currentTrans.z);

    const currentChunk = toChunkCoords(currentTrans.x, currentTrans.z);
    if (currentChunk.cx !== lastChunk.current.cx || currentChunk.cz !== lastChunk.current.cz) {
      lastChunk.current = currentChunk;
      onChunkChange(currentChunk);
    }

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const grounded = Math.abs(currentVel.y) < 0.08;
    const movementVelocity = calculateMovementVelocity(
      movement.current,
      cameraDirection,
      currentVel.y
    );
    rbRef.current.setLinvel(movementVelocity, true);

    if (movement.current.jump) {
      rbRef.current.setLinvel(calculateJumpVelocity(movementVelocity, grounded), true);
      movement.current.jump = false;
    }

    camera.position.copy(position.current);
    camera.position.y += 0.72;

    const state = voxelEntity.get(VoxelTrait);
    if (state?.phase === "playing") {
      const terrainHeight = getProceduralHeight(
        Math.floor(currentTrans.x),
        Math.floor(currentTrans.z)
      );
      voxelEntity.set(
        VoxelTrait,
        advanceVoxelState(state, _delta * 1000, {
          position: currentTrans,
          velocity: currentVel,
          grounded,
          biome: classifyBiome(terrainHeight),
          nearestLandmarkDistance: findNearestLandmarkDistance(currentTrans),
        })
      );
    }
  });

  return (
    <>
      <RigidBody
        ref={rbRef}
        mass={1}
        position={[CONFIG.PLAYER_START.x, CONFIG.PLAYER_START.y, CONFIG.PLAYER_START.z]}
        enabledRotations={[false, false, false]}
        colliders="ball"
      >
        <mesh visible={false}>
          <sphereGeometry args={[0.4]} />
          <meshBasicMaterial />
        </mesh>
      </RigidBody>
      <FirstPersonTool />
    </>
  );
}

function toChunkCoords(x: number, z: number): ChunkCoords {
  return {
    cx: Math.floor(x / CONFIG.CHUNK_SIZE),
    cz: Math.floor(z / CONFIG.CHUNK_SIZE),
  };
}

function FirstPersonTool() {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    const offset = new THREE.Vector3(0.45, -0.48, -0.9).applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(offset);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0.08, -0.04, 0.08]} rotation={[0.15, 0, -0.3]} castShadow>
        <boxGeometry args={[0.22, 0.24, 0.72]} />
        <meshStandardMaterial color="#6b4423" roughness={0.7} />
      </mesh>
      <mesh position={[0.08, 0.16, -0.24]} rotation={[0.16, 0, -0.3]} castShadow>
        <boxGeometry args={[0.54, 0.16, 0.22]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.25} roughness={0.32} />
      </mesh>
      <mesh position={[-0.2, 0.19, -0.24]} rotation={[0.16, 0, -0.3]} castShadow>
        <boxGeometry args={[0.14, 0.42, 0.2]} />
        <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.34} />
      </mesh>
      <pointLight color="#bae6fd" intensity={1.1} distance={3} />
    </group>
  );
}
