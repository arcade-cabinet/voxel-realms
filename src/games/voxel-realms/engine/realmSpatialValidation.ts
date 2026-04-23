import { type RealmAgentRun, runRealmAgent } from "./realmAgent";
import type {
  RealmClimb,
  RealmHazard,
  RealmMovementEnvelope,
  RealmPlatform,
  RealmRouteLink,
} from "./realmClimber";
import type { Vec3 } from "./types";

export type RealmSpatialIssueCode =
  | "missing-start-platform"
  | "missing-exit-platform"
  | "start-not-first"
  | "exit-not-last"
  | "start-kind-mismatch"
  | "exit-kind-mismatch"
  | "start-landing-too-small"
  | "exit-landing-too-small"
  | "hazard-overlaps-start"
  | "hazard-overlaps-exit"
  | "missing-route-link"
  | "route-link-not-golden"
  | "route-link-metadata-mismatch"
  | "walk-link-has-visible-gap"
  | "hazard-lane-missing-link"
  | "hazard-lane-off-center"
  | "landing-sample-missing-platform"
  | "landing-sample-outside-platform"
  | "landing-sample-height-mismatch"
  | "agent-segment-missing-link"
  | "agent-sample-outside-route-corridor";

export interface RealmSpatialIssue {
  code: RealmSpatialIssueCode;
  message: string;
  platformId?: string;
  from?: string;
  to?: string;
  sampleIndex?: number;
  value?: number;
  limit?: number;
}

export interface RealmSpatialGoalPost {
  platformId: string | null;
  position: Vec3 | null;
  clearance: number;
  clean: boolean;
}

export interface RealmSpatialMetrics {
  routeLinkCount: number;
  hazardLaneCount: number;
  agentSampleCount: number;
  landedSampleCount: number;
  supportedLandingSampleCount: number;
  unsupportedLandingSampleCount: number;
  maximumRouteGap: number;
  maximumCenterDistance: number;
  maximumVerticalDelta: number;
  minimumLandingClearance: number;
  maximumWalkGap: number;
}

export interface RealmSpatialValidation {
  valid: boolean;
  issues: RealmSpatialIssue[];
  start: RealmSpatialGoalPost;
  exit: RealmSpatialGoalPost;
  metrics: RealmSpatialMetrics;
}

const AGENT_HEIGHT = 0.72;
const LANDING_HEIGHT_TOLERANCE = 0.14;
const ROUTE_METADATA_TOLERANCE = 0.06;
const ROUTE_CORRIDOR_PADDING = 0.85;

export function validateRealmSpatialContract(
  realm: RealmClimb,
  agentRun: RealmAgentRun = runRealmAgent(realm)
): RealmSpatialValidation {
  const issues: RealmSpatialIssue[] = [];
  const movement = realm.movement;
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const goldenPairs = createGoldenPairSet(realm.goldenPath);
  const linkByKey = new Map(realm.links.map((link) => [routeKey(link.from, link.to), link]));
  const startPlatform = platformById.get(realm.startPlatformId) ?? null;
  const exitPlatform = platformById.get(realm.exitPlatformId) ?? null;

  validateGoalPosts(realm, startPlatform, exitPlatform, movement, issues);
  validateRouteLinks(realm.links, goldenPairs, platformById, movement, issues);
  validateGoldenPairCoverage(realm, linkByKey, issues);
  validateHazardLanes(realm.hazards, linkByKey, platformById, issues);
  validateAgentSamples(agentRun, realm.links, platformById, movement, issues);

  const metrics = computeSpatialMetrics(realm, agentRun, issues);
  const start = createGoalPost(realm.startPlatformId, startPlatform, movement, issues, "start");
  const exit = createGoalPost(realm.exitPlatformId, exitPlatform, movement, issues, "exit");

  return {
    valid: issues.length === 0,
    issues,
    start,
    exit,
    metrics,
  };
}

