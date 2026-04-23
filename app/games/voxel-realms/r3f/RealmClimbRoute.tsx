import { type RealmAgentRun, runRealmAgent } from "@logic/games/voxel-realms/engine/realmAgent";
import {
  getRealmAssetBudget,
  selectPreloadRealmModelPaths,
  selectRenderableRealmAnomalies,
} from "@logic/games/voxel-realms/engine/realmAssetBudget";
import type {
  RealmAnomaly,
  RealmAssetRef,
  RealmHazard,
  RealmPlatform,
  RealmRouteLink,
} from "@logic/games/voxel-realms/engine/realmClimber";
import { summarizeRealmExitGate } from "@logic/games/voxel-realms/engine/realmExitGate";
import { summarizeRealmRouteGuidance } from "@logic/games/voxel-realms/engine/realmRouteGuidance";
import { summarizeRealmSignalFocus } from "@logic/games/voxel-realms/engine/realmSignals";
import { RealmTrait } from "@logic/games/voxel-realms/store/traits";
import { voxelEntity } from "@logic/games/voxel-realms/store/world";
import { Clone, useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useTrait } from "koota/react";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";

const PRELOADED_REALM_MODEL_PATHS = new Set<string>();

export function RealmClimbRoute({ physicsEnabled }: { physicsEnabled: boolean }) {
  const realmState = useTrait(voxelEntity, RealmTrait);
  const realm = realmState.activeRealm;
  const agentRun = useMemo(() => runRealmAgent(realm), [realm]);
  const platformById = useMemo(
    () => new Map(realm.platforms.map((platform) => [platform.id, platform])),
    [realm.platforms]
  );
  const discoveredAnomalies = useMemo(
    () => new Set(realmState.discoveredAnomalies),
    [realmState.discoveredAnomalies]
  );
  const renderableAnomalies = useMemo(
    () =>
      new Map(
        selectRenderableRealmAnomalies(realm.anomalies, realmState.lastPlayerPosition).flatMap(
          (selection) =>
            selection.shouldRenderModel && selection.modelPublicPath
              ? [[selection.anomalyId, selection.modelPublicPath] as const]
              : []
        )
      ),
    [realm.anomalies, realmState.lastPlayerPosition]
  );
  const preloadModelPaths = useMemo(
    () => selectPreloadRealmModelPaths(realm.anomalies, realmState.lastPlayerPosition),
    [realm.anomalies, realmState.lastPlayerPosition]
  );
  const focusedAnomaly = useMemo(
    () =>
      realm.anomalies.find(
        (anomaly) =>
          anomaly.id === realmState.nearestAnomalyId && !discoveredAnomalies.has(anomaly.id)
      ) ?? null,
    [discoveredAnomalies, realm.anomalies, realmState.nearestAnomalyId]
  );
  const focusedSignal = focusedAnomaly
    ? summarizeRealmSignalFocus(realmState.nearestAnomalyDistance, focusedAnomaly.scanRadius)
    : null;
  const exitGate = summarizeRealmExitGate({
    discoveredAnomalyCount: realmState.discoveredAnomalies.length,
    extractionState: realmState.extractionState,
    instabilityLevel: realmState.instabilityLevel,
    accent: realm.archetype.accent,
  });
  const routeGuidance = useMemo(
    () => summarizeRealmRouteGuidance(realm, realmState.agentPathIndex),
    [realm, realmState.agentPathIndex]
  );

  useEffect(() => {
    for (const modelPath of preloadModelPaths) {
      if (PRELOADED_REALM_MODEL_PATHS.has(modelPath)) {
        continue;
      }

      useGLTF.preload(modelPath);
      PRELOADED_REALM_MODEL_PATHS.add(modelPath);
    }
  }, [preloadModelPaths]);

  return (
    <group name={`realm-climb-${realm.archetype.id}`}>
      {realm.links.map((link) => {
        const from = platformById.get(link.from);
        const to = platformById.get(link.to);

        return from && to ? (
          <RouteLinkBeam
            key={`${link.from}-${link.to}`}
            accent={realm.archetype.accent}
            active={link === routeGuidance.activeLink}
            activeHazardColor={
              link === routeGuidance.activeLink ? routeGuidance.activeHazard?.color : undefined
            }
            from={from}
            link={link}
            to={to}
          />
        ) : null;
      })}
      <AgentGhostPath accent={realm.archetype.accent} run={agentRun} />
      {realm.platforms.map((platform) => (
        <RealmPlatformMesh
          key={platform.id}
          platform={platform}
          physicsEnabled={physicsEnabled}
          routeAccent={realm.archetype.accent}
        />
      ))}
      {routeGuidance.nextPlatform ? (
        <NextPlatformBeacon
          accent={realm.archetype.accent}
          move={routeGuidance.move}
          platform={routeGuidance.nextPlatform}
        />
      ) : null}
      {realm.hazards.map((hazard) => (
        <HazardMarker
          key={hazard.id}
          active={hazard.id === routeGuidance.activeHazard?.id}
          hazard={hazard}
        />
      ))}
      {focusedAnomaly && focusedSignal ? (
        <FocusedSignalLink
          accent={realm.archetype.accent}
          anomaly={focusedAnomaly}
          focus={focusedSignal}
          playerPosition={realmState.lastPlayerPosition}
        />
      ) : null}
      {realm.anomalies.map((anomaly) => (
        <AnomalyMarker
          key={anomaly.id}
          accent={realm.archetype.accent}
          anomaly={anomaly}
          discovered={discoveredAnomalies.has(anomaly.id)}
          focus={anomaly.id === focusedAnomaly?.id ? focusedSignal : null}
          modelPath={renderableAnomalies.get(anomaly.id) ?? null}
        />
      ))}
      <ExitGate gate={exitGate} platform={platformById.get(realm.exitPlatformId)} />
    </group>
  );
}

