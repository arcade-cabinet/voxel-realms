import type { RealmAnomaly, RealmClimb, RealmPlatform } from "./realmClimber";
import { getPlatformBodyPosition } from "./realmSpatialValidation";
import type { Vec3 } from "./types";

export type RealmPlaythroughCheckpointKind = "start" | "route" | "signal" | "goal";
export type RealmPlaythroughCapture = "route-start" | "signal" | "goal";

export interface RealmPlaythroughCheckpoint {
  id: string;
  platformId: string;
  platformIndex: number;
  kind: RealmPlaythroughCheckpointKind;
  position: Vec3;
  cameraPosition: Vec3;
  lookAt: Vec3;
  lookTargetPlatformId: string | null;
  lookTargetAnomalyId: string | null;
  expectedPathIndex: number;
  expectedMinimumScanned: number;
  capture?: RealmPlaythroughCapture;
  anomalyIds: string[];
}

export interface RealmPlaythroughPlan {
  realmSeed: string;
  archetypeId: string;
  startPlatformId: string;
  exitPlatformId: string;
  checkpointCount: number;
  expectedScannedAnomalies: number;
  checkpoints: RealmPlaythroughCheckpoint[];
}

export function createRealmPlaythroughPlan(realm: RealmClimb): RealmPlaythroughPlan {
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const anomaliesByPlatform = groupAnomaliesByPlatform(realm.anomalies);
  const scanned = new Set<string>();
  let firstSignalCaptured = false;

  const checkpoints = realm.goldenPath.map((platformId, index) => {
    const platform = requirePlatform(platformById, platformId);
    const nextPlatform = platformById.get(realm.goldenPath[index + 1]);
    const previousPlatform = platformById.get(realm.goldenPath[index - 1]);
    const platformAnomalies = anomaliesByPlatform.get(platformId) ?? [];
    const newlyScanned = platformAnomalies.filter((anomaly) =>
      isCheckpointInsideScanRadius(platform, anomaly)
    );

    for (const anomaly of newlyScanned) {
      scanned.add(anomaly.id);
    }

    const isStart = index === 0;
    const isGoal = platformId === realm.exitPlatformId;
    const isSignal = newlyScanned.length > 0 && !isGoal;
    const kind: RealmPlaythroughCheckpointKind = isStart
      ? "start"
      : isGoal
        ? "goal"
        : isSignal
          ? "signal"
          : "route";
    const capture = getCheckpointCapture(kind, firstSignalCaptured);

    if (capture === "signal") {
      firstSignalCaptured = true;
    }
    const position = getPlatformBodyPosition(platform);
    const cameraPosition = getCheckpointCameraPosition(position);
    const signalTarget = capture === "signal" ? newlyScanned[0] : undefined;
    const lookTargetPlatform = signalTarget ? undefined : (nextPlatform ?? previousPlatform);
    const lookAt =
      capture === "signal" && signalTarget
        ? extendLookTarget(cameraPosition, signalTarget.position, 2.4)
        : getLookAtTarget(cameraPosition, platform, lookTargetPlatform);

    return {
      id: `${platformId}-checkpoint`,
      platformId,
      platformIndex: index,
      kind,
      position,
      cameraPosition,
      lookAt,
      lookTargetPlatformId: lookTargetPlatform?.id ?? null,
      lookTargetAnomalyId: signalTarget?.id ?? null,
      expectedPathIndex: index,
      expectedMinimumScanned: scanned.size,
      capture,
      anomalyIds: newlyScanned.map((anomaly) => anomaly.id),
    };
  });

  return {
    realmSeed: realm.seed,
    archetypeId: realm.archetype.id,
    startPlatformId: realm.startPlatformId,
    exitPlatformId: realm.exitPlatformId,
    checkpointCount: checkpoints.length,
    expectedScannedAnomalies: scanned.size,
    checkpoints,
  };
}

function getCheckpointCapture(
  kind: RealmPlaythroughCheckpointKind,
  firstSignalCaptured: boolean
): RealmPlaythroughCapture | undefined {
  if (kind === "start") {
    return "route-start";
  }

  if (kind === "signal" && !firstSignalCaptured) {
    return "signal";
  }

  if (kind === "goal") {
    return "goal";
  }

  return undefined;
}

export function getCheckpointCameraPosition(position: Vec3): Vec3 {
  return {
    x: position.x,
    y: round(position.y + 0.72, 3),
    z: position.z,
  };
}

function getLookAtTarget(
  cameraPosition: Vec3,
  platform: RealmPlatform,
  targetPlatform: RealmPlatform | undefined
): Vec3 {
  if (targetPlatform) {
    const target = getPlatformBodyPosition(targetPlatform);

    return {
      x: target.x,
      y: cameraPosition.y,
      z: target.z,
    };
  }

  return {
    x: platform.position.x,
    y: cameraPosition.y,
    z: platform.position.z - 8,
  };
}

function isCheckpointInsideScanRadius(platform: RealmPlatform, anomaly: RealmAnomaly) {
  return distance3d(getPlatformBodyPosition(platform), anomaly.position) <= anomaly.scanRadius;
}

function extendLookTarget(from: Vec3, target: Vec3, minimumDistance: number): Vec3 {
  const delta = {
    x: target.x - from.x,
    y: target.y - from.y,
    z: target.z - from.z,
  };
  const distance = Math.max(0.001, distance3d(from, target));
  const scale = Math.max(1, minimumDistance / distance);

  return {
    x: round(from.x + delta.x * scale, 3),
    y: round(from.y + delta.y * scale, 3),
    z: round(from.z + delta.z * scale, 3),
  };
}

function groupAnomaliesByPlatform(anomalies: RealmAnomaly[]) {
  const grouped = new Map<string, RealmAnomaly[]>();

  for (const anomaly of anomalies) {
    const platformAnomalies = grouped.get(anomaly.platformId) ?? [];
    platformAnomalies.push(anomaly);
    grouped.set(anomaly.platformId, platformAnomalies);
  }

  return grouped;
}

function requirePlatform(platformById: Map<string, RealmPlatform>, platformId: string) {
  const platform = platformById.get(platformId);
  if (!platform) {
    throw new Error(`Missing golden-path platform ${platformId}.`);
  }

  return platform;
}

function distance3d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
