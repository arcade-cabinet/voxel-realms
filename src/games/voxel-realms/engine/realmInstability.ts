import type { RealmClimb, RealmHazard, RealmHazardKind } from "./realmClimber";
import type { Vec3 } from "./types";

export type RealmInstabilityLevel = "stable" | "unstable" | "critical" | "collapsed";

export interface RealmHazardExposure {
  nearestHazardId: string | null;
  nearestHazardKind: RealmHazardKind | null;
  nearestHazardDistance: number;
  activeHazard: RealmHazard | null;
  pressurePerSecond: number;
}

export interface RealmInstabilityEvaluation {
  budget: number;
  elapsedSeconds: number;
  timePressure: number;
  hazardPressure: number;
  scanRelief: number;
  remaining: number;
  ratio: number;
  level: RealmInstabilityLevel;
  hazard: RealmHazardExposure;
  objective: string | null;
}

export interface RealmInstabilityInput {
  realm: RealmClimb;
  position: Vec3;
  elapsedMs: number;
  discoveredAnomalyCount: number;
  hazardExposureMs: number;
}

const HAZARD_VERTICAL_TOLERANCE = 3.25;
const HAZARD_PLAYER_PADDING = 0.85;
const TIME_PRESSURE_PER_SECOND = 0.72;
const HAZARD_PRESSURE_PER_SECOND = 3.4;
const SCAN_RELIEF_UNITS = 4;

export function evaluateRealmInstability(input: RealmInstabilityInput): RealmInstabilityEvaluation {
  const hazard = evaluateRealmHazardExposure(input.realm, input.position);
  const budget = input.realm.instabilityBudget;
  const elapsedSeconds = Math.max(0, input.elapsedMs / 1000);
  const timePressure = elapsedSeconds * TIME_PRESSURE_PER_SECOND;
  const hazardPressure = Math.max(0, input.hazardExposureMs / 1000) * HAZARD_PRESSURE_PER_SECOND;
  const scanRelief =
    Math.min(input.discoveredAnomalyCount, input.realm.anomalies.length) * SCAN_RELIEF_UNITS;
  const remaining = Math.max(0, budget - timePressure - hazardPressure + scanRelief);
  const ratio = budget > 0 ? remaining / budget : 0;
  const level = classifyInstability(ratio);

  return {
    budget,
    elapsedSeconds: round(elapsedSeconds, 2),
    timePressure: round(timePressure, 2),
    hazardPressure: round(hazardPressure, 2),
    scanRelief,
    remaining: round(remaining, 2),
    ratio: round(ratio, 3),
    level,
    hazard,
    objective: describeInstabilityObjective(level, hazard),
  };
}

export function evaluateRealmHazardExposure(
  realm: RealmClimb,
  position: Vec3
): RealmHazardExposure {
  const nearest = realm.hazards.reduce<{
    hazard: RealmHazard;
    horizontalDistance: number;
    verticalDistance: number;
  } | null>((current, hazard) => {
    const horizontalDistance = Math.hypot(
      position.x - hazard.position.x,
      position.z - hazard.position.z
    );
    const verticalDistance = Math.abs(position.y - hazard.position.y);

    if (!current || horizontalDistance < current.horizontalDistance) {
      return { hazard, horizontalDistance, verticalDistance };
    }

    return current;
  }, null);

  if (!nearest) {
    return {
      nearestHazardId: null,
      nearestHazardKind: null,
      nearestHazardDistance: 0,
      activeHazard: null,
      pressurePerSecond: 0,
    };
  }

  const active =
    nearest.horizontalDistance <= nearest.hazard.radius + HAZARD_PLAYER_PADDING &&
    nearest.verticalDistance <= HAZARD_VERTICAL_TOLERANCE;

  return {
    nearestHazardId: nearest.hazard.id,
    nearestHazardKind: nearest.hazard.kind,
    nearestHazardDistance: round(nearest.horizontalDistance, 2),
    activeHazard: active ? nearest.hazard : null,
    pressurePerSecond: active
      ? round(HAZARD_PRESSURE_PER_SECOND * (0.5 + nearest.hazard.severity), 2)
      : 0,
  };
}

function classifyInstability(ratio: number): RealmInstabilityLevel {
  if (ratio <= 0) return "collapsed";
  if (ratio <= 0.18) return "critical";
  if (ratio <= 0.42) return "unstable";
  return "stable";
}

function describeInstabilityObjective(
  level: RealmInstabilityLevel,
  hazard: RealmHazardExposure
): string | null {
  if (level === "collapsed") {
    return "Realm collapse reached. Return through the beacon and reroll the route.";
  }

  if (level === "critical") {
    return "Realm stability critical. Scan a signal or reach extraction immediately.";
  }

  if (hazard.activeHazard) {
    return `Avoid ${hazard.activeHazard.kind} pressure before the realm destabilizes.`;
  }

  if (level === "unstable") {
    return "Realm stability falling. Keep climbing and scan the next signal.";
  }

  return null;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