export function getPlatformTopCenter(platform: RealmPlatform): Vec3 {
  return {
    x: platform.position.x,
    y: round(platform.position.y + platform.size.y / 2, 3),
    z: platform.position.z,
  };
}

export function getPlatformAgentPosition(platform: RealmPlatform): Vec3 {
  const top = getPlatformTopCenter(platform);

  return {
    x: top.x,
    y: round(top.y + AGENT_HEIGHT, 3),
    z: top.z,
  };
}

export function getPlatformBodyPosition(platform: RealmPlatform): Vec3 {
  const top = getPlatformTopCenter(platform);

  return {
    x: top.x,
    y: round(top.y + 0.42, 3),
    z: top.z,
  };
}

function validateGoalPosts(
  realm: RealmClimb,
  startPlatform: RealmPlatform | null,
  exitPlatform: RealmPlatform | null,
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[]
) {
  if (!startPlatform) {
    issues.push({
      code: "missing-start-platform",
      message: "Declared start platform does not exist.",
      platformId: realm.startPlatformId,
    });
  }

  if (!exitPlatform) {
    issues.push({
      code: "missing-exit-platform",
      message: "Declared exit platform does not exist.",
      platformId: realm.exitPlatformId,
    });
  }

  if (realm.goldenPath[0] !== realm.startPlatformId) {
    issues.push({
      code: "start-not-first",
      message: "Golden path must start on the declared start platform.",
      from: realm.goldenPath[0],
      to: realm.startPlatformId,
    });
  }

  if (realm.goldenPath.at(-1) !== realm.exitPlatformId) {
    issues.push({
      code: "exit-not-last",
      message: "Golden path must end on the declared exit platform.",
      from: realm.goldenPath.at(-1),
      to: realm.exitPlatformId,
    });
  }

  if (startPlatform && startPlatform.kind !== "start") {
    issues.push({
      code: "start-kind-mismatch",
      message: "Start platform must use the start kind for visual readability.",
      platformId: startPlatform.id,
    });
  }

  if (exitPlatform && exitPlatform.kind !== "gate") {
    issues.push({
      code: "exit-kind-mismatch",
      message: "Exit platform must use the gate kind for visual readability.",
      platformId: exitPlatform.id,
    });
  }

  validateGoalPostLanding("start", startPlatform, movement, issues);
  validateGoalPostLanding("exit", exitPlatform, movement, issues);
  validateGoalPostHazards("start", startPlatform, realm.hazards, movement, issues);
  validateGoalPostHazards("exit", exitPlatform, realm.hazards, movement, issues);
}

function validateGoalPostLanding(
  kind: "start" | "exit",
  platform: RealmPlatform | null,
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[]
) {
  if (!platform) {
    return;
  }

  const clearance = getLandingClearance(platform, movement);
  if (clearance < movement.minLandingSize) {
    issues.push({
      code: kind === "start" ? "start-landing-too-small" : "exit-landing-too-small",
      message: `${kind} platform does not leave enough clean top surface for a reliable spawn/goal post.`,
      platformId: platform.id,
      value: round(clearance, 2),
      limit: movement.minLandingSize,
    });
  }
}

function validateGoalPostHazards(
  kind: "start" | "exit",
  platform: RealmPlatform | null,
  hazards: RealmHazard[],
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[]
) {
  if (!platform) {
    return;
  }

  const top = getPlatformTopCenter(platform);
  for (const hazard of hazards) {
    const verticalDistance = Math.abs(hazard.position.y - top.y);
    const horizontalDistance = distance2d(hazard.position, platform.position);
    const overlapLimit = hazard.radius + movement.playerRadius;

    if (verticalDistance <= 1.1 && horizontalDistance <= overlapLimit) {
      issues.push({
        code: kind === "start" ? "hazard-overlaps-start" : "hazard-overlaps-exit",
        message: `${kind} platform has a hazard lane inside the clean spawn/goal disk.`,
        platformId: platform.id,
        value: round(horizontalDistance, 2),
        limit: round(overlapLimit, 2),
      });
    }
  }
}

