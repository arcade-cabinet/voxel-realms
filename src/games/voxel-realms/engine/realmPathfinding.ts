import type {
  RealmClimb,
  RealmMovementEnvelope,
  RealmPlatform,
  RealmRouteMove,
} from "./realmClimber";

export type RealmPathfindingIssueCode =
  | "missing-start-platform"
  | "missing-exit-platform"
  | "exit-unreachable"
  | "golden-path-diverged"
  | "golden-step-unreachable"
  | "route-link-not-traversable";

export interface RealmPathfindingIssue {
  code: RealmPathfindingIssueCode;
  message: string;
  from?: string;
  to?: string;
  value?: number;
  limit?: number;
}

export interface RealmTraversalEdge {
  from: string;
  to: string;
  move: RealmRouteMove;
  cost: number;
  horizontalGap: number;
  verticalDelta: number;
  clearance: number;
}

export interface RealmPathfindingValidation {
  valid: boolean;
  issues: RealmPathfindingIssue[];
  discoveredPath: string[];
  discoveredPathLength: number;
  shortestPathCost: number;
  reachablePlatformCount: number;
  traversableEdgeCount: number;
  goldenStepCount: number;
  traversableGoldenStepCount: number;
  routeLinkTraversableCount: number;
  discoveredPathMatchesGoldenPath: boolean;
  goldenPathShortcutCount: number;
  goldenPathDetourCount: number;
  firstDivergentPathIndex: number | null;
  discoveredPathDivergenceCount: number;
  nonGoldenDiscoveredStepCount: number;
  maximumTraversableGap: number;
  maximumTraversableStepUp: number;
  maximumTraversableDrop: number;
  edges: RealmTraversalEdge[];
}