function AgentGhostPath({ run, accent }: { run: RealmAgentRun; accent: string }) {
  const samples = useMemo(() => {
    const stride = Math.max(1, Math.ceil(run.samples.length / 42));

    return run.samples.filter(
      (sample, index) => index % stride === 0 || sample.state === "extracted"
    );
  }, [run.samples]);

  return (
    <group name="deterministic-agent-ghost">
      {samples.map((sample) => {
        const extracted = sample.state === "extracted";

        return (
          <mesh
            key={`${sample.elapsedMs}-${sample.platformId}-${sample.state}`}
            position={[sample.position.x, sample.position.y + 0.16, sample.position.z]}
            scale={extracted ? [0.34, 0.34, 0.34] : [0.16, 0.16, 0.16]}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
              color={extracted ? "#f8fafc" : accent}
              transparent
              opacity={extracted ? 0.92 : 0.36}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function RealmPlatformMesh({
  platform,
  physicsEnabled,
  routeAccent,
}: {
  platform: RealmPlatform;
  physicsEnabled: boolean;
  routeAccent: string;
}) {
  const isGate = platform.kind === "gate";
  const isStart = platform.kind === "start";
  const material = (
    <meshStandardMaterial
      color={platform.color}
      emissive={isGate || isStart ? routeAccent : "#000000"}
      emissiveIntensity={isGate ? 0.28 : isStart ? 0.14 : 0}
      roughness={0.82}
      metalness={isGate ? 0.08 : 0}
    />
  );

  if (physicsEnabled) {
    return (
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[platform.position.x, platform.position.y, platform.position.z]}
      >
        <mesh castShadow receiveShadow scale={[platform.size.x, platform.size.y, platform.size.z]}>
          <boxGeometry args={[1, 1, 1]} />
          {material}
        </mesh>
      </RigidBody>
    );
  }

  return (
    <mesh
      castShadow
      receiveShadow
      position={[platform.position.x, platform.position.y, platform.position.z]}
      scale={[platform.size.x, platform.size.y, platform.size.z]}
    >
      <boxGeometry args={[1, 1, 1]} />
      {material}
    </mesh>
  );
}

function RouteLinkBeam({
  accent,
  active,
  activeHazardColor,
  from,
  to,
  link,
}: {
  accent: string;
  active: boolean;
  activeHazardColor?: string;
  from: RealmPlatform;
  to: RealmPlatform;
  link: RealmRouteLink;
}) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(from.position.x, from.position.y + 0.72, from.position.z);
    const end = new THREE.Vector3(to.position.x, to.position.y + 0.72, to.position.z);
    const direction = end.clone().sub(start);
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const length = direction.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    return { midpoint, quaternion, length };
  }, [from, to]);
  const color = active
    ? (activeHazardColor ?? accent)
    : link.move === "jump"
      ? "#facc15"
      : link.move === "climb"
        ? "#38bdf8"
        : "#e2e8f0";
  const radius = activeHazardColor ? 0.09 : active ? 0.075 : 0.045;
  const opacity = activeHazardColor ? 0.82 : active ? 0.72 : 0.32;

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion}>
      <cylinderGeometry args={[radius, radius, transform.length, 6]} />
      <meshBasicMaterial color={color} depthWrite={false} transparent opacity={opacity} />
    </mesh>
  );
}

