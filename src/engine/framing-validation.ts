import { getPlatformBodyPosition } from "@engine/spatial-validation";
import type { Vec3 } from "@engine/types";
import type { RealmAnomaly, RealmClimb, RealmPlatform } from "@world/climber";
import {
  createRealmPlaythroughPlan,
  type RealmPlaythroughCheckpoint,
  type RealmPlaythroughPlan,
} from "@world/playthrough-plan";

export type RealmFramingIssueCode =
  | "missing-start-capture"
  | "missing-signal-capture"
  | "missing-goal-capture"
  | "look-target-too-close"
  | "next-platform-outside-frame"
  | "previous-platform-outside-frame"
  | "route-target-occluded"
  | "signal-capture-missing-anomaly"
  | "signal-anomaly-outside-frame"
  | "signal-anomaly-outside-scan-radius"
  | "signal-anomaly-occluded"
  | "goal-route-occluded";

export interface RealmFramingIssue {
  code: RealmFramingIssueCode;
  message: string;
  checkpointId?: string;
  platformId?: string;
  value?: number;
  limit?: number;
}

export interface RealmFramingMetrics {
  checkpointCount: number;
  captureCount: number;
  maximumNextPlatformAngle: number;
  maximumCaptureTargetAngle: number;
  minimumLookDistance: number;
  occludedViewCount: number;
}

export interface RealmFramingValidation {
  valid: boolean;
  issues: RealmFramingIssue[];
  metrics: RealmFramingMetrics;
}

const MAX_NEXT_PLATFORM_ANGLE_DEGREES = 42;
const MAX_CAPTURE_TARGET_ANGLE_DEGREES = 58;
const MIN_LOOK_DISTANCE = 1.2;

