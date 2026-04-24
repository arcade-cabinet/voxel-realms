import type { Vec3 } from "@engine/types";
import { createInitialVoxelState } from "@engine/voxel-simulation";
import {
  DEFAULT_REALM_SEED,
  evaluateRealmProgress,
  generateRealmClimb,
  REALM_ARCHETYPE_IDS,
  type RealmArchetypeId,
  type RealmClimb,
  type RealmHazardKind,
} from "@world/climber";
import {
  evaluateRealmHazardExposure,
  evaluateRealmInstability,
  type RealmInstabilityLevel,
} from "@world/instability";
import { createRealmSequenceEntry } from "@world/sequence";
import { trait } from "koota";

export type RealmExtractionState = "camp" | "ascending" | "extracted" | "collapsed";

export interface RealmRuntimeState {
  baseSeed: string;
  seed: string;
  realmIndex: number;
  archetype: RealmArchetypeId;
  activeRealm: RealmClimb;
  completedRealms: Array<{
    seed: string;
    archetype: RealmArchetypeId;
    outcome: "extracted" | "collapsed";
    scannedAnomalies: number;
    stabilityRemaining: number;
  }>;
  discoveredAnomalies: string[];
  lastPlayerPosition: Vec3;
  extractionState: RealmExtractionState;
  agentPathIndex: number;
  nearestAnomalyId: string | null;
  nearestAnomalyDistance: number;
  nearestAnomalyLabel: string | null;
  objective: string;
  objectiveProgress: number;
  hazardExposureMs: number;
  instabilityRemaining: number;
  instabilityRatio: number;
  instabilityLevel: RealmInstabilityLevel;
  activeHazardKind: RealmHazardKind | null;
  lastHazard: { kind: RealmHazardKind; elapsedMs: number } | null;
  lastElapsedMs: number;
  lastScan: { id: string; label: string; elapsedMs: number } | null;
}

export interface RealmSurveyStats {
  currentRealmNumber: number;
  completedCount: number;
  extractedCount: number;
  collapsedCount: number;
  totalSignals: number;
  averageSignals: number;
  bestStabilityRemaining: number;
  currentCyclePosition: number;
  currentCycleSize: number;
  lastCompleted: RealmRuntimeState["completedRealms"][number] | null;
}

export function createInitialRealmRuntime(
  seed = DEFAULT_REALM_SEED,
  realmIndex = 0,
  completedRealms: RealmRuntimeState["completedRealms"] = []
): RealmRuntimeState {
  const sequenceEntry = createRealmSequenceEntry(seed, realmIndex);
  const activeRealm = generateRealmClimb({
    seed: sequenceEntry.seed,
    archetype: sequenceEntry.archetype,
  });
  const progress = evaluateRealmProgress(activeRealm, activeRealm.platforms[0].position);
  const instability = evaluateRealmInstability({
    realm: activeRealm,
    position: activeRealm.platforms[0].position,
    elapsedMs: 0,
    discoveredAnomalyCount: 0,
    hazardExposureMs: 0,
  });

  return {
    baseSeed: seed,
    seed: activeRealm.seed,
    realmIndex,
    archetype: activeRealm.archetype.id,
    activeRealm,
    completedRealms,
    discoveredAnomalies: [],
    lastPlayerPosition: activeRealm.platforms[0].position,
    extractionState: "camp",
    agentPathIndex: 0,
    nearestAnomalyId: progress.nearestAnomalyId,
    nearestAnomalyDistance: progress.nearestAnomalyDistance,
    nearestAnomalyLabel: progress.nearestAnomalyLabel,
    objective: progress.objective,
    objectiveProgress: progress.objectiveProgress,
    hazardExposureMs: 0,
    instabilityRemaining: instability.remaining,
    instabilityRatio: instability.ratio,
    instabilityLevel: instability.level,
    activeHazardKind: null,
    lastHazard: null,
    lastElapsedMs: 0,
    lastScan: null,
  };
}

export function createNextRealmRuntime(state: RealmRuntimeState): RealmRuntimeState {
  const completedRealms: RealmRuntimeState["completedRealms"] = [
    ...state.completedRealms,
    {
      seed: state.seed,
      archetype: state.archetype,
      outcome: state.extractionState === "collapsed" ? "collapsed" : "extracted",
      scannedAnomalies: state.discoveredAnomalies.length,
      stabilityRemaining: state.instabilityRemaining,
    },
  ];

  return createInitialRealmRuntime(state.baseSeed, state.realmIndex + 1, completedRealms);
}

