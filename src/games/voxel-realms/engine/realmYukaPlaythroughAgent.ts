import { FollowPathBehavior, OnPathBehavior, Path, Vehicle, Vector3 as YukaVector3 } from "yuka";
import type {
  RealmPlaythroughCapture,
  RealmPlaythroughCheckpoint,
  RealmPlaythroughPlan,
} from "./realmPlaythroughPlan";
import type { Vec3 } from "./types";

export interface RealmYukaPlaythroughOptions {
  fixedStepMs: number;
  maxSegmentMs: number;
  maxSpeed: number;
  maxForce: number;
  nextWaypointDistance: number;
  landingRadius: number;
  pathRadius: number;
  predictionFactor: number;
}

export interface RealmYukaPlaythroughFrame {
  elapsedMs: number;
  position: Vec3;
  lookAt: Vec3;
  targetCheckpointId: string;
  targetPlatformId: string;
  targetCheckpointIndex: number;
  distanceToTarget: number;
  landed: boolean;
  capture?: RealmPlaythroughCapture;
}

export interface RealmYukaPlaythroughIssue {
  code: "empty-plan" | "segment-timeout" | "goal-not-reached";
  message: string;
  from?: string;
  to?: string;
  value?: number;
  limit?: number;
}

export interface RealmYukaPlaythroughRun {
  valid: boolean;
  frames: RealmYukaPlaythroughFrame[];
  landedFrames: RealmYukaPlaythroughFrame[];
  issues: RealmYukaPlaythroughIssue[];
  totalDurationMs: number;
  maximumSegmentDurationMs: number;
  maximumLandingDistance: number;
  finalDistanceToGoal: number;
}

export const DEFAULT_REALM_YUKA_PLAYTHROUGH_OPTIONS: RealmYukaPlaythroughOptions = {
  fixedStepMs: 66,
  maxSegmentMs: 4_200,
  maxSpeed: 7.25,
  maxForce: 42,
  nextWaypointDistance: 0.45,
  landingRadius: 0.32,
  pathRadius: 0.75,
  predictionFactor: 1.4,
};

export function createYukaRealmPlaythroughRun(
  plan: RealmPlaythroughPlan,
  options: RealmYukaPlaythroughOptions = DEFAULT_REALM_YUKA_PLAYTHROUGH_OPTIONS
): RealmYukaPlaythroughRun {
  const issues: RealmYukaPlaythroughIssue[] = [];
  const frames: RealmYukaPlaythroughFrame[] = [];
  let elapsedMs = 0;
  let maximumSegmentDurationMs = 0;
  let maximumLandingDistance = 0;

  if (plan.checkpoints.length === 0) {
    return {
      valid: false,
      frames,
      landedFrames: [],
      issues: [
        {
          code: "empty-plan",
          message: "Yuka playthrough needs at least one checkpoint.",
        },
      ],
      totalDurationMs: 0,
      maximumSegmentDurationMs: 0,
      maximumLandingDistance: Number.POSITIVE_INFINITY,
      finalDistanceToGoal: Number.POSITIVE_INFINITY,
    };
  }

  frames.push(createLandedFrame(plan.checkpoints[0], elapsedMs, 0));

  for (let index = 1; index < plan.checkpoints.length; index++) {
    const from = plan.checkpoints[index - 1];
    const to = plan.checkpoints[index];
    const segment = followSegmentWithYuka(from, to, elapsedMs, options);

    maximumSegmentDurationMs = Math.max(maximumSegmentDurationMs, segment.durationMs);
    elapsedMs += segment.durationMs;
    frames.push(...segment.frames);
    maximumLandingDistance = Math.max(maximumLandingDistance, segment.finalDistance);

    if (!segment.reached) {
      issues.push({
        code: "segment-timeout",
        message: "Yuka agent did not reach the next golden-path checkpoint in time.",
        from: from.platformId,
        to: to.platformId,
        value: segment.durationMs,
        limit: options.maxSegmentMs,
      });
      break;
    }

    frames.push(createLandedFrame(to, elapsedMs, segment.finalDistance));
  }

  const goal = plan.checkpoints.at(-1);
  const finalFrame = frames.at(-1);
  const finalDistanceToGoal =
    goal && finalFrame ? distance3d(finalFrame.position, goal.position) : Infinity;

  if (goal && finalDistanceToGoal > options.landingRadius) {
    issues.push({
      code: "goal-not-reached",
      message: "Yuka playthrough did not end inside the goal checkpoint radius.",
      to: goal.platformId,
      value: round(finalDistanceToGoal, 3),
      limit: options.landingRadius,
    });
  }

  return {
    valid: issues.length === 0,
    frames,
    landedFrames: frames.filter((frame) => frame.landed),
    issues,
    totalDurationMs: elapsedMs,
    maximumSegmentDurationMs,
    maximumLandingDistance: round(maximumLandingDistance, 3),
    finalDistanceToGoal: round(finalDistanceToGoal, 3),
  };
}