function NextPlatformBeacon({
  accent,
  move,
  platform,
}: {
  accent: string;
  move: ReturnType<typeof summarizeRealmRouteGuidance>["move"];
  platform: RealmPlatform;
}) {
  const color = move === "jump" ? "#facc15" : move === "drop" ? "#fb7185" : accent;
  const y = platform.position.y + platform.size.y / 2 + 0.22;
  const ringRadius = Math.max(1.15, Math.min(platform.size.x, platform.size.z) * 0.42);

  return (
    <group name="next-platform-beacon" position={[platform.position.x, y, platform.position.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius, 0.04, 8, 48]} />
        <meshBasicMaterial color={color} depthWrite={false} transparent opacity={0.74} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.35, 6]} />
        <meshBasicMaterial color={color} depthWrite={false} transparent opacity={0.42} />
      </mesh>
      <pointLight color={color} distance={5} intensity={0.8} />
    </group>
  );
}

function HazardMarker({ active, hazard }: { active: boolean; hazard: RealmHazard }) {
  const radius = active ? hazard.radius * 1.18 : hazard.radius;
  const opacity = active ? 0.68 : 0.42;

  return (
    <group position={[hazard.position.x, hazard.position.y, hazard.position.z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, active ? 0.09 : 0.06, 6, 18]} />
        <meshStandardMaterial
          color={hazard.color}
          emissive={hazard.color}
          emissiveIntensity={active ? 0.55 : 0.25}
        />
      </mesh>
      <mesh position={[0, 0.18, 0]} scale={[hazard.radius * 0.32, 0.18, hazard.radius * 0.32]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hazard.color} transparent opacity={opacity} />
      </mesh>
      {active ? <pointLight color={hazard.color} distance={5.5} intensity={1.1} /> : null}
    </group>
  );
}

function AnomalyMarker({
  anomaly,
  accent,
  discovered,
  focus,
  modelPath,
}: {
  anomaly: RealmAnomaly;
  accent: string;
  discovered: boolean;
  focus: ReturnType<typeof summarizeRealmSignalFocus> | null;
  modelPath: string | null;
}) {
  const budget = getRealmAssetBudget(anomaly.asset);
  const color = discovered ? "#f8fafc" : getAnomalyBudgetColor(budget.tier, accent);
  const markerScale = budget.tier === "deferred" ? 0.52 : budget.tier === "reference" ? 0.38 : 0.42;
  const showPromotedModel = Boolean(modelPath);

  return (
    <group position={[anomaly.position.x, anomaly.position.y, anomaly.position.z]}>
      {modelPath ? (
        <Suspense fallback={null}>
          <PromotedAnomalyModel
            asset={anomaly.asset}
            discovered={discovered}
            modelPath={modelPath}
          />
        </Suspense>
      ) : null}
      <mesh
        castShadow
        position={[0, showPromotedModel ? -0.62 : 0, 0]}
        scale={showPromotedModel ? 0.24 : markerScale}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={discovered ? 0.22 : showPromotedModel ? 0.55 : 0.36}
          roughness={0.48}
          metalness={0.12}
        />
      </mesh>
      {!budget.canLoadAtRuntime ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.035, 6, 18]} />
          <meshBasicMaterial color={color} transparent opacity={discovered ? 0.28 : 0.5} />
        </mesh>
      ) : null}
      {focus ? (
        <FocusedSignalRings color={color} focus={focus} scanRadius={anomaly.scanRadius} />
      ) : null}
      <pointLight color={color} intensity={discovered ? 0.45 : 1.2} distance={4.5} />
    </group>
  );
}

function FocusedSignalLink({
  anomaly,
  accent,
  focus,
  playerPosition,
}: {
  anomaly: RealmAnomaly;
  accent: string;
  focus: ReturnType<typeof summarizeRealmSignalFocus>;
  playerPosition: { x: number; y: number; z: number };
}) {
  const transform = useMemo(() => {
    const start = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.42, playerPosition.z);
    const end = new THREE.Vector3(anomaly.position.x, anomaly.position.y, anomaly.position.z);

    return createBeamTransform(start, end);
  }, [anomaly.position, playerPosition]);

  if (transform.length <= 0.001) {
    return null;
  }

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion}>
      <cylinderGeometry args={[0.028, 0.028, transform.length, 6]} />
      <meshBasicMaterial
        color={accent}
        depthWrite={false}
        transparent
        opacity={focus.tetherOpacity}
      />
    </mesh>
  );
}