export function validateRealmFramingContract(
  realm: RealmClimb,
  plan: RealmPlaythroughPlan = createRealmPlaythroughPlan(realm)
): RealmFramingValidation {
  const issues: RealmFramingIssue[] = [];
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const anomalyById = new Map(realm.anomalies.map((anomaly) => [anomaly.id, anomaly]));
  let maximumNextPlatformAngle = 0;
  let maximumCaptureTargetAngle = 0;
  let minimumLookDistance = Number.POSITIVE_INFINITY;
  let occludedViewCount = 0;

  validateCaptureCoverage(plan, issues);

  for (const checkpoint of plan.checkpoints) {
    const view = getViewVector(checkpoint);
    minimumLookDistance = Math.min(minimumLookDistance, view.distance);

    if (view.distance < MIN_LOOK_DISTANCE) {
      issues.push({
        code: "look-target-too-close",
        message: "Checkpoint look target is too close to create a stable visual capture.",
        checkpointId: checkpoint.id,
        platformId: checkpoint.platformId,
        value: round(view.distance, 2),
        limit: MIN_LOOK_DISTANCE,
      });
    }

    const nextPlatform = platformById.get(realm.goldenPath[checkpoint.platformIndex + 1]);
    if (nextPlatform) {
      const angle = angleToTarget(
        checkpoint.cameraPosition,
        checkpoint.lookAt,
        getPlatformBodyPosition(nextPlatform)
      );

      if (checkpoint.capture !== "signal") {
        maximumNextPlatformAngle = Math.max(maximumNextPlatformAngle, angle);
      }

      if (checkpoint.capture !== "signal" && angle > MAX_NEXT_PLATFORM_ANGLE_DEGREES) {
        issues.push({
          code: "next-platform-outside-frame",
          message: "Checkpoint camera is not facing the next golden-path platform.",
          checkpointId: checkpoint.id,
          platformId: nextPlatform.id,
          value: round(angle, 2),
          limit: MAX_NEXT_PLATFORM_ANGLE_DEGREES,
        });
      }

      if (checkpoint.capture !== "signal") {
        const blocker = findLineOfSightBlocker(
          checkpoint.cameraPosition,
          checkpoint.lookAt,
          realm.platforms,
          new Set([checkpoint.platformId, nextPlatform.id])
        );

        if (blocker) {
          occludedViewCount += 1;
          issues.push({
            code: "route-target-occluded",
            message: "Checkpoint camera has a blocked line of sight to the next route target.",
            checkpointId: checkpoint.id,
            platformId: blocker.id,
          });
        }
      }
    } else {
      const previousPlatform = platformById.get(realm.goldenPath[checkpoint.platformIndex - 1]);
      if (previousPlatform) {
        const angle = angleToTarget(
          checkpoint.cameraPosition,
          checkpoint.lookAt,
          getPlatformBodyPosition(previousPlatform)
        );
        maximumCaptureTargetAngle = Math.max(maximumCaptureTargetAngle, angle);

        if (checkpoint.capture === "goal" && angle > MAX_CAPTURE_TARGET_ANGLE_DEGREES) {
          issues.push({
            code: "previous-platform-outside-frame",
            message: "Goal capture should look back over the solved route.",
            checkpointId: checkpoint.id,
            platformId: previousPlatform.id,
            value: round(angle, 2),
            limit: MAX_CAPTURE_TARGET_ANGLE_DEGREES,
          });
        }

        if (checkpoint.capture === "goal") {
          const blocker = findLineOfSightBlocker(
            checkpoint.cameraPosition,
            checkpoint.lookAt,
            realm.platforms,
            new Set([checkpoint.platformId, previousPlatform.id])
          );

          if (blocker) {
            occludedViewCount += 1;
            issues.push({
              code: "goal-route-occluded",
              message: "Goal capture has a blocked look-back line over the solved route.",
              checkpointId: checkpoint.id,
              platformId: blocker.id,
            });
          }
        }
      }
    }

    if (checkpoint.capture === "signal") {
      const signalAngle = validateSignalCapture(checkpoint, anomalyById, realm.platforms, issues);
      maximumCaptureTargetAngle = Math.max(maximumCaptureTargetAngle, signalAngle);
      if (issues.at(-1)?.code === "signal-anomaly-occluded") {
        occludedViewCount += 1;
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    metrics: {
      checkpointCount: plan.checkpointCount,
      captureCount: plan.checkpoints.filter((checkpoint) => Boolean(checkpoint.capture)).length,
      maximumNextPlatformAngle: round(maximumNextPlatformAngle, 2),
      maximumCaptureTargetAngle: round(maximumCaptureTargetAngle, 2),
      minimumLookDistance: Number.isFinite(minimumLookDistance) ? round(minimumLookDistance, 2) : 0,
      occludedViewCount,
    },
  };
}

function validateCaptureCoverage(plan: RealmPlaythroughPlan, issues: RealmFramingIssue[]) {
  if (!plan.checkpoints.some((checkpoint) => checkpoint.capture === "route-start")) {
    issues.push({
      code: "missing-start-capture",
      message: "Playthrough plan must include a start capture.",
    });
  }

  if (!plan.checkpoints.some((checkpoint) => checkpoint.capture === "signal")) {
    issues.push({
      code: "missing-signal-capture",
      message: "Playthrough plan must include at least one signal capture.",
    });
  }

  if (!plan.checkpoints.some((checkpoint) => checkpoint.capture === "goal")) {
    issues.push({
      code: "missing-goal-capture",
      message: "Playthrough plan must include a goal capture.",
    });
  }
}

function validateSignalCapture(
  checkpoint: RealmPlaythroughCheckpoint,
  anomalyById: Map<string, RealmAnomaly>,
  platforms: RealmPlatform[],
  issues: RealmFramingIssue[]
) {
  const signal = checkpoint.anomalyIds
    .map((anomalyId) => anomalyById.get(anomalyId))
    .find((anomaly): anomaly is RealmAnomaly => Boolean(anomaly));

  if (!signal) {
    issues.push({
      code: "signal-capture-missing-anomaly",
      message: "Signal capture checkpoint does not reference a valid anomaly.",
      checkpointId: checkpoint.id,
      platformId: checkpoint.platformId,
    });
    return 0;
  }

  const angle = angleToTarget(checkpoint.cameraPosition, checkpoint.lookAt, signal.position);
  if (angle > MAX_CAPTURE_TARGET_ANGLE_DEGREES) {
    issues.push({
      code: "signal-anomaly-outside-frame",
      message: "Signal capture camera is not facing the anomaly closely enough.",
      checkpointId: checkpoint.id,
      platformId: checkpoint.platformId,
      value: round(angle, 2),
      limit: MAX_CAPTURE_TARGET_ANGLE_DEGREES,
    });
  }

  const distance = distance3d(checkpoint.position, signal.position);
  if (distance > signal.scanRadius) {
    issues.push({
      code: "signal-anomaly-outside-scan-radius",
      message: "Signal capture checkpoint is outside its anomaly scan radius.",
      checkpointId: checkpoint.id,
      platformId: checkpoint.platformId,
      value: round(distance, 2),
      limit: signal.scanRadius,
    });
  }

  const blocker = findLineOfSightBlocker(
    checkpoint.cameraPosition,
    signal.position,
    platforms,
    new Set([checkpoint.platformId])
  );

  if (blocker) {
    issues.push({
      code: "signal-anomaly-occluded",
      message: "Signal capture has a blocked line of sight to the framed anomaly.",
      checkpointId: checkpoint.id,
      platformId: blocker.id,
    });
  }

  return angle;
}

function getViewVector(checkpoint: RealmPlaythroughCheckpoint) {
  const vector = subtract(checkpoint.lookAt, checkpoint.cameraPosition);
  const distance = length(vector);

  return {
    distance,
    direction: distance > 0 ? scale(vector, 1 / distance) : { x: 0, y: 0, z: -1 },
  };
}

function angleToTarget(position: Vec3, lookAt: Vec3, target: Vec3) {
  const view = getViewVector({
    anomalyIds: [],
    expectedMinimumScanned: 0,
    expectedPathIndex: 0,
    id: "angle-probe",
    kind: "route",
    lookAt,
    lookTargetAnomalyId: null,
    lookTargetPlatformId: null,
    platformId: "probe",
    platformIndex: 0,
    cameraPosition: position,
    position,
  });
  const targetVector = subtract(target, position);
  const targetDistance = length(targetVector);
  if (targetDistance === 0) {
    return 0;
  }

  const targetDirection = scale(targetVector, 1 / targetDistance);
  const dot = clamp(dot3(view.direction, targetDirection), -1, 1);

  return (Math.acos(dot) * 180) / Math.PI;
}

function findLineOfSightBlocker(
  origin: Vec3,
  target: Vec3,
  platforms: RealmPlatform[],
  excludedPlatformIds: Set<string>
) {
  return (
    platforms.find((platform) => {
      if (excludedPlatformIds.has(platform.id)) {
        return false;
      }

      return segmentIntersectsPlatformAabb(origin, target, platform);
    }) ?? null
  );
}

function segmentIntersectsPlatformAabb(origin: Vec3, target: Vec3, platform: RealmPlatform) {
  const half = {
    x: platform.size.x / 2,
    y: platform.size.y / 2,
    z: platform.size.z / 2,
  };
  const min = {
    x: platform.position.x - half.x,
    y: platform.position.y - half.y,
    z: platform.position.z - half.z,
  };
  const max = {
    x: platform.position.x + half.x,
    y: platform.position.y + half.y,
    z: platform.position.z + half.z,
  };
  const direction = subtract(target, origin);
  let tMin = 0;
  let tMax = 1;

  for (const axis of ["x", "y", "z"] as const) {
    const delta = direction[axis];

    if (Math.abs(delta) < 0.0001) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) {
        return false;
      }
      continue;
    }

    const inverse = 1 / delta;
    const t1 = (min[axis] - origin[axis]) * inverse;
    const t2 = (max[axis] - origin[axis]) * inverse;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));

    if (tMin > tMax) {
      return false;
    }
  }

  return tMax > 0.001 && tMin < 0.999;
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function scale(vector: Vec3, amount: number): Vec3 {
  return {
    x: vector.x * amount,
    y: vector.y * amount,
    z: vector.z * amount,
  };
}

function length(vector: Vec3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function dot3(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function distance3d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
