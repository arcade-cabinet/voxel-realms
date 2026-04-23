import { runRealmAgent } from "./realmAgent";
import {
  canLoadRealmAssetAtRuntime,
  type GoldenPathIssue,
  generateRealmClimb,
  REALM_ARCHETYPE_IDS,
  type RealmArchetypeId,
  type RealmClimb,
  type RealmMovementEnvelope,
  type RealmRouteMove,
} from "./realmClimber";
import { type RealmFramingIssue, validateRealmFramingContract } from "./realmFramingValidation";
import { type RealmPathfindingIssue, validateRealmPathfindingContract } from "./realmPathfinding";
import { createRealmPlaythroughPlan } from "./realmPlaythroughPlan";
import {
  type RealmRuntimeTelemetryIssue,
  validateRealmRuntimeTelemetry,
} from "./realmRuntimeTelemetry";
import { createRealmSequence } from "./realmSequence";
import { type RealmSpatialIssue, validateRealmSpatialContract } from "./realmSpatialValidation";
import {
  createYukaRealmPlaythroughRun,
  type RealmYukaPlaythroughIssue,
} from "./realmYukaPlaythroughAgent";

export interface RealmValidationOptions {
  seedPrefix?: string;
  seedsPerArchetype?: number;
  archetypes?: RealmArchetypeId[];
  platformCount?: number;
  movement?: Partial<RealmMovementEnvelope>;
  failFast?: boolean;
  sequenceCount?: number;
}

export interface RealmValidationEntry {
  seed: string;
  archetype: RealmArchetypeId;
  valid: boolean;
  generatorValid: boolean;
  agentValid: boolean;
  pathfindingValid: boolean;
  runtimeTelemetryValid: boolean;
  yukaValid: boolean;
  spatialValid: boolean;
  framingValid: boolean;
  platformCount: number;
  goldenPathLength: number;
  routeLinkCount: number;
  hazardLaneCount: number;
  visualCaptureCount: number;
  anomalyCount: number;
  runtimeAnomalyCount: number;
  uniqueAnomalyAssetCount: number;
  scannedAnomalyCount: number;
  totalAgentDurationMs: number;
  agentSampleCount: number;
  yukaFrameCount: number;
  yukaLandedFrameCount: number;
  yukaTotalDurationMs: number;
  maximumYukaSegmentDurationMs: number;
  maximumYukaLandingDistance: number;
  finalYukaGoalDistance: number;
  runtimeTelemetryFrameCount: number;
  runtimeFinalPathIndex: number;
  runtimeMaximumPathIndex: number;
  runtimeDiscoveredAnomalyCount: number;
  runtimeExtractionFrameCount: number;
  runtimeFirstExtractionFrameIndex: number | null;
  runtimeMinimumInstabilityRemaining: number;
  runtimeMinimumInstabilityRatio: number;
  runtimeHazardExposureMs: number;
  runtimePathRegressionCount: number;
  runtimeTargetRegressionCount: number;
  runtimeObjectiveRegressionCount: number;
  reachablePlatformCount: number;
  traversableEdgeCount: number;
  discoveredPathLength: number;
  shortestPathCost: number;
  discoveredPath: string[];
  discoveredPathMatchesGoldenPath: boolean;
  discoveredPathDivergenceCount: number;
  firstDivergentPathIndex: number | null;
  goldenPathShortcutCount: number;
  goldenPathDetourCount: number;
  nonGoldenDiscoveredStepCount: number;
  traversableGoldenStepCount: number;
  routeLinkTraversableCount: number;
  unsupportedLandingSampleCount: number;
  maximumHorizontalGap: number;
  maximumStepUp: number;
  maximumDrop: number;
  maximumRouteGap: number;
  maximumWalkGap: number;
  minimumLandingClearance: number;
  maximumNextPlatformAngle: number;
  maximumCaptureTargetAngle: number;
  minimumLookDistance: number;
  routeMoves: Record<RealmRouteMove, number>;
  goldenPathIssues: GoldenPathIssue[];
  spatialIssues: RealmSpatialIssue[];
  framingIssues: RealmFramingIssue[];
  pathfindingIssues: RealmPathfindingIssue[];
  runtimeTelemetryIssues: RealmRuntimeTelemetryIssue[];
  agentIssues: Array<{
    code: string;
    message: string;
    from?: string;
    to?: string;
    value?: number;
    limit?: number;
  }>;
  yukaIssues: RealmYukaPlaythroughIssue[];
}

