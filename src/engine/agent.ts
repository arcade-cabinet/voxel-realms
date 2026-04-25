import type { Vec3 } from "@engine/types";
import type {
  RealmAnomaly,
  RealmClimb,
  RealmPlatform,
  RealmRouteLink,
  RealmRouteMove,
} from "@world/climber";

export type RealmAgentSampleState =
  | "landed"
  | "walking"
  | "jumping"
  | "climbing"
  | "dropping"
  | "extracted";

export interface RealmAgentProfile {
  groundSpeed: number;
  jumpSpeed: number;
  climbSpeed: number;
  dropSpeed: number;
  sampleIntervalMs: number;
  landingDwellMs: number;
  maxSegmentDurationMs: number;
  scanRadiusPadding: number;
}

export interface RealmAgentWaypoint {
  index: number;
  platformId: string;
  position: Vec3;
}

export interface RealmAgentSegment {
  index: number;
  fromPlatformId: string;
  toPlatformId: string;
  move: RealmRouteMove;
  distance: number;
  durationMs: number;
  sampleCount: number;
}

export interface RealmAgentSample {
  elapsedMs: number;
  segmentIndex: number;
  platformId: string;
  position: Vec3;
  state: RealmAgentSampleState;
}

export interface RealmAgentIssue {
  code:
    | "missing-platform"
    | "missing-link"
    | "invalid-link"
    | "segment-timeout"
    | "no-signal-scanned"
    | "exit-not-reached";
  message: string;
  from?: string;
  to?: string;
  value?: number;
  limit?: number;
}

export interface RealmAgentRun {
  valid: boolean;
  realmSeed: string;
  archetypeId: string;
  waypoints: RealmAgentWaypoint[];
  segments: RealmAgentSegment[];
  samples: RealmAgentSample[];
  scannedAnomalyIds: string[];
  totalDurationMs: number;
  finalPlatformId: string | null;
  finalPosition: Vec3 | null;
  extractionReady: boolean;
  issues: RealmAgentIssue[];
}

const AGENT_HEIGHT = 0.72;

export const DEFAULT_REALM_AGENT_PROFILE: RealmAgentProfile = {
  groundSpeed: 4.8,
  jumpSpeed: 5.4,
  climbSpeed: 2.9,
  dropSpeed: 6.2,
  sampleIntervalMs: 220,
  landingDwellMs: 120,
  maxSegmentDurationMs: 4_500,
  scanRadiusPadding: 0.35,
};

export function createRealmAgentWaypoints(realm: RealmClimb): RealmAgentWaypoint[] {
  const platformsById = new Map(realm.platforms.map((platform) => [platform.id, platform]));

  return realm.goldenPath.map((platformId, index) => {
    const platform = platformsById.get(platformId);

    return {
      index,
      platformId,
      position: platform ? getPlatformAgentPosition(platform) : { x: 0, y: 0, z: 0 },
    };
  });
}

export function runRealmAgent(
  realm: RealmClimb,
  profile: RealmAgentProfile = DEFAULT_REALM_AGENT_PROFILE
): RealmAgentRun {
  const issues: RealmAgentIssue[] = [];
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const linkByKey = new Map(realm.links.map((link) => [`${link.from}->${link.to}`, link]));
  const waypoints = createRealmAgentWaypoints(realm);
  const segments: RealmAgentSegment[] = [];
  const samples: RealmAgentSample[] = [];
  const scannedAnomalyIds = new Set<string>();
  let elapsedMs = 0;

  for (const waypoint of waypoints) {
    if (!platformById.has(waypoint.platformId)) {
      issues.push({
        code: "missing-platform",
        message: "Agent waypoint references a missing golden-path platform.",
        to: waypoint.platformId,
      });
    }
  }

  if (issues.length === 0 && waypoints[0]) {
    samples.push({
      elapsedMs,
      segmentIndex: -1,
      platformId: waypoints[0].platformId,
      position: waypoints[0].position,
      state: "landed",
    });
    scanAnomalies(realm.anomalies, waypoints[0].position, profile, scannedAnomalyIds);
  }

  for (let index = 1; index < waypoints.length && issues.length === 0; index++) {
    const from = waypoints[index - 1];
    const to = waypoints[index];
    const link = linkByKey.get(`${from.platformId}->${to.platformId}`);

    if (!link) {
      issues.push({
        code: "missing-link",
        message: "Agent cannot execute a golden-path step without a route link.",
        from: from.platformId,
        to: to.platformId,
      });
      break;
    }

    const segment = createAgentSegment(index - 1, from, to, link, profile);
    segments.push(segment);

    if (segment.durationMs > profile.maxSegmentDurationMs) {
      issues.push({
        code: "segment-timeout",
        message: "Agent segment duration exceeds deterministic runner bounds.",
        from: from.platformId,
        to: to.platformId,
        value: segment.durationMs,
        limit: profile.maxSegmentDurationMs,
      });
      break;
    }

    if (!isLinkConsistent(link, from.platformId, to.platformId)) {
      issues.push({
        code: "invalid-link",
        message: "Route link metadata no longer matches generated waypoint geometry.",
        from: from.platformId,
        to: to.platformId,
      });
      break;
    }

    const segmentSamples = sampleSegment(from, to, segment, elapsedMs);
    for (const sample of segmentSamples) {
      samples.push(sample);
      scanAnomalies(realm.anomalies, sample.position, profile, scannedAnomalyIds);
    }

    elapsedMs += segment.durationMs + profile.landingDwellMs;
    samples.push({
      elapsedMs,
      segmentIndex: segment.index,
      platformId: to.platformId,
      position: to.position,
      state: "landed",
    });
    scanAnomalies(realm.anomalies, to.position, profile, scannedAnomalyIds);
  }

  const finalWaypoint = waypoints.at(-1) ?? null;
  const exitReached = finalWaypoint?.platformId === realm.exitPlatformId && issues.length === 0;
  const extractionReady = exitReached && scannedAnomalyIds.size > 0;

  if (issues.length === 0 && scannedAnomalyIds.size === 0) {
    issues.push({
      code: "no-signal-scanned",
      message: "Agent reached the route but never entered an anomaly scan radius.",
    });
  }

  if (issues.length === 0 && !exitReached) {
    issues.push({
      code: "exit-not-reached",
      message: "Agent run did not end on the declared exit platform.",
      to: realm.exitPlatformId,
    });
  }

  if (extractionReady && finalWaypoint) {
    samples.push({
      elapsedMs: elapsedMs + profile.landingDwellMs,
      segmentIndex: segments.length - 1,
      platformId: finalWaypoint.platformId,
      position: finalWaypoint.position,
      state: "extracted",
    });
  }

  return {
    valid: issues.length === 0,
    realmSeed: realm.seed,
    archetypeId: realm.archetype.id,
    waypoints,
    segments,
    samples,
    scannedAnomalyIds: [...scannedAnomalyIds],
    totalDurationMs: samples.at(-1)?.elapsedMs ?? 0,
    finalPlatformId: finalWaypoint?.platformId ?? null,
    finalPosition: finalWaypoint?.position ?? null,
    extractionReady,
    issues,
  };
}

