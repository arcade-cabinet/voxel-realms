import {
  evaluateRealmProgress,
  type RealmClimb,
  type RealmProgressEvaluation,
} from "./realmClimber";
import { evaluateRealmHazardExposure, evaluateRealmInstability } from "./realmInstability";
import type { RealmYukaPlaythroughFrame } from "./realmYukaPlaythroughAgent";

export type RealmRuntimeTelemetryIssueCode =
  | "empty-frames"
  | "target-index-regressed"
  | "path-index-regressed"
  | "landed-frame-path-mismatch"
  | "objective-progress-regressed"
  | "missing-expected-scan"
  | "extraction-before-goal-segment"
  | "goal-not-extracted"
  | "realm-collapsed";

export interface RealmRuntimeTelemetryIssue {
  code: RealmRuntimeTelemetryIssueCode;
  message: string;
  frameIndex?: number;
  value?: number;
  limit?: number;
  platformId?: string;
}

export interface RealmRuntimeTelemetrySample {
  frameIndex: number;
  elapsedMs: number;
  targetCheckpointIndex: number;
  landed: boolean;
  pathIndex: number;
  maxPathIndex: number;
  scannedAnomalyCount: number;
  objectiveProgress: number;
  extractionReady: boolean;
  instabilityRemaining: number;
  instabilityRatio: number;
  hazardActive: boolean;
}

export interface RealmRuntimeTelemetryOptions {
  expectedMinimumScans: number;
  finalCheckpointIndex: number;
}

export interface RealmRuntimeTelemetryValidation {
  valid: boolean;
  issues: RealmRuntimeTelemetryIssue[];
  frameCount: number;
  finalPathIndex: number;
  maximumPathIndex: number;
  maximumTargetCheckpointIndex: number;
  discoveredAnomalyIds: string[];
  extractionFrameCount: number;
  firstExtractionFrameIndex: number | null;
  minimumInstabilityRemaining: number;
  minimumInstabilityRatio: number;
  hazardExposureMs: number;
  pathRegressionCount: number;
  targetRegressionCount: number;
  objectiveRegressionCount: number;
  samples: RealmRuntimeTelemetrySample[];
}