export function validateRealmPathfindingContract(realm: RealmClimb): RealmPathfindingValidation {
  const issues: RealmPathfindingIssue[] = [];
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const start = platformById.get(realm.startPlatformId) ?? null;
  const exit = platformById.get(realm.exitPlatformId) ?? null;
  const edges = createTraversalEdges(realm.platforms, realm.movement);
  const edgeByKey = new Map(edges.map((edge) => [routeKey(edge.from, edge.to), edge]));
  const adjacency = createAdjacency(edges);
  const nonBranchPlatformIds = new Set(
    realm.platforms.filter((platform) => platform.kind !== "branch").map((platform) => platform.id)
  );
  const routeOnlyAdjacency = createAdjacency(
    edges.filter((edge) => nonBranchPlatformIds.has(edge.from) && nonBranchPlatformIds.has(edge.to))
  );

  if (!start) {
    issues.push({
      code: "missing-start-platform",
      message: "Pathfinding cannot begin because the declared start platform is missing.",
      to: realm.startPlatformId,
    });
  }

  if (!exit) {
    issues.push({
      code: "missing-exit-platform",
      message: "Pathfinding cannot finish because the declared exit platform is missing.",
      to: realm.exitPlatformId,
    });
  }

  const search = start && exit ? findShortestPath(routeOnlyAdjacency, start.id, exit.id) : null;
  if (start && exit && search.path.length === 0) {
    issues.push({
      code: "exit-unreachable",
      message: "No movement-envelope path exists between the declared start and exit platforms.",
      from: start.id,
      to: exit.id,
    });
  }

  const goldenStepCount = Math.max(0, realm.goldenPath.length - 1);
  let traversableGoldenStepCount = 0;

  for (let index = 1; index < realm.goldenPath.length; index++) {
    const from = realm.goldenPath[index - 1];
    const to = realm.goldenPath[index];
    const edge = edgeByKey.get(routeKey(from, to));

    if (edge) {
      traversableGoldenStepCount += 1;
      continue;
    }

    const fromPlatform = platformById.get(from);
    const toPlatform = platformById.get(to);
    const metrics = fromPlatform && toPlatform ? measureTraversal(fromPlatform, toPlatform) : null;
    issues.push({
      code: "golden-step-unreachable",
      message: "An adjacent golden-path step is not traversable by the independent movement graph.",
      from,
      to,
      value: metrics ? round(metrics.horizontalGap, 2) : undefined,
      limit: realm.movement.maxJumpDistance,
    });
  }

  let routeLinkTraversableCount = 0;
  for (const link of realm.links) {
    if (edgeByKey.has(routeKey(link.from, link.to))) {
      routeLinkTraversableCount += 1;
      continue;
    }

    issues.push({
      code: "route-link-not-traversable",
      message: "A declared route link is not present in the independently derived movement graph.",
      from: link.from,
      to: link.to,
      value: link.horizontalGap,
      limit: realm.movement.maxJumpDistance,
    });
  }

  const reachablePlatformCount = start ? countReachablePlatforms(adjacency, start.id) : 0;
  const discoveredPath = search?.path ?? [];
  const discoveredPathLength = Math.max(0, discoveredPath.length - 1);
  const pathComparison = compareDiscoveredPath(realm.goldenPath, discoveredPath);
  const nonGoldenDiscoveredStepCount = countNonGoldenDiscoveredSteps(
    realm.goldenPath,
    discoveredPath
  );
  const goldenPathShortcutCount = Math.max(0, goldenStepCount - discoveredPathLength);
  const goldenPathDetourCount = Math.max(0, discoveredPathLength - goldenStepCount);

  if (discoveredPath.length > 0 && !pathComparison.matches) {
    issues.push({
      code: "golden-path-diverged",
      message:
        "The independent shortest path reaches the exit through a different platform sequence than the declared golden path.",
      from: realm.goldenPath[pathComparison.firstDivergentIndex ?? 0],
      to: discoveredPath[pathComparison.firstDivergentIndex ?? 0],
      value: pathComparison.divergenceCount,
      limit: 0,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    discoveredPath,
    discoveredPathLength,
    shortestPathCost: round(search?.cost ?? 0, 2),
    reachablePlatformCount,
    traversableEdgeCount: edges.length,
    goldenStepCount,
    traversableGoldenStepCount,
    routeLinkTraversableCount,
    discoveredPathMatchesGoldenPath: pathComparison.matches,
    goldenPathShortcutCount,
    goldenPathDetourCount,
    firstDivergentPathIndex: pathComparison.firstDivergentIndex,
    discoveredPathDivergenceCount: pathComparison.divergenceCount,
    nonGoldenDiscoveredStepCount,
    maximumTraversableGap: round(Math.max(0, ...edges.map((edge) => edge.horizontalGap)), 2),
    maximumTraversableStepUp: round(Math.max(0, ...edges.map((edge) => edge.verticalDelta)), 2),
    maximumTraversableDrop: round(Math.max(0, ...edges.map((edge) => -edge.verticalDelta)), 2),
    edges,
  };
}

function createTraversalEdges(
  platforms: RealmPlatform[],
  movement: RealmMovementEnvelope
): RealmTraversalEdge[] {
  const edges: RealmTraversalEdge[] = [];

  for (const from of platforms) {
    for (const to of platforms) {
      if (from.id === to.id) {
        continue;
      }

      const metrics = measureTraversal(from, to);
      if (!isTraversalAllowed(metrics, movement)) {
        continue;
      }

      edges.push({
        from: from.id,
        to: to.id,
        move: classifyRouteMove(metrics.horizontalGap, metrics.verticalDelta, movement),
        cost: getTraversalCost(metrics),
        horizontalGap: round(metrics.horizontalGap, 2),
        verticalDelta: round(metrics.verticalDelta, 2),
        clearance: round(metrics.clearance, 2),
      });
    }
  }

  return edges;
}

function createAdjacency(edges: RealmTraversalEdge[]) {
  const adjacency = new Map<string, RealmTraversalEdge[]>();

  for (const edge of edges) {
    const outgoing = adjacency.get(edge.from) ?? [];
    outgoing.push(edge);
    adjacency.set(edge.from, outgoing);
  }

  for (const outgoing of adjacency.values()) {
    outgoing.sort((a, b) => a.cost - b.cost || a.to.localeCompare(b.to));
  }

  return adjacency;
}

function findShortestPath(
  adjacency: Map<string, RealmTraversalEdge[]>,
  startId: string,
  exitId: string
) {
  const distances = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, string>();
  const unsettled = new Set<string>([startId]);

  while (unsettled.size > 0) {
    const current = getNearestUnsettled(unsettled, distances);
    unsettled.delete(current);

    if (current === exitId) {
      break;
    }

    for (const edge of adjacency.get(current) ?? []) {
      const nextDistance = (distances.get(current) ?? Infinity) + edge.cost;
      if (nextDistance >= (distances.get(edge.to) ?? Infinity)) {
        continue;
      }

      distances.set(edge.to, nextDistance);
      previous.set(edge.to, current);
      unsettled.add(edge.to);
    }
  }

  if (!distances.has(exitId)) {
    return { path: [], cost: Infinity };
  }

  const path: string[] = [];
  for (let cursor: string | undefined = exitId; cursor; cursor = previous.get(cursor)) {
    path.unshift(cursor);
    if (cursor === startId) {
      break;
    }
  }

  return {
    path: path[0] === startId ? path : [],
    cost: distances.get(exitId) ?? Infinity,
  };
}

function countReachablePlatforms(adjacency: Map<string, RealmTraversalEdge[]>, startId: string) {
  const visited = new Set<string>([startId]);
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) {
        continue;
      }

      visited.add(edge.to);
      queue.push(edge.to);
    }
  }

  return visited.size;
}