function validateRouteLinks(
  links: RealmRouteLink[],
  goldenPairs: Set<string>,
  platformById: Map<string, RealmPlatform>,
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[]
) {
  const maxWalkGap = getMaxWalkGap(movement);

  for (const link of links) {
    const key = routeKey(link.from, link.to);
    const from = platformById.get(link.from);
    const to = platformById.get(link.to);

    if (!goldenPairs.has(key)) {
      issues.push({
        code: "route-link-not-golden",
        message: "Route link is not an adjacent golden-path pair.",
        from: link.from,
        to: link.to,
      });
    }

    if (!from || !to) {
      continue;
    }

    const metrics = measureRoute(from, to);
    if (
      Math.abs(link.horizontalGap - round(metrics.horizontalGap, 2)) > ROUTE_METADATA_TOLERANCE ||
      Math.abs(link.verticalDelta - round(metrics.verticalDelta, 2)) > ROUTE_METADATA_TOLERANCE ||
      Math.abs(link.clearance - round(metrics.clearance, 2)) > ROUTE_METADATA_TOLERANCE
    ) {
      issues.push({
        code: "route-link-metadata-mismatch",
        message: "Route link metadata no longer matches platform geometry.",
        from: link.from,
        to: link.to,
      });
    }

    if (link.move === "walk" && metrics.horizontalGap > maxWalkGap) {
      issues.push({
        code: "walk-link-has-visible-gap",
        message: "Walk-classified route link has a visible air gap and should be a jump.",
        from: link.from,
        to: link.to,
        value: round(metrics.horizontalGap, 2),
        limit: round(maxWalkGap, 2),
      });
    }
  }
}

function validateGoldenPairCoverage(
  realm: RealmClimb,
  linkByKey: Map<string, RealmRouteLink>,
  issues: RealmSpatialIssue[]
) {
  for (let index = 1; index < realm.goldenPath.length; index++) {
    const from = realm.goldenPath[index - 1];
    const to = realm.goldenPath[index];

    if (!linkByKey.has(routeKey(from, to))) {
      issues.push({
        code: "missing-route-link",
        message: "Adjacent golden-path platforms need a route link for rendering and traversal.",
        from,
        to,
      });
    }
  }
}

function validateHazardLanes(
  hazards: RealmHazard[],
  linkByKey: Map<string, RealmRouteLink>,
  platformById: Map<string, RealmPlatform>,
  issues: RealmSpatialIssue[]
) {
  for (const hazard of hazards) {
    const [fromId, toId] = hazard.between;
    const link = linkByKey.get(routeKey(fromId, toId));
    const from = platformById.get(fromId);
    const to = platformById.get(toId);

    if (!link || !from || !to) {
      issues.push({
        code: "hazard-lane-missing-link",
        message: "Hazard lane must be anchored to a valid route link.",
        from: fromId,
        to: toId,
      });
      continue;
    }

    const midpoint = midpoint3d(from.position, to.position);
    const offset = distance2d(hazard.position, midpoint);
    if (offset > hazard.radius + ROUTE_CORRIDOR_PADDING) {
      issues.push({
        code: "hazard-lane-off-center",
        message: "Hazard lane is too far from the route segment it claims to pressure.",
        from: fromId,
        to: toId,
        value: round(offset, 2),
        limit: round(hazard.radius + ROUTE_CORRIDOR_PADDING, 2),
      });
    }
  }
}