export function validateRealmRuntimeTelemetry(
  realm: RealmClimb,
  frames: RealmYukaPlaythroughFrame[],
  options: RealmRuntimeTelemetryOptions
): RealmRuntimeTelemetryValidation {
  const issues: RealmRuntimeTelemetryIssue[] = [];
  const discoveredAnomalyIds: string[] = [];
  const samples: RealmRuntimeTelemetrySample[] = [];
  let previousPathIndex = 0;
  let previousTargetCheckpointIndex = 0;
  let previousObjectiveProgress = 0;
  let previousElapsedMs = 0;
  let maximumPathIndex = 0;
  let maximumTargetCheckpointIndex = 0;
  let extractionFrameCount = 0;
  let firstExtractionFrameIndex: number | null = null;
  let minimumInstabilityRemaining = Number.POSITIVE_INFINITY;
  let minimumInstabilityRatio = Number.POSITIVE_INFINITY;
  let hazardExposureMs = 0;
  let pathRegressionCount = 0;
  let targetRegressionCount = 0;
  let objectiveRegressionCount = 0;
  let finalProgress: RealmProgressEvaluation | null = null;

  if (frames.length === 0) {
    issues.push({
      code: "empty-frames",
      message: "Runtime telemetry validation needs at least one playthrough frame.",
    });
  }

  frames.forEach((frame, frameIndex) => {
    const progress = evaluateRealmProgress(realm, frame.position, discoveredAnomalyIds);
    const nextDiscoveredAnomalyIds = progress.scannedAnomaly
      ? addUnique(discoveredAnomalyIds, progress.scannedAnomaly.id)
      : discoveredAnomalyIds;
    const deltaMs = Math.max(0, frame.elapsedMs - previousElapsedMs);
    const hazard = evaluateRealmHazardExposure(realm, frame.position);
    hazardExposureMs += hazard.activeHazard ? deltaMs : 0;
    const instability = evaluateRealmInstability({
      realm,
      position: frame.position,
      elapsedMs: frame.elapsedMs,
      discoveredAnomalyCount: nextDiscoveredAnomalyIds.length,
      hazardExposureMs,
    });

    if (progress.pathIndex < previousPathIndex) {
      pathRegressionCount += 1;
      issues.push({
        code: "path-index-regressed",
        message: "Runtime path index moved backward during the playthrough.",
        frameIndex,
        value: progress.pathIndex,
        limit: previousPathIndex,
      });
    }

    if (frame.targetCheckpointIndex < previousTargetCheckpointIndex) {
      targetRegressionCount += 1;
      issues.push({
        code: "target-index-regressed",
        message: "Yuka target checkpoint index moved backward during the playthrough.",
        frameIndex,
        value: frame.targetCheckpointIndex,
        limit: previousTargetCheckpointIndex,
      });
    }

    if (frame.landed && progress.pathIndex !== frame.targetCheckpointIndex) {
      issues.push({
        code: "landed-frame-path-mismatch",
        message: "A landed Yuka frame did not resolve to its target golden-path index.",
        frameIndex,
        platformId: frame.targetPlatformId,
        value: progress.pathIndex,
        limit: frame.targetCheckpointIndex,
      });
    }

    if (progress.objectiveProgress < previousObjectiveProgress) {
      objectiveRegressionCount += 1;
      issues.push({
        code: "objective-progress-regressed",
        message: "Objective progress moved backward during runtime telemetry replay.",
        frameIndex,
        value: progress.objectiveProgress,
        limit: previousObjectiveProgress,
      });
    }

    if (progress.extractionReady) {
      extractionFrameCount += 1;
      firstExtractionFrameIndex ??= frameIndex;

      if (frame.targetCheckpointIndex < options.finalCheckpointIndex) {
        issues.push({
          code: "extraction-before-goal-segment",
          message: "Runtime extraction became ready before the final route segment.",
          frameIndex,
          value: frame.targetCheckpointIndex,
          limit: options.finalCheckpointIndex,
        });
      }
    }

    if (instability.level === "collapsed") {
      issues.push({
        code: "realm-collapsed",
        message: "Runtime telemetry entered the collapsed instability state before extraction.",
        frameIndex,
        value: instability.remaining,
        limit: 0,
      });
    }

    discoveredAnomalyIds.splice(0, discoveredAnomalyIds.length, ...nextDiscoveredAnomalyIds);
    previousPathIndex = progress.pathIndex;
    previousTargetCheckpointIndex = frame.targetCheckpointIndex;
    previousObjectiveProgress = progress.objectiveProgress;
    previousElapsedMs = frame.elapsedMs;
    maximumPathIndex = Math.max(maximumPathIndex, progress.pathIndex);
    maximumTargetCheckpointIndex = Math.max(
      maximumTargetCheckpointIndex,
      frame.targetCheckpointIndex
    );
    minimumInstabilityRemaining = Math.min(minimumInstabilityRemaining, instability.remaining);
    minimumInstabilityRatio = Math.min(minimumInstabilityRatio, instability.ratio);
    finalProgress = progress;

    samples.push({
      frameIndex,
      elapsedMs: frame.elapsedMs,
      targetCheckpointIndex: frame.targetCheckpointIndex,
      landed: frame.landed,
      pathIndex: progress.pathIndex,
      maxPathIndex: maximumPathIndex,
      scannedAnomalyCount: discoveredAnomalyIds.length,
      objectiveProgress: progress.objectiveProgress,
      extractionReady: progress.extractionReady,
      instabilityRemaining: instability.remaining,
      instabilityRatio: instability.ratio,
      hazardActive: Boolean(hazard.activeHazard),
    });
  });

  if (discoveredAnomalyIds.length < options.expectedMinimumScans) {
    issues.push({
      code: "missing-expected-scan",
      message: "Runtime telemetry did not scan the expected number of route anomalies.",
      value: discoveredAnomalyIds.length,
      limit: options.expectedMinimumScans,
    });
  }

  if (frames.length > 0 && !finalProgress?.extractionReady) {
    issues.push({
      code: "goal-not-extracted",
      message: "Final runtime telemetry frame did not reach extraction-ready state.",
      frameIndex: frames.length - 1,
      value: finalProgress?.pathIndex ?? 0,
      limit: options.finalCheckpointIndex,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    frameCount: frames.length,
    finalPathIndex: finalProgress?.pathIndex ?? 0,
    maximumPathIndex,
    maximumTargetCheckpointIndex,
    discoveredAnomalyIds,
    extractionFrameCount,
    firstExtractionFrameIndex,
    minimumInstabilityRemaining: roundFinite(minimumInstabilityRemaining, 2),
    minimumInstabilityRatio: roundFinite(minimumInstabilityRatio, 3),
    hazardExposureMs,
    pathRegressionCount,
    targetRegressionCount,
    objectiveRegressionCount,
    samples,
  };
}

function addUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

function roundFinite(value: number, precision: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