function compareDiscoveredPath(goldenPath: string[], discoveredPath: string[]) {
  const length = Math.max(goldenPath.length, discoveredPath.length);
  let firstDivergentIndex: number | null = null;
  let divergenceCount = 0;

  for (let index = 0; index < length; index++) {
    if (goldenPath[index] === discoveredPath[index]) {
      continue;
    }

    firstDivergentIndex ??= index;
    divergenceCount += 1;
  }

  return {
    matches: divergenceCount === 0,
    firstDivergentIndex,
    divergenceCount,
  };
}

function countNonGoldenDiscoveredSteps(goldenPath: string[], discoveredPath: string[]) {
  const goldenSteps = new Set<string>();
  let nonGoldenSteps = 0;

  for (let index = 1; index < goldenPath.length; index++) {
    goldenSteps.add(routeKey(goldenPath[index - 1], goldenPath[index]));
  }

  for (let index = 1; index < discoveredPath.length; index++) {
    if (!goldenSteps.has(routeKey(discoveredPath[index - 1], discoveredPath[index]))) {
      nonGoldenSteps += 1;
    }
  }

  return nonGoldenSteps;
}

function getNearestUnsettled(unsettled: Set<string>, distances: Map<string, number>) {
  let nearest = "";
  let nearestDistance = Infinity;

  for (const id of unsettled) {
    const distance = distances.get(id) ?? Infinity;
    if (distance < nearestDistance || (distance === nearestDistance && id < nearest)) {
      nearest = id;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function isTraversalAllowed(
  metrics: ReturnType<typeof measureTraversal>,
  movement: RealmMovementEnvelope
) {
  return (
    metrics.horizontalGap <= movement.maxJumpDistance &&
    metrics.verticalDelta <= movement.maxStepUp &&
    -metrics.verticalDelta <= movement.maxSafeDrop &&
    metrics.clearance >= movement.minLandingSize
  );
}

function getTraversalCost(metrics: ReturnType<typeof measureTraversal>) {
  const verticalCost = metrics.verticalDelta > 0 ? metrics.verticalDelta * 0.65 : 0;
  const dropCost = metrics.verticalDelta < 0 ? Math.abs(metrics.verticalDelta) * 0.18 : 0;
  const jumpCost = metrics.horizontalGap > 0.25 ? 0.75 : 0;

  return round(metrics.centerDistance + verticalCost + dropCost + jumpCost, 3);
}

function measureTraversal(from: RealmPlatform, to: RealmPlatform) {
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

function classifyRouteMove(
  horizontalGap: number,
  verticalDelta: number,
  movement: RealmMovementEnvelope
): RealmRouteMove {
  if (verticalDelta < -1.15) {
    return "drop";
  }

  if (horizontalGap > Math.max(0.18, movement.playerRadius * 0.65)) {
    return "jump";
  }

  if (verticalDelta > 1.1) {
    return "climb";
  }

  return "walk";
}

function horizontalRadius(size: { x: number; z: number }) {
  return Math.min(size.x, size.z) / 2;
}

function distance2d(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function routeKey(from: string, to: string) {
  return `${from}->${to}`;
}

function round(value: number, precision: number) {
  if (!Number.isFinite(value)) {
    return value;
  }

  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