function validateAgentSamples(
  agentRun: RealmAgentRun,
  links: RealmRouteLink[],
  platformById: Map<string, RealmPlatform>,
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[]
) {
  const linkBySegment = new Map(links.map((link) => [routeKey(link.from, link.to), link]));

  agentRun.samples.forEach((sample, sampleIndex) => {
    if (sample.state === "landed" || sample.state === "extracted") {
      const platform = platformById.get(sample.platformId);
      if (!platform) {
        issues.push({
          code: "landing-sample-missing-platform",
          message: "Agent landing sample references a missing platform.",
          platformId: sample.platformId,
          sampleIndex,
        });
        return;
      }

      validateLandingSample(
        sample.position,
        platform,
        sample.platformId,
        sampleIndex,
        movement,
        issues
      );
      return;
    }

    const segment = agentRun.segments[sample.segmentIndex];
    if (!segment) {
      return;
    }

    const link = linkBySegment.get(routeKey(segment.fromPlatformId, segment.toPlatformId));
    const from = platformById.get(segment.fromPlatformId);
    const to = platformById.get(segment.toPlatformId);
    if (!link || !from || !to) {
      issues.push({
        code: "agent-segment-missing-link",
        message: "Agent sample belongs to a segment without a valid route link.",
        from: segment.fromPlatformId,
        to: segment.toPlatformId,
        sampleIndex,
      });
      return;
    }

    const corridorDistance = distanceToSegment2d(sample.position, from.position, to.position);
    const corridorLimit =
      Math.max(horizontalRadius(from.size), horizontalRadius(to.size)) + ROUTE_CORRIDOR_PADDING;
    if (corridorDistance > corridorLimit) {
      issues.push({
        code: "agent-sample-outside-route-corridor",
        message: "Agent sample left the expected corridor between route platforms.",
        from: segment.fromPlatformId,
        to: segment.toPlatformId,
        sampleIndex,
        value: round(corridorDistance, 2),
        limit: round(corridorLimit, 2),
      });
    }
  });
}

function validateLandingSample(
  position: Vec3,
  platform: RealmPlatform,
  platformId: string,
  sampleIndex: number,
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[]
) {
  if (!isInsidePlatformFootprint(position, platform, movement.playerRadius)) {
    issues.push({
      code: "landing-sample-outside-platform",
      message: "Agent landing sample is not inside the platform top surface.",
      platformId,
      sampleIndex,
    });
  }

  const expectedY = getPlatformAgentPosition(platform).y;
  const heightDelta = Math.abs(position.y - expectedY);
  if (heightDelta > LANDING_HEIGHT_TOLERANCE) {
    issues.push({
      code: "landing-sample-height-mismatch",
      message: "Agent landing sample height no longer matches the platform top surface.",
      platformId,
      sampleIndex,
      value: round(heightDelta, 3),
      limit: LANDING_HEIGHT_TOLERANCE,
    });
  }
}

function computeSpatialMetrics(
  realm: RealmClimb,
  agentRun: RealmAgentRun,
  issues: RealmSpatialIssue[]
): RealmSpatialMetrics {
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const routeMetrics = realm.links
    .map((link) => {
      const from = platformById.get(link.from);
      const to = platformById.get(link.to);
      return from && to ? { link, metrics: measureRoute(from, to) } : null;
    })
    .filter((entry): entry is { link: RealmRouteLink; metrics: ReturnType<typeof measureRoute> } =>
      Boolean(entry)
    );
  const landingSamples = agentRun.samples.filter(
    (sample) => sample.state === "landed" || sample.state === "extracted"
  );
  const unsupportedLandingSampleCount = issues.filter(
    (issue) =>
      issue.code === "landing-sample-missing-platform" ||
      issue.code === "landing-sample-outside-platform" ||
      issue.code === "landing-sample-height-mismatch"
  ).length;

  return {
    routeLinkCount: realm.links.length,
    hazardLaneCount: realm.hazards.length,
    agentSampleCount: agentRun.samples.length,
    landedSampleCount: landingSamples.length,
    supportedLandingSampleCount: Math.max(0, landingSamples.length - unsupportedLandingSampleCount),
    unsupportedLandingSampleCount,
    maximumRouteGap: round(
      Math.max(0, ...routeMetrics.map((entry) => entry.metrics.horizontalGap)),
      2
    ),
    maximumCenterDistance: round(
      Math.max(0, ...routeMetrics.map((entry) => entry.metrics.centerDistance)),
      2
    ),
    maximumVerticalDelta: round(
      Math.max(0, ...routeMetrics.map((entry) => Math.abs(entry.metrics.verticalDelta))),
      2
    ),
    minimumLandingClearance: getMinimumGoldenPathLandingClearance(realm, platformById),
    maximumWalkGap: round(
      Math.max(
        0,
        ...routeMetrics
          .filter((entry) => entry.link.move === "walk")
          .map((entry) => entry.metrics.horizontalGap)
      ),
      2
    ),
  };
}