function FocusedSignalRings({
  color,
  focus,
  scanRadius,
}: {
  color: string;
  focus: ReturnType<typeof summarizeRealmSignalFocus>;
  scanRadius: number;
}) {
  const ringRadius = Math.max(0.2, scanRadius * focus.ringScale);

  return (
    <group name="focused-signal-rings">
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[scanRadius, 0.028, 8, 40]} />
        <meshBasicMaterial color={color} depthWrite={false} transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ringRadius, 0.04, 8, 40]} />
        <meshBasicMaterial
          color={focus.inScanRange ? "#f8fafc" : color}
          depthWrite={false}
          transparent
          opacity={focus.inScanRange ? 0.68 : 0.42}
        />
      </mesh>
    </group>
  );
}

function PromotedAnomalyModel({
  asset,
  discovered,
  modelPath,
}: {
  asset: RealmAssetRef;
  discovered: boolean;
  modelPath: string;
}) {
  const gltf = useGLTF(modelPath);
  const transform = useMemo(() => getNormalizedModelTransform(gltf.scene), [gltf.scene]);

  return (
    <group
      name={`promoted-anomaly-${asset.id}`}
      position={transform.position}
      rotation={[0, transform.rotationY, 0]}
      scale={transform.scale}
    >
      <Clone
        object={gltf.scene}
        castShadow
        receiveShadow
        inject={
          discovered ? (
            <meshStandardMaterial color="#f8fafc" emissive="#bae6fd" emissiveIntensity={0.12} />
          ) : undefined
        }
      />
    </group>
  );
}

function getNormalizedModelTransform(scene: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(scene);

  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) {
    return {
      position: [0, -0.48, 0] as [number, number, number],
      rotationY: 0,
      scale: 1,
    };
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
  const scale = 1.18 / maxAxis;

  return {
    position: [-center.x * scale, -box.min.y * scale - 0.74, -center.z * scale] as [
      number,
      number,
      number,
    ],
    rotationY: Math.PI * 0.08,
    scale,
  };
}

function getAnomalyBudgetColor(
  tier: ReturnType<typeof getRealmAssetBudget>["tier"],
  accent: string
) {
  if (tier === "deferred") {
    return "#fb7185";
  }

  if (tier === "reference") {
    return "#94a3b8";
  }

  return accent;
}

function createBeamTransform(start: THREE.Vector3, end: THREE.Vector3) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const quaternion =
    length > 0.001
      ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
      : new THREE.Quaternion();

  return { midpoint, quaternion, length };
}

function ExitGate({
  platform,
  gate,
}: {
  platform?: RealmPlatform;
  gate: ReturnType<typeof summarizeRealmExitGate>;
}) {
  if (!platform) {
    return null;
  }

  const y = platform.position.y + platform.size.y / 2 + 1.55;
  const portalScale = gate.state === "open" ? [1.75, 2.35, 1] : [1.28, 1.78, 1];

  return (
    <group position={[platform.position.x, y, platform.position.z]}>
      <mesh position={[-1.2, 0, 0]} scale={[0.26, 2.9, 0.26]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={gate.color}
          emissive={gate.color}
          emissiveIntensity={gate.emissiveIntensity}
        />
      </mesh>
      <mesh position={[1.2, 0, 0]} scale={[0.26, 2.9, 0.26]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={gate.color}
          emissive={gate.color}
          emissiveIntensity={gate.emissiveIntensity}
        />
      </mesh>
      <mesh position={[0, 1.28, 0]} scale={[2.7, 0.26, 0.26]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={gate.color}
          emissive={gate.color}
          emissiveIntensity={gate.emissiveIntensity}
        />
      </mesh>
      <mesh position={[0, 0.02, -0.04]} scale={portalScale as [number, number, number]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={gate.color}
          depthWrite={false}
          transparent
          opacity={gate.portalOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.08, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[gate.state === "open" ? 1.45 : 1.05, 0.035, 8, 42]} />
        <meshBasicMaterial
          color={gate.color}
          depthWrite={false}
          transparent
          opacity={gate.ringOpacity}
        />
      </mesh>
    </group>
  );
}