export function advanceRealmRuntime(
  state: RealmRuntimeState,
  position: Vec3,
  elapsedMs: number
): RealmRuntimeState {
  const progress = evaluateRealmProgress(state.activeRealm, position, state.discoveredAnomalies);
  const hazard = evaluateRealmHazardExposure(state.activeRealm, position);
  const deltaMs = Math.max(0, elapsedMs - state.lastElapsedMs);
  const hazardExposureMs = state.hazardExposureMs + (hazard.activeHazard ? deltaMs : 0);
  const scanned = progress.scannedAnomaly;
  const isNewScan = Boolean(scanned && !state.discoveredAnomalies.includes(scanned.id));
  const discoveredAnomalies =
    scanned && isNewScan ? [...state.discoveredAnomalies, scanned.id] : state.discoveredAnomalies;
  const instability = evaluateRealmInstability({
    realm: state.activeRealm,
    position,
    elapsedMs,
    discoveredAnomalyCount: discoveredAnomalies.length,
    hazardExposureMs,
  });
  const extractionState = getNextExtractionState(
    state,
    progress.extractionReady,
    instability.level,
    progress.pathIndex
  );
  const objective = progress.extractionReady
    ? progress.objective
    : (instability.objective ?? progress.objective);

  return {
    ...state,
    discoveredAnomalies,
    lastPlayerPosition: position,
    extractionState,
    agentPathIndex: Math.max(state.agentPathIndex, progress.pathIndex),
    nearestAnomalyId: progress.nearestAnomalyId,
    nearestAnomalyDistance: progress.nearestAnomalyDistance,
    nearestAnomalyLabel: progress.nearestAnomalyLabel,
    objective,
    objectiveProgress: progress.objectiveProgress,
    hazardExposureMs,
    instabilityRemaining: instability.remaining,
    instabilityRatio: instability.ratio,
    instabilityLevel: instability.level,
    activeHazardKind: instability.hazard.activeHazard?.kind ?? null,
    lastHazard: hazard.activeHazard
      ? {
          kind: hazard.activeHazard.kind,
          elapsedMs,
        }
      : state.lastHazard,
    lastElapsedMs: elapsedMs,
    lastScan:
      scanned && isNewScan
        ? {
            id: scanned.id,
            label: scanned.label,
            elapsedMs,
          }
        : state.lastScan,
  };
}

export function summarizeRealmExpedition(state: RealmRuntimeState): RealmSurveyStats {
  const completedCount = state.completedRealms.length;
  const extractedCount = state.completedRealms.filter(
    (realm) => realm.outcome === "extracted"
  ).length;
  const collapsedCount = state.completedRealms.filter(
    (realm) => realm.outcome === "collapsed"
  ).length;
  const totalSignals =
    state.completedRealms.reduce((sum, realm) => sum + realm.scannedAnomalies, 0) +
    state.discoveredAnomalies.length;
  const stabilityValues = state.completedRealms
    .map((realm) => realm.stabilityRemaining)
    .filter((value) => value > 0);

  return {
    currentRealmNumber: state.realmIndex + 1,
    completedCount,
    extractedCount,
    collapsedCount,
    totalSignals,
    averageSignals: completedCount > 0 ? round(totalSignals / completedCount, 2) : totalSignals,
    bestStabilityRemaining: stabilityValues.length > 0 ? Math.max(...stabilityValues) : 0,
    currentCyclePosition: (state.realmIndex % REALM_ARCHETYPE_IDS.length) + 1,
    currentCycleSize: REALM_ARCHETYPE_IDS.length,
    lastCompleted: state.completedRealms.at(-1) ?? null,
  };
}

function getNextExtractionState(
  state: RealmRuntimeState,
  extractionReady: boolean,
  instabilityLevel: RealmInstabilityLevel,
  pathIndex: number
): RealmExtractionState {
  if (extractionReady) {
    return "extracted";
  }

  if (state.extractionState === "collapsed" || instabilityLevel === "collapsed") {
    return "collapsed";
  }

  if (state.extractionState === "extracted") {
    return "extracted";
  }

  return pathIndex > 0 ? "ascending" : state.extractionState;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

export const VoxelTrait = trait(() => createInitialVoxelState());
export const RealmTrait = trait(() => createInitialRealmRuntime());