function getMinimumGoldenPathLandingClearance(
  realm: RealmClimb,
  platformById: Map<string, RealmPlatform>
) {
  const clearances = realm.goldenPath
    .map((platformId) => platformById.get(platformId))
    .filter((platform): platform is RealmPlatform => Boolean(platform))
    .map((platform) => getLandingClearance(platform, realm.movement));

  return clearances.length > 0 ? round(Math.min(...clearances), 2) : 0;
}

function createGoalPost(
  platformId: string,
  platform: RealmPlatform | null,
  movement: RealmMovementEnvelope,
  issues: RealmSpatialIssue[],
  kind: "start" | "exit"
): RealmSpatialGoalPost {
  const clearance = platform ? round(getLandingClearance(platform, movement), 2) : 0;
  const issueCodes =
    kind === "start"
      ? new Set<RealmSpatialIssueCode>([
          "missing-start-platform",
          "start-not-first",
          "start-kind-mismatch",
          "start-landing-too-small",
          "hazard-overlaps-start",
        ])
      : new Set<RealmSpatialIssueCode>([
          "missing-exit-platform",
          "exit-not-last",
          "exit-kind-mismatch",
          "exit-landing-too-small",
          "hazard-overlaps-exit",
        ]);

  return {
    platformId: platform?.id ?? platformId ?? null,
    position: platform ? getPlatformTopCenter(platform) : null,
    clearance,
    clean: !issues.some((issue) => issueCodes.has(issue.code)),
  };
}

function createGoldenPairSet(goldenPath: string[]) {
  const pairs = new Set<string>();

  for (let index = 1; index < goldenPath.length; index++) {
    pairs.add(routeKey(goldenPath[index - 1], goldenPath[index]));
  }

  return pairs;
}

function measureRoute(from: RealmPlatform, to: RealmPlatform) {
  const centerDistance = distance2d(from.position, to.position);
  const horizontalGap = Math.max(
    0,
    centerDistance - horizontalRadius(from.size) - horizontalRadius(to.size)
  );
  const verticalDelta = to.position.y - from.position.y;
  const clearance = Math.min(to.size.x, to.size.z);

  return {
    centerDistance,
    horizontalGap,
    verticalDelta,
    clearance,
  };
}

function getLandingClearance(platform: RealmPlatform, movement: RealmMovementEnvelope) {
  return Math.max(0, Math.min(platform.size.x, platform.size.z) - movement.playerRadius * 2);
}

function getMaxWalkGap(movement: RealmMovementEnvelope) {
  return Math.max(0.18, movement.playerRadius * 0.65);
}

function isInsidePlatformFootprint(position: Vec3, platform: RealmPlatform, margin: number) {
  const halfX = platform.size.x / 2 - margin;
  const halfZ = platform.size.z / 2 - margin;

  return (
    halfX >= 0 &&
    halfZ >= 0 &&
    Math.abs(position.x - platform.position.x) <= halfX + 0.001 &&
    Math.abs(position.z - platform.position.z) <= halfZ + 0.001
  );
}

function distanceToSegment2d(point: Vec3, start: Vec3, end: Vec3) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;

  if (lengthSquared === 0) {
    return distance2d(point, start);
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared)
  );
  const projected = {
    x: start.x + dx * t,
    y: 0,
    z: start.z + dz * t,
  };

  return distance2d(point, projected);
}

function midpoint3d(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

function horizontalRadius(size: Vec3): number {
  return Math.min(size.x, size.z) / 2;
}

function distance2d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function routeKey(from: string, to: string) {
  return `${from}->${to}`;
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