export interface RealmValidationArchetypeSummary {
  archetype: RealmArchetypeId;
  total: number;
  valid: number;
  invalid: number;
  averagePlatforms: number;
  averageAgentDurationMs: number;
  averageYukaDurationMs: number;
  averageRuntimeTelemetryFrames: number;
  averageShortestPathCost: number;
  averageScannedAnomalies: number;
  averageRuntimeAnomalies: number;
  averageAgentSamples: number;
  averageYukaFrames: number;
  averageReachablePlatforms: number;
  averageVisualCaptures: number;
  minimumUniqueAnomalyAssets: number;
  minimumLandingClearance: number;
  minimumLookDistance: number;
  maximumHorizontalGap: number;
  maximumRouteGap: number;
  maximumWalkGap: number;
  maximumNextPlatformAngle: number;
  maximumCaptureTargetAngle: number;
  maximumYukaSegmentDurationMs: number;
  maximumYukaLandingDistance: number;
  minimumRuntimeInstabilityRemaining: number;
  minimumRuntimeInstabilityRatio: number;
  maximumRuntimeHazardExposureMs: number;
  maximumRuntimePathRegressionCount: number;
  maximumRuntimeObjectiveRegressionCount: number;
  maximumGoldenPathShortcutCount: number;
  maximumGoldenPathDetourCount: number;
  maximumDiscoveredPathDivergenceCount: number;
  maximumNonGoldenDiscoveredStepCount: number;
  pathfindingIssues: number;
  runtimeTelemetryIssues: number;
  maximumStepUp: number;
  unsupportedLandingSamples: number;
  framingIssues: number;
  yukaIssues: number;
}

export interface RealmValidationReport {
  seedPrefix: string;
  seedsPerArchetype: number;
  sequenceCount: number;
  total: number;
  valid: number;
  invalid: number;
  entries: RealmValidationEntry[];
  summaries: RealmValidationArchetypeSummary[];
}

const DEFAULT_SEED_PREFIX = "realm-validation";
const DEFAULT_SEEDS_PER_ARCHETYPE = 25;

export function validateRealmBatch(options: RealmValidationOptions = {}): RealmValidationReport {
  const seedPrefix = options.seedPrefix ?? DEFAULT_SEED_PREFIX;
  const seedsPerArchetype = Math.max(
    1,
    Math.round(options.seedsPerArchetype ?? DEFAULT_SEEDS_PER_ARCHETYPE)
  );
  const archetypes = options.archetypes?.length ? options.archetypes : REALM_ARCHETYPE_IDS;
  const entries: RealmValidationEntry[] = [];
  const sequenceEntries =
    options.sequenceCount && options.sequenceCount > 0
      ? createRealmSequence(seedPrefix, options.sequenceCount)
      : [];

  if (sequenceEntries.length > 0) {
    for (const sequenceEntry of sequenceEntries) {
      const realm = generateRealmClimb({
        seed: sequenceEntry.seed,
        archetype: sequenceEntry.archetype,
        platformCount: options.platformCount,
        movement: options.movement,
      });
      const entry = createValidationEntry(realm, sequenceEntry.archetype);

      entries.push(entry);

      if (options.failFast && !entry.valid) {
        return createReport(
          seedPrefix,
          seedsPerArchetype,
          sequenceEntries.length,
          entries,
          archetypes
        );
      }
    }
  } else {
    for (const archetype of archetypes) {
      for (let index = 0; index < seedsPerArchetype; index++) {
        const seed = `${seedPrefix}-${archetype}-${index + 1}`;
        const realm = generateRealmClimb({
          seed,
          archetype,
          platformCount: options.platformCount,
          movement: options.movement,
        });
        const entry = createValidationEntry(realm, archetype);

        entries.push(entry);

        if (options.failFast && !entry.valid) {
          return createReport(
            seedPrefix,
            seedsPerArchetype,
            sequenceEntries.length,
            entries,
            archetypes
          );
        }
      }
    }
  }

  return createReport(seedPrefix, seedsPerArchetype, sequenceEntries.length, entries, archetypes);
}