function createAgentSegment(
  index: number,
  from: RealmAgentWaypoint,
  to: RealmAgentWaypoint,
  link: RealmRouteLink,
  profile: RealmAgentProfile
): RealmAgentSegment {
  const distance = distance3d(from.position, to.position);
  const speed = getSegmentSpeed(link.move, profile);
  const durationMs = Math.max(260, Math.round((distance / speed) * 1000));
  const sampleCount = Math.max(2, Math.ceil(durationMs / profile.sampleIntervalMs));

  return {
    index,
    fromPlatformId: from.platformId,
    toPlatformId: to.platformId,
    move: link.move,
    distance: round(distance, 2),
    durationMs,
    sampleCount,
  };
}

function sampleSegment(
  from: RealmAgentWaypoint,
  to: RealmAgentWaypoint,
  segment: RealmAgentSegment,
  elapsedMs: number
): RealmAgentSample[] {
  const samples: RealmAgentSample[] = [];

  for (let step = 1; step <= segment.sampleCount; step++) {
    const t = step / segment.sampleCount;
    const eased = segment.move === "jump" ? easeOutSine(t) : t;
    const position = lerpVec3(from.position, to.position, eased);

    if (segment.move === "jump") {
      position.y += Math.sin(t * Math.PI) * getJumpArcHeight(from.position, to.position);
    }

    samples.push({
      elapsedMs: Math.round(elapsedMs + t * segment.durationMs),
      segmentIndex: segment.index,
      platformId: t >= 1 ? to.platformId : from.platformId,
      position: roundVec3(position, 3),
      state: getSampleState(segment.move),
    });
  }

  return samples;
}

function getPlatformAgentPosition(platform: RealmPlatform): Vec3 {
  return {
    x: platform.position.x,
    y: round(platform.position.y + platform.size.y / 2 + AGENT_HEIGHT, 3),
    z: platform.position.z,
  };
}

function getSegmentSpeed(move: RealmRouteMove, profile: RealmAgentProfile) {
  if (move === "jump") return profile.jumpSpeed;
  if (move === "climb") return profile.climbSpeed;
  if (move === "drop") return profile.dropSpeed;
  return profile.groundSpeed;
}

function getSampleState(move: RealmRouteMove): RealmAgentSampleState {
  if (move === "jump") return "jumping";
  if (move === "climb") return "climbing";
  if (move === "drop") return "dropping";
  return "walking";
}

function scanAnomalies(
  anomalies: RealmAnomaly[],
  position: Vec3,
  profile: RealmAgentProfile,
  scanned: Set<string>
) {
  for (const anomaly of anomalies) {
    if (scanned.has(anomaly.id)) {
      continue;
    }

    if (distance3d(position, anomaly.position) <= anomaly.scanRadius + profile.scanRadiusPadding) {
      scanned.add(anomaly.id);
    }
  }
}

function isLinkConsistent(link: RealmRouteLink, fromPlatformId: string, toPlatformId: string) {
  return (
    link.from === fromPlatformId &&
    link.to === toPlatformId &&
    Number.isFinite(link.horizontalGap) &&
    Number.isFinite(link.verticalDelta) &&
    Number.isFinite(link.clearance) &&
    link.horizontalGap >= 0 &&
    link.clearance > 0
  );
}

function getJumpArcHeight(from: Vec3, to: Vec3) {
  return Math.max(0.85, Math.abs(to.y - from.y) * 0.45 + 0.9);
}

function lerpVec3(from: Vec3, to: Vec3, t: number): Vec3 {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  };
}

function roundVec3(vector: Vec3, precision: number): Vec3 {
  return {
    x: round(vector.x, precision),
    y: round(vector.y, precision),
    z: round(vector.z, precision),
  };
}

function easeOutSine(value: number) {
  return Math.sin((value * Math.PI) / 2);
}

function distance3d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