interface YukaSegmentRun {
  frames: RealmYukaPlaythroughFrame[];
  reached: boolean;
  durationMs: number;
  finalDistance: number;
}

function followSegmentWithYuka(
  from: RealmPlaythroughCheckpoint,
  to: RealmPlaythroughCheckpoint,
  startElapsedMs: number,
  options: RealmYukaPlaythroughOptions
): YukaSegmentRun {
  const path = new Path();
  path.add(toYukaVector(from.position));
  path.add(toYukaVector(to.position));
  path.add(toYukaVector(extendBeyondTarget(from.position, to.position, 0.75)));

  const vehicle = new Vehicle();
  vehicle.position.copy(toYukaVector(from.position));
  vehicle.maxSpeed = options.maxSpeed;
  vehicle.maxForce = options.maxForce;
  vehicle.mass = 1;
  vehicle.updateOrientation = true;
  vehicle.steering.add(new FollowPathBehavior(path, options.nextWaypointDistance));
  vehicle.steering.add(new OnPathBehavior(path, options.pathRadius, options.predictionFactor));

  const frames: RealmYukaPlaythroughFrame[] = [];
  const deltaSeconds = options.fixedStepMs / 1000;
  let durationMs = 0;
  let finalDistance = distance3d(from.position, to.position);

  while (durationMs < options.maxSegmentMs) {
    durationMs += options.fixedStepMs;
    vehicle.update(deltaSeconds);

    const position = roundVec3(fromYukaVector(vehicle.position), 3);
    finalDistance = distance3d(position, to.position);
    frames.push({
      elapsedMs: startElapsedMs + durationMs,
      position,
      lookAt: to.lookAt,
      targetCheckpointId: to.id,
      targetPlatformId: to.platformId,
      targetCheckpointIndex: to.platformIndex,
      distanceToTarget: round(finalDistance, 3),
      landed: false,
    });

    if (finalDistance <= options.landingRadius) {
      return {
        frames,
        reached: true,
        durationMs,
        finalDistance,
      };
    }
  }

  return {
    frames,
    reached: false,
    durationMs,
    finalDistance,
  };
}

function createLandedFrame(
  checkpoint: RealmPlaythroughCheckpoint,
  elapsedMs: number,
  distanceToTarget: number
): RealmYukaPlaythroughFrame {
  return {
    elapsedMs,
    position: checkpoint.position,
    lookAt: checkpoint.lookAt,
    targetCheckpointId: checkpoint.id,
    targetPlatformId: checkpoint.platformId,
    targetCheckpointIndex: checkpoint.platformIndex,
    distanceToTarget: round(distanceToTarget, 3),
    landed: true,
    capture: checkpoint.capture,
  };
}

function toYukaVector(vector: Vec3) {
  return new YukaVector3(vector.x, vector.y, vector.z);
}

function fromYukaVector(vector: YukaVector3): Vec3 {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function extendBeyondTarget(from: Vec3, to: Vec3, distance: number): Vec3 {
  const segmentLength = Math.max(0.001, distance3d(from, to));

  return {
    x: to.x + ((to.x - from.x) / segmentLength) * distance,
    y: to.y + ((to.y - from.y) / segmentLength) * distance,
    z: to.z + ((to.z - from.z) / segmentLength) * distance,
  };
}

function roundVec3(vector: Vec3, precision: number): Vec3 {
  return {
    x: round(vector.x, precision),
    y: round(vector.y, precision),
    z: round(vector.z, precision),
  };
}

function distance3d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