function createReport(
  seedPrefix: string,
  seedsPerArchetype: number,
  sequenceCount: number,
  entries: RealmValidationEntry[],
  archetypes: RealmArchetypeId[]
): RealmValidationReport {
  const valid = entries.filter((entry) => entry.valid).length;

  return {
    seedPrefix,
    seedsPerArchetype,
    sequenceCount,
    total: entries.length,
    valid,
    invalid: entries.length - valid,
    entries,
    summaries: archetypes.map((archetype) => summarizeArchetype(archetype, entries)),
  };
}

function createValidationEntry(
  realm: RealmClimb,
  archetype: RealmArchetypeId
): RealmValidationEntry {
  const agentRun = runRealmAgent(realm);
  const pathfinding = validateRealmPathfindingContract(realm);
  const spatial = validateRealmSpatialContract(realm, agentRun);
  const framing = validateRealmFramingContract(realm);
  const playthroughPlan = createRealmPlaythroughPlan(realm);
  const yukaRun = createYukaRealmPlaythroughRun(playthroughPlan);
  const runtimeTelemetry = validateRealmRuntimeTelemetry(realm, yukaRun.frames, {
    expectedMinimumScans: playthroughPlan.expectedScannedAnomalies,
    finalCheckpointIndex: playthroughPlan.checkpointCount - 1,
  });
  const runtimeAnomalyCount = realm.anomalies.filter((anomaly) =>
    canLoadRealmAssetAtRuntime(anomaly.asset)
  ).length;
  const uniqueAnomalyAssetCount = new Set(realm.anomalies.map((anomaly) => anomaly.asset.id)).size;

  return {
    seed: realm.seed,
    archetype,
    valid:
      realm.validation.valid &&
      agentRun.valid &&
      pathfinding.valid &&
      runtimeTelemetry.valid &&
      yukaRun.valid &&
      spatial.valid &&
      framing.valid &&
      runtimeAnomalyCount > 0 &&
      uniqueAnomalyAssetCount === realm.anomalies.length,
    generatorValid: realm.validation.valid,
    agentValid: agentRun.valid,
    pathfindingValid: pathfinding.valid,
    runtimeTelemetryValid: runtimeTelemetry.valid,
    yukaValid: yukaRun.valid,
    spatialValid: spatial.valid,
    framingValid: framing.valid,
    platformCount: realm.platforms.length,
    goldenPathLength: realm.goldenPath.length,
    routeLinkCount: spatial.metrics.routeLinkCount,
    hazardLaneCount: spatial.metrics.hazardLaneCount,
    visualCaptureCount: framing.metrics.captureCount,
    anomalyCount: realm.anomalies.length,
    runtimeAnomalyCount,
    uniqueAnomalyAssetCount,
    scannedAnomalyCount: agentRun.scannedAnomalyIds.length,
    totalAgentDurationMs: agentRun.totalDurationMs,
    agentSampleCount: spatial.metrics.agentSampleCount,
    yukaFrameCount: yukaRun.frames.length,
    yukaLandedFrameCount: yukaRun.landedFrames.length,
    yukaTotalDurationMs: yukaRun.totalDurationMs,
    maximumYukaSegmentDurationMs: yukaRun.maximumSegmentDurationMs,
    maximumYukaLandingDistance: yukaRun.maximumLandingDistance,
    finalYukaGoalDistance: yukaRun.finalDistanceToGoal,
    runtimeTelemetryFrameCount: runtimeTelemetry.frameCount,
    runtimeFinalPathIndex: runtimeTelemetry.finalPathIndex,
    runtimeMaximumPathIndex: runtimeTelemetry.maximumPathIndex,
    runtimeDiscoveredAnomalyCount: runtimeTelemetry.discoveredAnomalyIds.length,
    runtimeExtractionFrameCount: runtimeTelemetry.extractionFrameCount,
    runtimeFirstExtractionFrameIndex: runtimeTelemetry.firstExtractionFrameIndex,
    runtimeMinimumInstabilityRemaining: runtimeTelemetry.minimumInstabilityRemaining,
    runtimeMinimumInstabilityRatio: runtimeTelemetry.minimumInstabilityRatio,
    runtimeHazardExposureMs: runtimeTelemetry.hazardExposureMs,
    runtimePathRegressionCount: runtimeTelemetry.pathRegressionCount,
    runtimeTargetRegressionCount: runtimeTelemetry.targetRegressionCount,
    runtimeObjectiveRegressionCount: runtimeTelemetry.objectiveRegressionCount,
    reachablePlatformCount: pathfinding.reachablePlatformCount,
    traversableEdgeCount: pathfinding.traversableEdgeCount,
    discoveredPathLength: pathfinding.discoveredPathLength,
    shortestPathCost: pathfinding.shortestPathCost,
    discoveredPath: pathfinding.discoveredPath,
    discoveredPathMatchesGoldenPath: pathfinding.discoveredPathMatchesGoldenPath,
    discoveredPathDivergenceCount: pathfinding.discoveredPathDivergenceCount,
    firstDivergentPathIndex: pathfinding.firstDivergentPathIndex,
    goldenPathShortcutCount: pathfinding.goldenPathShortcutCount,
    goldenPathDetourCount: pathfinding.goldenPathDetourCount,
    nonGoldenDiscoveredStepCount: pathfinding.nonGoldenDiscoveredStepCount,
    traversableGoldenStepCount: pathfinding.traversableGoldenStepCount,
    routeLinkTraversableCount: pathfinding.routeLinkTraversableCount,
    unsupportedLandingSampleCount: spatial.metrics.unsupportedLandingSampleCount,
    maximumHorizontalGap: realm.validation.maximumHorizontalGap,
    maximumStepUp: realm.validation.maximumStepUp,
    maximumDrop: realm.validation.maximumDrop,
    maximumRouteGap: spatial.metrics.maximumRouteGap,
    maximumWalkGap: spatial.metrics.maximumWalkGap,
    minimumLandingClearance: spatial.metrics.minimumLandingClearance,
    maximumNextPlatformAngle: framing.metrics.maximumNextPlatformAngle,
    maximumCaptureTargetAngle: framing.metrics.maximumCaptureTargetAngle,
    minimumLookDistance: framing.metrics.minimumLookDistance,
    routeMoves: countRouteMoves(realm.links.map((link) => link.move)),
    goldenPathIssues: realm.validation.issues,
    spatialIssues: spatial.issues,
    framingIssues: framing.issues,
    pathfindingIssues: pathfinding.issues,
    runtimeTelemetryIssues: runtimeTelemetry.issues,
    agentIssues: agentRun.issues,
    yukaIssues: yukaRun.issues,
  };
}

function summarizeArchetype(
  archetype: RealmArchetypeId,
  entries: RealmValidationEntry[]
): RealmValidationArchetypeSummary {
  const matching = entries.filter((entry) => entry.archetype === archetype);
  const valid = matching.filter((entry) => entry.valid).length;

  return {
    archetype,
    total: matching.length,
    valid,
    invalid: matching.length - valid,
    averagePlatforms: round(average(matching.map((entry) => entry.platformCount)), 2),
    averageAgentDurationMs: round(average(matching.map((entry) => entry.totalAgentDurationMs)), 0),
    averageYukaDurationMs: round(average(matching.map((entry) => entry.yukaTotalDurationMs)), 0),
    averageRuntimeTelemetryFrames: round(
      average(matching.map((entry) => entry.runtimeTelemetryFrameCount)),
      2
    ),
    averageShortestPathCost: round(average(matching.map((entry) => entry.shortestPathCost)), 2),
    averageScannedAnomalies: round(average(matching.map((entry) => entry.scannedAnomalyCount)), 2),
    averageRuntimeAnomalies: round(average(matching.map((entry) => entry.runtimeAnomalyCount)), 2),
    averageAgentSamples: round(average(matching.map((entry) => entry.agentSampleCount)), 2),
    averageYukaFrames: round(average(matching.map((entry) => entry.yukaFrameCount)), 2),
    averageReachablePlatforms: round(
      average(matching.map((entry) => entry.reachablePlatformCount)),
      2
    ),
    averageVisualCaptures: round(average(matching.map((entry) => entry.visualCaptureCount)), 2),
    minimumUniqueAnomalyAssets:
      matching.length > 0 ? Math.min(...matching.map((entry) => entry.uniqueAnomalyAssetCount)) : 0,
    minimumLandingClearance:
      matching.length > 0 ? Math.min(...matching.map((entry) => entry.minimumLandingClearance)) : 0,
    minimumLookDistance:
      matching.length > 0 ? Math.min(...matching.map((entry) => entry.minimumLookDistance)) : 0,
    maximumHorizontalGap: round(
      Math.max(0, ...matching.map((entry) => entry.maximumHorizontalGap)),
      2
    ),
    maximumRouteGap: round(Math.max(0, ...matching.map((entry) => entry.maximumRouteGap)), 2),
    maximumWalkGap: round(Math.max(0, ...matching.map((entry) => entry.maximumWalkGap)), 2),
    maximumNextPlatformAngle: round(
      Math.max(0, ...matching.map((entry) => entry.maximumNextPlatformAngle)),
      2
    ),
    maximumCaptureTargetAngle: round(
      Math.max(0, ...matching.map((entry) => entry.maximumCaptureTargetAngle)),
      2
    ),
    maximumYukaSegmentDurationMs: Math.max(
      0,
      ...matching.map((entry) => entry.maximumYukaSegmentDurationMs)
    ),
    maximumYukaLandingDistance: round(
      Math.max(0, ...matching.map((entry) => entry.maximumYukaLandingDistance)),
      3
    ),
    minimumRuntimeInstabilityRemaining:
      matching.length > 0
        ? round(Math.min(...matching.map((entry) => entry.runtimeMinimumInstabilityRemaining)), 2)
        : 0,
    minimumRuntimeInstabilityRatio:
      matching.length > 0
        ? round(Math.min(...matching.map((entry) => entry.runtimeMinimumInstabilityRatio)), 3)
        : 0,
    maximumRuntimeHazardExposureMs: Math.max(
      0,
      ...matching.map((entry) => entry.runtimeHazardExposureMs)
    ),
    maximumRuntimePathRegressionCount: Math.max(
      0,
      ...matching.map((entry) => entry.runtimePathRegressionCount)
    ),
    maximumRuntimeObjectiveRegressionCount: Math.max(
      0,
      ...matching.map((entry) => entry.runtimeObjectiveRegressionCount)
    ),
    maximumGoldenPathShortcutCount: Math.max(
      0,
      ...matching.map((entry) => entry.goldenPathShortcutCount)
    ),
    maximumGoldenPathDetourCount: Math.max(
      0,
      ...matching.map((entry) => entry.goldenPathDetourCount)
    ),
    maximumDiscoveredPathDivergenceCount: Math.max(
      0,
      ...matching.map((entry) => entry.discoveredPathDivergenceCount)
    ),
    maximumNonGoldenDiscoveredStepCount: Math.max(
      0,
      ...matching.map((entry) => entry.nonGoldenDiscoveredStepCount)
    ),
    pathfindingIssues: matching.reduce((sum, entry) => sum + entry.pathfindingIssues.length, 0),
    runtimeTelemetryIssues: matching.reduce(
      (sum, entry) => sum + entry.runtimeTelemetryIssues.length,
      0
    ),
    maximumStepUp: round(Math.max(0, ...matching.map((entry) => entry.maximumStepUp)), 2),
    unsupportedLandingSamples: matching.reduce(
      (sum, entry) => sum + entry.unsupportedLandingSampleCount,
      0
    ),
    framingIssues: matching.reduce((sum, entry) => sum + entry.framingIssues.length, 0),
    yukaIssues: matching.reduce((sum, entry) => sum + entry.yukaIssues.length, 0),
  };
}

function countRouteMoves(moves: RealmRouteMove[]): Record<RealmRouteMove, number> {
  const counts: Record<RealmRouteMove, number> = {
    walk: 0,
    jump: 0,
    climb: 0,
    drop: 0,
  };

  for (const move of moves) {
    counts[move] += 1;
  }

  return counts;
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
