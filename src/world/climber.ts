import type { Vec3 } from "@engine/types";
import { getRealmAssetRuntimeModel } from "@world/asset-budget";
import seedrandom from "seedrandom";

export type RealmArchetypeId = "jungle" | "ocean" | "steampunk" | "dinosaur" | "arctic";
export type RealmPlatformKind = "start" | "route" | "rest" | "branch" | "gate";
export type RealmRouteMove = "walk" | "jump" | "climb" | "drop";
export type RealmHazardKind = "thorns" | "tide" | "steam" | "stampede" | "wind" | "ice";
export type RealmAssetFormat = "glb" | "obj" | "vox";
export type RealmAssetRole = "anchor" | "creature" | "character" | "prop" | "hazard" | "flora";

export interface RealmAssetRef {
  id: string;
  label: string;
  publicPath: string;
  format: RealmAssetFormat;
  role: RealmAssetRole;
  tags: string[];
  runtimeReady: boolean;
}

export interface RealmMovementEnvelope {
  maxJumpDistance: number;
  maxStepUp: number;
  maxSafeDrop: number;
  minLandingSize: number;
  playerRadius: number;
}

export interface RealmArchetypeRules {
  platformCount: number;
  verticalStep: [number, number];
  edgeGap: [number, number];
  platformRadius: [number, number];
  branchChance: number;
  hazardChance: number;
  routeTurn: number;
  instabilityPerStep: number;
  hazardKinds: RealmHazardKind[];
}

export interface RealmArchetype {
  id: RealmArchetypeId;
  name: string;
  description: string;
  /** Short imperative the HUD prints next to the archetype name ("Swing", "Surf", "Vent"). */
  verb: string;
  /** One-line navigation hint surfaced by the next-realm splash and the HUD tooltip. */
  verbDetail: string;
  accent: string;
  platformColor: string;
  restColor: string;
  gateColor: string;
  hazardColor: string;
  rules: RealmArchetypeRules;
  assets: RealmAssetRef[];
}

export interface RealmPlatform {
  id: string;
  index: number;
  kind: RealmPlatformKind;
  position: Vec3;
  size: Vec3;
  color: string;
}

export interface RealmRouteLink {
  from: string;
  to: string;
  move: RealmRouteMove;
  horizontalGap: number;
  verticalDelta: number;
  clearance: number;
}

export interface RealmHazard {
  id: string;
  kind: RealmHazardKind;
  position: Vec3;
  radius: number;
  severity: number;
  color: string;
  between: [string, string];
}

export interface RealmAnomaly {
  id: string;
  label: string;
  platformId: string;
  position: Vec3;
  scanRadius: number;
  asset: RealmAssetRef;
}

export interface GoldenPathIssue {
  code:
    | "missing-platform"
    | "wrong-start"
    | "wrong-exit"
    | "short-path"
    | "gap-too-wide"
    | "step-too-high"
    | "drop-too-deep"
    | "landing-too-small";
  message: string;
  from?: string;
  to?: string;
  value?: number;
  limit?: number;
}

export interface GoldenPathValidation {
  valid: boolean;
  stepsChecked: number;
  issues: GoldenPathIssue[];
  maximumHorizontalGap: number;
  maximumStepUp: number;
  maximumDrop: number;
}

export interface RealmNarrative {
  title: string;
  objective: string;
  exitCallout: string;
}

export interface RealmClimb {
  seed: string;
  archetype: RealmArchetype;
  movement: RealmMovementEnvelope;
  platforms: RealmPlatform[];
  hazards: RealmHazard[];
  anomalies: RealmAnomaly[];
  goldenPath: string[];
  links: RealmRouteLink[];
  startPlatformId: string;
  exitPlatformId: string;
  instabilityBudget: number;
  narrative: RealmNarrative;
  validation: GoldenPathValidation;
}

export interface RealmProgressEvaluation {
  nearestPlatformId: string | null;
  nearestPlatformDistance: number;
  nearestAnomalyId: string | null;
  nearestAnomalyLabel: string | null;
  nearestAnomalyDistance: number;
  scannedAnomaly: RealmAnomaly | null;
  pathIndex: number;
  routeProgress: number;
  scanProgress: number;
  objectiveProgress: number;
  reachedExit: boolean;
  extractionReady: boolean;
  objective: string;
}

export interface GenerateRealmClimbOptions {
  seed: string;
  archetype?: RealmArchetypeId;
  movement?: Partial<RealmMovementEnvelope>;
  platformCount?: number;
}

type RealmClimbCandidate = Omit<RealmClimb, "validation"> & {
  validation?: GoldenPathValidation;
};

export const DEFAULT_REALM_SEED = "chaos-goblin-first-ascent";

export const DEFAULT_MOVEMENT_ENVELOPE: RealmMovementEnvelope = {
  maxJumpDistance: 4.25,
  maxStepUp: 2.6,
  maxSafeDrop: 5.2,
  minLandingSize: 2.6,
  playerRadius: 0.4,
};

const PRIMARY_SIGNAL_ROLES: RealmAssetRole[] = ["anchor", "creature", "character", "flora"];
const ANOMALY_SLOT_ROLE_PLAN: RealmAssetRole[][] = [
  PRIMARY_SIGNAL_ROLES,
  ["hazard", "prop", "flora", "creature"],
  ["character", "creature", "anchor", "prop"],
  ["flora", "prop", "creature", "character"],
  ["prop", "hazard", "character", "creature"],
];

const CHAOS_ASSETS: Record<string, RealmAssetRef> = {
  ankylosaurus: {
    id: "ankylosaurus",
    label: "Ankylosaurus",
    publicPath: "/assets/models/chaos-slice/voxel-dinosaurs-pack/Ankylosaurus.glb",
    format: "glb",
    role: "creature",
    tags: ["dinosaur", "heavy", "hazard"],
    runtimeReady: true,
  },
  bull: {
    id: "bull",
    label: "Bull",
    publicPath: "/assets/models/chaos-slice/farm-animals-pack-upload-v2/Bull.glb",
    format: "glb",
    role: "creature",
    tags: ["animal", "stampede"],
    runtimeReady: true,
  },
  cabinet: {
    id: "cabinet",
    label: "Survey Cabinet",
    publicPath: "/assets/models/chaos-slice/voxel-props-pack/Cabinet2_glt.glb",
    format: "glb",
    role: "prop",
    tags: ["camp", "storage"],
    runtimeReady: true,
  },
  clown: {
    id: "clown",
    label: "Clown Intrusion",
    publicPath: "/assets/models/chaos-slice/gltf-files/Clown_Character_glt.glb",
    format: "glb",
    role: "character",
    tags: ["intrusion", "character"],
    runtimeReady: true,
  },
  dwarf: {
    id: "dwarf",
    label: "Dwarf Surveyor",
    publicPath: "/assets/models/chaos-slice/voxel-dwarf-characters-pack/Dwarf 05.glb",
    format: "glb",
    role: "character",
    tags: ["stone", "character"],
    runtimeReady: true,
  },
  giraffe: {
    id: "giraffe",
    label: "Giraffe",
    publicPath: "/assets/models/chaos-slice/voxel-african-animals-pack/Giraffe.glb",
    format: "glb",
    role: "creature",
    tags: ["animal", "tall", "savanna"],
    runtimeReady: true,
  },
  goblin: {
    id: "goblin",
    label: "Goblin Signal",
    publicPath: "/assets/models/chaos-slice/goblin-characters-pack-upload/Goblin 3.glb",
    format: "glb",
    role: "character",
    tags: ["intrusion", "character"],
    runtimeReady: true,
  },
  griffin: {
    id: "griffin",
    label: "Griffin",
    publicPath: "/assets/models/chaos-slice/voxel-mythical-creatures-pack/Griffin.glb",
    format: "glb",
    role: "creature",
    tags: ["myth", "flight"],
    runtimeReady: true,
  },
  honeycomb: {
    id: "honeycomb",
    label: "Honeycomb",
    publicPath: "/assets/models/chaos-slice/beekeeer-upload/Honeycomb.glb",
    format: "glb",
    role: "prop",
    tags: ["jungle", "flora", "resource"],
    runtimeReady: true,
  },
  housePiece: {
    id: "house-piece",
    label: "Broken House Piece",
    publicPath: "/assets/models/chaos-slice/modular-house-pack/Piece-69.obj",
    format: "obj",
    role: "prop",
    tags: ["ruin", "structure"],
    runtimeReady: false,
  },
  mermaid: {
    id: "mermaid",
    label: "Mermaid Echo",
    publicPath:
      "/assets/models/chaos-slice/voxel-mermaid-characters-pack-upload/MermaidFemale03.glb",
    format: "glb",
    role: "character",
    tags: ["ocean", "character"],
    runtimeReady: true,
  },
  mother: {
    id: "mother",
    label: "Neanderthal Mother",
    publicPath: "/assets/models/chaos-slice/voxel-neanderthal-characters-pack/Mother.glb",
    format: "glb",
    role: "character",
    tags: ["ancient", "character"],
    runtimeReady: true,
  },
  octopus: {
    id: "octopus",
    label: "Octopus",
    publicPath: "/assets/models/chaos-slice/voxel-ocean-animals-pack/Octopus.glb",
    format: "glb",
    role: "creature",
    tags: ["ocean", "creature"],
    runtimeReady: true,
  },
  osprey: {
    id: "osprey",
    label: "Osprey",
    publicPath: "/assets/models/chaos-slice/voxel-birds-pack/Osprey.glb",
    format: "glb",
    role: "creature",
    tags: ["flight", "animal"],
    runtimeReady: true,
  },
  plant: {
    id: "plant",
    label: "Realm Plant",
    publicPath: "/assets/models/chaos-slice/new-plants/Plant_04.glb",
    format: "glb",
    role: "flora",
    tags: ["jungle", "flora"],
    runtimeReady: true,
  },
  plantShard: {
    id: "plant-shard",
    label: "Plant Shard",
    publicPath: "/assets/models/chaos-slice/plant-pack/Plant_11_glt.glb",
    format: "glb",
    role: "flora",
    tags: ["flora", "resource"],
    runtimeReady: true,
  },
  python: {
    id: "python",
    label: "Python",
    publicPath: "/assets/models/chaos-slice/jungle-animals-pack/Python.glb",
    format: "glb",
    role: "creature",
    tags: ["jungle", "creature"],
    runtimeReady: true,
  },
  samurai: {
    id: "samurai",
    label: "Ronin Signal",
    publicPath: "/assets/models/chaos-slice/voxel-ronin-samurai-pack/Samurai GLTF.glb",
    format: "glb",
    role: "character",
    tags: ["character", "blade"],
    runtimeReady: true,
  },
  seal: {
    id: "seal",
    label: "Seal",
    publicPath: "/assets/models/chaos-slice/voxel-arctic-animals-pack/Seal.glb",
    format: "glb",
    role: "creature",
    tags: ["arctic", "ocean"],
    runtimeReady: true,
  },
  squirrel: {
    id: "squirrel",
    label: "Squirrel",
    publicPath: "/assets/models/chaos-slice/voxel-forest-animals-pack/Squirrel.glb",
    format: "glb",
    role: "creature",
    tags: ["forest", "animal"],
    runtimeReady: true,
  },
  steampunk: {
    id: "steampunk",
    label: "Steampunk Scout",
    publicPath: "/assets/models/chaos-slice/voxel-steampunk-characters-pack/Female_A1.glb",
    format: "glb",
    role: "character",
    tags: ["steampunk", "character"],
    runtimeReady: true,
  },
  sword: {
    id: "sword",
    label: "Sword Relic",
    publicPath: "/assets/models/chaos-slice/voxel-weapons-pack-1/Sword_10_Gltf.glb",
    format: "glb",
    role: "prop",
    tags: ["relic", "blade"],
    runtimeReady: true,
  },
  trap: {
    id: "trap",
    label: "Trap",
    publicPath: "/assets/models/chaos-slice/trap-pack-upload/trap 18.glb",
    format: "glb",
    role: "hazard",
    tags: ["hazard", "mechanical"],
    runtimeReady: true,
  },
  tree: {
    id: "tree",
    label: "Tall Tree",
    publicPath: "/assets/models/chaos-slice/all-trees-uploads/Tree 10_2.glb",
    format: "glb",
    role: "flora",
    tags: ["forest", "jungle", "vertical"],
    runtimeReady: true,
  },
  viking: {
    id: "viking",
    label: "Viking Echo",
    publicPath: "/assets/models/chaos-slice/voxel-viking-characters-upload/Male_D1.glb",
    format: "glb",
    role: "character",
    tags: ["arctic", "character"],
    runtimeReady: true,
  },
  voxHouse: {
    id: "vox-house",
    label: "VOX House Reference",
    publicPath: "/assets/models/chaos-slice/vox-modular-houses-pack/Modular House Pack Vox-72.vox",
    format: "vox",
    role: "prop",
    tags: ["structure", "reference"],
    runtimeReady: false,
  },
  woodDragon: {
    id: "wood-dragon",
    label: "Wood Dragon",
    publicPath: "/assets/models/chaos-slice/voxel-baby-dragons-pack/Wood_B_Dragon.glb",
    format: "glb",
    role: "creature",
    tags: ["myth", "forest"],
    runtimeReady: true,
  },
};

export const REALM_ARCHETYPE_IDS: RealmArchetypeId[] = [
  "jungle",
  "ocean",
  "steampunk",
  "dinosaur",
  "arctic",
];

export const REALM_ARCHETYPES: Record<RealmArchetypeId, RealmArchetype> = {
  jungle: {
    id: "jungle",
    name: "Jungle",
    description: "Tall vegetation, animal silhouettes, and vine-like side routes.",
    verb: "Swing",
    verbDetail: "Layered canopy routes. Creatures signal between the branches.",
    accent: "#84cc16",
    platformColor: "#2f7d3f",
    restColor: "#5c8f2f",
    gateColor: "#d9f99d",
    hazardColor: "#a3e635",
    rules: {
      platformCount: 14,
      verticalStep: [1.35, 2.25],
      edgeGap: [0.85, 3.05],
      platformRadius: [2.05, 3.25],
      branchChance: 0.42,
      hazardChance: 0.34,
      routeTurn: 0.58,
      instabilityPerStep: 6,
      hazardKinds: ["thorns", "wind"],
    },
    assets: pickAssets([
      "tree",
      "plant",
      "plantShard",
      "python",
      "squirrel",
      "honeycomb",
      "woodDragon",
    ]),
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Floating ruins, tide gaps, and sea-life anomalies above the shoreline.",
    verb: "Surf",
    verbDetail: "Floating platforms over open water. Tide sets the beat of the climb.",
    accent: "#38bdf8",
    platformColor: "#0f7490",
    restColor: "#2dd4bf",
    gateColor: "#bae6fd",
    hazardColor: "#0ea5e9",
    rules: {
      platformCount: 13,
      verticalStep: [1.2, 2.05],
      edgeGap: [1.15, 3.45],
      platformRadius: [2.15, 3.55],
      branchChance: 0.36,
      hazardChance: 0.42,
      routeTurn: 0.52,
      instabilityPerStep: 7,
      hazardKinds: ["tide", "wind"],
    },
    assets: pickAssets(["octopus", "mermaid", "seal", "osprey", "housePiece", "voxHouse"]),
  },
  steampunk: {
    id: "steampunk",
    name: "Steampunk",
    description: "Pressure gates, brass machinery, and narrow mechanical climbs.",
    verb: "Vent",
    verbDetail: "Brass and pressure. Industrial platforms, timed hazard pulses.",
    accent: "#f59e0b",
    platformColor: "#8a5a2d",
    restColor: "#b7791f",
    gateColor: "#fde68a",
    hazardColor: "#fb923c",
    rules: {
      platformCount: 15,
      verticalStep: [1.0, 2.35],
      edgeGap: [0.75, 3.2],
      platformRadius: [1.95, 3.05],
      branchChance: 0.28,
      hazardChance: 0.48,
      routeTurn: 0.46,
      instabilityPerStep: 8,
      hazardKinds: ["steam", "wind"],
    },
    assets: pickAssets(["steampunk", "trap", "cabinet", "sword", "clown", "housePiece"]),
  },
  dinosaur: {
    id: "dinosaur",
    name: "Dinosaur",
    description: "Large ancient platforms with heavy moving-threat lanes.",
    verb: "Stomp",
    verbDetail: "Broad ledges. Heavier silhouettes, longer jumps, heavier falls.",
    accent: "#bef264",
    platformColor: "#766141",
    restColor: "#9a7f4f",
    gateColor: "#ecfccb",
    hazardColor: "#dc2626",
    rules: {
      platformCount: 12,
      verticalStep: [1.25, 2.4],
      edgeGap: [0.9, 2.9],
      platformRadius: [2.65, 4.05],
      branchChance: 0.3,
      hazardChance: 0.4,
      routeTurn: 0.5,
      instabilityPerStep: 9,
      hazardKinds: ["stampede", "thorns"],
    },
    assets: pickAssets(["ankylosaurus", "bull", "griffin", "mother", "woodDragon", "giraffe"]),
  },
  arctic: {
    id: "arctic",
    name: "Arctic",
    description: "Cold exposed landings, wind gaps, and readable ice rest points.",
    verb: "Glide",
    verbDetail: "Thin ice, low-key light. Sparse landings, narrow margin.",
    accent: "#dbeafe",
    platformColor: "#94a3b8",
    restColor: "#bfdbfe",
    gateColor: "#f8fafc",
    hazardColor: "#67e8f9",
    rules: {
      platformCount: 13,
      verticalStep: [1.15, 2.18],
      edgeGap: [1.05, 3.35],
      platformRadius: [2.05, 3.35],
      branchChance: 0.34,
      hazardChance: 0.44,
      routeTurn: 0.54,
      instabilityPerStep: 7,
      hazardKinds: ["ice", "wind"],
    },
    assets: pickAssets(["seal", "viking", "dwarf", "osprey", "samurai", "goblin"]),
  },
};

export function pickRealmArchetype(seed: string): RealmArchetypeId {
  return REALM_ARCHETYPE_IDS[seedToUint32(seed) % REALM_ARCHETYPE_IDS.length];
}

export function generateRealmClimb(options: GenerateRealmClimbOptions | string): RealmClimb {
  const normalized = typeof options === "string" ? { seed: options } : options;
  const seed = normalized.seed;
  const archetype = REALM_ARCHETYPES[normalized.archetype ?? pickRealmArchetype(seed)];
  const movement = {
    ...DEFAULT_MOVEMENT_ENVELOPE,
    ...normalized.movement,
  };
  const rng = createRng(`${seed}:${archetype.id}`);
  const platformCount = clampInt(normalized.platformCount ?? archetype.rules.platformCount, 8, 24);
  const routePlatforms = createRoutePlatforms(seed, archetype, movement, platformCount, rng);
  const branchPlatforms = createBranchPlatforms(archetype, movement, routePlatforms, rng);
  const platforms = [...routePlatforms, ...branchPlatforms];
  const goldenPath = routePlatforms.map((platform) => platform.id);
  const links = createGoldenPathLinks(routePlatforms, movement);
  const hazards = createHazards(archetype, links, routePlatforms, rng);
  const anomalies = createAnomalies(archetype, routePlatforms, branchPlatforms, rng);
  const startPlatformId = routePlatforms[0]?.id ?? "missing-start";
  const exitPlatformId = routePlatforms[routePlatforms.length - 1]?.id ?? "missing-exit";
  const candidate: RealmClimbCandidate = {
    seed,
    archetype,
    movement,
    platforms,
    hazards,
    anomalies,
    goldenPath,
    links,
    startPlatformId,
    exitPlatformId,
    instabilityBudget: Math.round(platformCount * archetype.rules.instabilityPerStep),
    narrative: {
      title: `${archetype.name} ascent ${shortSeed(seed)}`,
      objective: `Validate a ${platformCount}-platform golden path and scan the ${archetype.name.toLowerCase()} anomaly cluster.`,
      exitCallout: `Exit gate stabilized above platform ${platformCount}.`,
    },
  };

  return {
    ...candidate,
    validation: validateGoldenPath(candidate, movement),
  };
}

export function createGoldenPathLinks(
  platforms: RealmPlatform[],
  movement: RealmMovementEnvelope = DEFAULT_MOVEMENT_ENVELOPE
): RealmRouteLink[] {
  return platforms.slice(1).map((platform, index) => {
    const from = platforms[index];
    const to = platform;
    const metrics = measureTraversal(from, to);

    return {
      from: from.id,
      to: to.id,
      move: classifyRouteMove(metrics.horizontalGap, metrics.verticalDelta, movement),
      horizontalGap: round(metrics.horizontalGap, 2),
      verticalDelta: round(metrics.verticalDelta, 2),
      clearance: round(metrics.clearance, 2),
    };
  });
}

export function validateGoldenPath(
  realm: RealmClimbCandidate,
  movement: RealmMovementEnvelope = realm.movement
): GoldenPathValidation {
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const issues: GoldenPathIssue[] = [];
  let stepsChecked = 0;
  let maximumHorizontalGap = 0;
  let maximumStepUp = 0;
  let maximumDrop = 0;

  if (realm.goldenPath.length < 2) {
    issues.push({
      code: "short-path",
      message: "A realm needs at least a start and exit platform.",
    });
  }

  if (realm.goldenPath[0] !== realm.startPlatformId) {
    issues.push({
      code: "wrong-start",
      message: "The golden path must begin at the declared start platform.",
      from: realm.goldenPath[0],
      to: realm.startPlatformId,
    });
  }

  if (realm.goldenPath[realm.goldenPath.length - 1] !== realm.exitPlatformId) {
    issues.push({
      code: "wrong-exit",
      message: "The golden path must end at the declared exit platform.",
      from: realm.goldenPath[realm.goldenPath.length - 1],
      to: realm.exitPlatformId,
    });
  }

  for (let index = 1; index < realm.goldenPath.length; index++) {
    const fromId = realm.goldenPath[index - 1];
    const toId = realm.goldenPath[index];
    const from = platformById.get(fromId);
    const to = platformById.get(toId);

    if (!from || !to) {
      issues.push({
        code: "missing-platform",
        message: "The golden path references a platform that does not exist.",
        from: fromId,
        to: toId,
      });
      continue;
    }

    stepsChecked += 1;
    const metrics = measureTraversal(from, to);
    maximumHorizontalGap = Math.max(maximumHorizontalGap, metrics.horizontalGap);
    maximumStepUp = Math.max(maximumStepUp, metrics.verticalDelta);
    maximumDrop = Math.max(maximumDrop, -metrics.verticalDelta);

    if (metrics.horizontalGap > movement.maxJumpDistance) {
      issues.push({
        code: "gap-too-wide",
        message: "The edge-to-edge gap exceeds the movement envelope.",
        from: fromId,
        to: toId,
        value: round(metrics.horizontalGap, 2),
        limit: movement.maxJumpDistance,
      });
    }

    if (metrics.verticalDelta > movement.maxStepUp) {
      issues.push({
        code: "step-too-high",
        message: "The upward step exceeds the movement envelope.",
        from: fromId,
        to: toId,
        value: round(metrics.verticalDelta, 2),
        limit: movement.maxStepUp,
      });
    }

    if (-metrics.verticalDelta > movement.maxSafeDrop) {
      issues.push({
        code: "drop-too-deep",
        message: "The downward step exceeds the safe drop envelope.",
        from: fromId,
        to: toId,
        value: round(-metrics.verticalDelta, 2),
        limit: movement.maxSafeDrop,
      });
    }

    if (metrics.clearance < movement.minLandingSize) {
      issues.push({
        code: "landing-too-small",
        message: "The target landing is too small for reliable traversal.",
        from: fromId,
        to: toId,
        value: round(metrics.clearance, 2),
        limit: movement.minLandingSize,
      });
    }
  }

  return {
    valid: issues.length === 0,
    stepsChecked,
    issues,
    maximumHorizontalGap: round(maximumHorizontalGap, 2),
    maximumStepUp: round(maximumStepUp, 2),
    maximumDrop: round(maximumDrop, 2),
  };
}

export function evaluateRealmProgress(
  realm: RealmClimb,
  position: Vec3,
  discoveredAnomalyIds: string[] = []
): RealmProgressEvaluation {
  const discovered = new Set(discoveredAnomalyIds);
  const platformById = new Map(realm.platforms.map((platform) => [platform.id, platform]));
  const goldenPlatforms = realm.goldenPath
    .map((platformId) => platformById.get(platformId))
    .filter((platform): platform is RealmPlatform => Boolean(platform));
  const nearestPlatform = findNearestPlatform(goldenPlatforms, position);
  const pathIndex = Math.max(
    0,
    nearestPlatform ? realm.goldenPath.indexOf(nearestPlatform.platform.id) : 0
  );
  const nearestAnomaly = findNearestAnomaly(realm, position, discovered);
  const scannedAnomaly =
    nearestAnomaly && nearestAnomaly.distance <= nearestAnomaly.anomaly.scanRadius
      ? nearestAnomaly.anomaly
      : null;
  const discoveredCount =
    discovered.size + (scannedAnomaly && !discovered.has(scannedAnomaly.id) ? 1 : 0);
  const routeProgress =
    realm.goldenPath.length > 1 ? pathIndex / Math.max(1, realm.goldenPath.length - 1) : 0;
  const scanProgress = realm.anomalies.length > 0 ? discoveredCount / realm.anomalies.length : 1;
  const exitPlatform = realm.platforms.find((platform) => platform.id === realm.exitPlatformId);
  const exitDistance = exitPlatform
    ? distanceToPlatformTop(position, exitPlatform)
    : Number.POSITIVE_INFINITY;
  const reachedExit = exitDistance <= 3.6;
  const extractionReady = reachedExit && discoveredCount > 0;
  const objectiveProgress = extractionReady
    ? 100
    : clamp(Math.round(routeProgress * 70 + Math.min(1, scanProgress) * 20), 0, 99);

  return {
    nearestPlatformId: nearestPlatform?.platform.id ?? null,
    nearestPlatformDistance: round(nearestPlatform?.distance ?? Number.POSITIVE_INFINITY, 2),
    nearestAnomalyId: nearestAnomaly?.anomaly.id ?? null,
    nearestAnomalyLabel: nearestAnomaly?.anomaly.label ?? null,
    nearestAnomalyDistance: round(nearestAnomaly?.distance ?? 0, 2),
    scannedAnomaly,
    pathIndex,
    routeProgress: round(routeProgress, 3),
    scanProgress: round(scanProgress, 3),
    objectiveProgress,
    reachedExit,
    extractionReady,
    objective: describeRealmObjective(
      realm,
      nearestAnomaly?.anomaly ?? null,
      scannedAnomaly,
      extractionReady
    ),
  };
}

function createRoutePlatforms(
  seed: string,
  archetype: RealmArchetype,
  movement: RealmMovementEnvelope,
  count: number,
  rng: () => number
): RealmPlatform[] {
  const platforms: RealmPlatform[] = [];
  let yaw = -Math.PI / 2 + randomRange(rng, -0.25, 0.25);
  let position: Vec3 = { x: 9, y: 1.15, z: -18 };

  for (let index = 0; index < count; index++) {
    const kind = getRoutePlatformKind(index, count);
    const radius = randomRange(
      rng,
      archetype.rules.platformRadius[0],
      archetype.rules.platformRadius[1]
    );
    const size: Vec3 = {
      x: round(radius * 2 + randomRange(rng, 0.2, 1.05), 2),
      y: kind === "gate" ? 0.72 : 0.56,
      z: round(radius * 1.8 + randomRange(rng, 0.2, 0.95), 2),
    };

    if (index > 0) {
      const previous = platforms[index - 1];
      yaw += randomRange(rng, -archetype.rules.routeTurn, archetype.rules.routeTurn);
      const previousRadius = horizontalRadius(previous.size);
      const nextRadius = Math.max(movement.minLandingSize / 2, horizontalRadius(size));
      const edgeGap = randomRange(
        rng,
        archetype.rules.edgeGap[0],
        Math.min(archetype.rules.edgeGap[1], movement.maxJumpDistance - 0.35)
      );
      const centerDistance = previousRadius + nextRadius + edgeGap;
      const verticalStep = randomRange(
        rng,
        archetype.rules.verticalStep[0],
        Math.min(archetype.rules.verticalStep[1], movement.maxStepUp - 0.18)
      );

      position = {
        x: round(position.x + Math.cos(yaw) * centerDistance, 2),
        y: round(position.y + verticalStep, 2),
        z: round(position.z + Math.sin(yaw) * centerDistance, 2),
      };
    }

    platforms.push({
      id: `realm-${slug(seed)}-${archetype.id}-${index + 1}`,
      index,
      kind,
      position,
      size,
      color: pickPlatformColor(kind, archetype, index),
    });
  }

  return platforms;
}

function createBranchPlatforms(
  archetype: RealmArchetype,
  movement: RealmMovementEnvelope,
  routePlatforms: RealmPlatform[],
  rng: () => number
): RealmPlatform[] {
  const branchPlatforms: RealmPlatform[] = [];

  for (const routePlatform of routePlatforms.slice(2, -2)) {
    if (rng() > archetype.rules.branchChance || branchPlatforms.length >= 5) {
      continue;
    }

    const radius = randomRange(
      rng,
      archetype.rules.platformRadius[0] * 0.72,
      archetype.rules.platformRadius[1] * 0.9
    );
    const size: Vec3 = {
      x: round(radius * 2, 2),
      y: 0.46,
      z: round(radius * 1.65, 2),
    };
    const side = rng() > 0.5 ? 1 : -1;
    const previous = routePlatforms[Math.max(0, routePlatform.index - 1)];
    const next = routePlatforms[Math.min(routePlatforms.length - 1, routePlatform.index + 1)];
    const routeYaw = Math.atan2(
      (next?.position.z ?? routePlatform.position.z) -
        (previous?.position.z ?? routePlatform.position.z),
      (next?.position.x ?? routePlatform.position.x) -
        (previous?.position.x ?? routePlatform.position.x)
    );
    const yaw = routeYaw + side * Math.PI * 0.5 + randomRange(rng, -0.18, 0.18);
    const distance =
      horizontalRadius(routePlatform.size) +
      horizontalRadius(size) +
      randomRange(rng, 0.45, Math.max(0.8, movement.maxJumpDistance - 1.25));

    branchPlatforms.push({
      id: `${routePlatform.id}-branch-${branchPlatforms.length + 1}`,
      index: routePlatform.index,
      kind: "branch",
      position: {
        x: round(routePlatform.position.x + Math.cos(yaw) * distance, 2),
        y: round(routePlatform.position.y + randomRange(rng, -0.7, 1.05), 2),
        z: round(routePlatform.position.z + Math.sin(yaw) * distance, 2),
      },
      size,
      color: shadeColor(archetype.platformColor, -18),
    });
  }

  return branchPlatforms;
}

function createHazards(
  archetype: RealmArchetype,
  links: RealmRouteLink[],
  routePlatforms: RealmPlatform[],
  rng: () => number
): RealmHazard[] {
  const platformById = new Map(routePlatforms.map((platform) => [platform.id, platform]));
  const hazards: RealmHazard[] = [];

  for (const link of links) {
    if (rng() > archetype.rules.hazardChance) {
      continue;
    }

    const from = platformById.get(link.from);
    const to = platformById.get(link.to);
    if (!from || !to) {
      continue;
    }

    const kind =
      archetype.rules.hazardKinds[Math.floor(rng() * archetype.rules.hazardKinds.length)];
    hazards.push({
      id: `${link.from}-hazard-${hazards.length + 1}`,
      kind,
      position: {
        x: round((from.position.x + to.position.x) / 2, 2),
        y: round(Math.min(from.position.y, to.position.y) - 0.38, 2),
        z: round((from.position.z + to.position.z) / 2, 2),
      },
      radius: round(randomRange(rng, 0.9, 1.65), 2),
      severity: round(randomRange(rng, 0.25, 0.85), 2),
      color: archetype.hazardColor,
      between: [link.from, link.to],
    });
  }

  return hazards;
}

function createAnomalies(
  archetype: RealmArchetype,
  routePlatforms: RealmPlatform[],
  branchPlatforms: RealmPlatform[],
  rng: () => number
): RealmAnomaly[] {
  const slots = [
    routePlatforms[Math.floor(routePlatforms.length * 0.38)],
    routePlatforms[Math.floor(routePlatforms.length * 0.66)],
    routePlatforms[routePlatforms.length - 1],
    ...branchPlatforms.slice(0, 2),
  ].filter(Boolean);
  const selectedAssets = selectRealmAnomalyAssets(archetype.assets, slots.length, rng);

  return slots.map((platform, index) => {
    const asset = selectedAssets[index] ?? archetype.assets[index % archetype.assets.length];

    return {
      id: `${platform.id}-anomaly-${index + 1}`,
      label: asset.label,
      platformId: platform.id,
      position: {
        x: round(platform.position.x + randomRange(rng, -0.42, 0.42), 2),
        y: round(platform.position.y + platform.size.y / 2 + 1.15, 2),
        z: round(platform.position.z + randomRange(rng, -0.42, 0.42), 2),
      },
      scanRadius: round(randomRange(rng, 2.4, 3.6), 2),
      asset,
    };
  });
}

export function selectRealmAnomalyAssets(
  assets: RealmAssetRef[],
  count: number,
  rng: () => number
): RealmAssetRef[] {
  if (count <= 0 || assets.length === 0) {
    return [];
  }

  const selected: RealmAssetRef[] = [];
  const usedAssetIds = new Set<string>();
  const runtimeAssets = assets.filter(canLoadRealmAssetAtRuntime);
  const referenceAssets = assets.filter((asset) => !canLoadRealmAssetAtRuntime(asset));
  const runtimeProtectedSlots = new Set([0, Math.min(2, count - 1)]);

  for (let index = 0; index < count; index++) {
    const preferredRoles = ANOMALY_SLOT_ROLE_PLAN[index % ANOMALY_SLOT_ROLE_PLAN.length];
    const basePool = runtimeProtectedSlots.has(index) ? runtimeAssets : assets;
    const rolePool = basePool.filter((asset) => preferredRoles.includes(asset.role));
    const asset =
      pickUniqueAsset(rolePool, usedAssetIds, rng) ??
      pickUniqueAsset(basePool, usedAssetIds, rng) ??
      pickRandomAsset(basePool, rng) ??
      pickRandomAsset(assets, rng);

    if (asset) {
      selected.push(asset);
      usedAssetIds.add(asset.id);
    }
  }

  if (
    selected.length >= 4 &&
    referenceAssets.length > 0 &&
    !selected.some((asset) => !canLoadRealmAssetAtRuntime(asset))
  ) {
    const branchFlavorIndex = selected.length - 1;
    const referenceAsset =
      pickUniqueAsset(referenceAssets, usedAssetIds, rng) ?? pickRandomAsset(referenceAssets, rng);

    if (referenceAsset) {
      usedAssetIds.delete(selected[branchFlavorIndex]?.id);
      selected[branchFlavorIndex] = referenceAsset;
      usedAssetIds.add(referenceAsset.id);
    }
  }

  return selected;
}

function measureTraversal(from: RealmPlatform, to: RealmPlatform) {
  const horizontalDistance = Math.hypot(
    to.position.x - from.position.x,
    to.position.z - from.position.z
  );
  const horizontalGap = Math.max(
    0,
    horizontalDistance - horizontalRadius(from.size) - horizontalRadius(to.size)
  );
  const verticalDelta = to.position.y - from.position.y;
  const clearance = Math.min(to.size.x, to.size.z);

  return {
    horizontalGap,
    verticalDelta,
    clearance,
  };
}

function findNearestPlatform(platforms: RealmPlatform[], position: Vec3) {
  return platforms.reduce<{
    platform: RealmPlatform;
    distance: number;
  } | null>((nearest, platform) => {
    const distance = distanceToPlatformTop(position, platform);

    return !nearest || distance < nearest.distance ? { platform, distance } : nearest;
  }, null);
}

function findNearestAnomaly(realm: RealmClimb, position: Vec3, discovered: Set<string>) {
  return realm.anomalies.reduce<{
    anomaly: RealmAnomaly;
    distance: number;
  } | null>((nearest, anomaly) => {
    if (discovered.has(anomaly.id)) {
      return nearest;
    }

    const distance = distance3d(position, anomaly.position);

    return !nearest || distance < nearest.distance ? { anomaly, distance } : nearest;
  }, null);
}

function distanceToPlatformTop(position: Vec3, platform: RealmPlatform) {
  return distance3d(position, {
    x: platform.position.x,
    y: platform.position.y + platform.size.y / 2,
    z: platform.position.z,
  });
}

function distance3d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function describeRealmObjective(
  realm: RealmClimb,
  nearestAnomaly: RealmAnomaly | null,
  scannedAnomaly: RealmAnomaly | null,
  extractionReady: boolean
) {
  if (extractionReady) {
    return "Exit gate synchronized. Extraction route confirmed.";
  }

  if (scannedAnomaly) {
    return `${scannedAnomaly.label} scanned. Keep climbing toward the exit gate.`;
  }

  if (nearestAnomaly) {
    return `Track the ${nearestAnomaly.label} signal through the ${realm.archetype.name.toLowerCase()} ascent.`;
  }

  return `Follow the validated ${realm.archetype.name.toLowerCase()} route to the exit gate.`;
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

function getRoutePlatformKind(index: number, count: number): RealmPlatformKind {
  if (index === 0) return "start";
  if (index === count - 1) return "gate";
  if (index % 4 === 0) return "rest";
  return "route";
}

function pickPlatformColor(kind: RealmPlatformKind, archetype: RealmArchetype, index: number) {
  if (kind === "start") return shadeColor(archetype.accent, -24);
  if (kind === "gate") return archetype.gateColor;
  if (kind === "rest") return archetype.restColor;

  return index % 2 === 0 ? archetype.platformColor : shadeColor(archetype.platformColor, 12);
}

function pickAssets(ids: Array<keyof typeof CHAOS_ASSETS>): RealmAssetRef[] {
  return ids.map((id) => CHAOS_ASSETS[id]);
}

export function canLoadRealmAssetAtRuntime(asset: RealmAssetRef) {
  return getRealmAssetRuntimeModel(asset).canLoadAtRuntime;
}

function pickUniqueAsset(assets: RealmAssetRef[], usedAssetIds: Set<string>, rng: () => number) {
  return pickRandomAsset(
    assets.filter((asset) => !usedAssetIds.has(asset.id)),
    rng
  );
}

function pickRandomAsset(assets: RealmAssetRef[], rng: () => number) {
  if (assets.length === 0) {
    return undefined;
  }

  return assets[Math.min(assets.length - 1, Math.floor(rng() * assets.length))];
}

function horizontalRadius(size: Vec3): number {
  return Math.min(size.x, size.z) / 2;
}

// Deterministic [0,1) RNG seeded from a string. Backed by `seedrandom`
// (alea variant, well-tested across vite/node, deterministic across
// platforms). Replaces the hand-rolled mulberry32+FNV combo this
// project carried prior to the JP port.
const createRng = (seed: string): (() => number) => seedrandom(seed);

function randomRange(rng: () => number, min: number, max: number) {
  return min + (max - min) * rng();
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

function shortSeed(seed: string) {
  return seedToUint32(seed).toString(36).slice(0, 5).toUpperCase();
}

// Deterministic uint32 from a string. seedrandom's alea variant exposes
// .int32() on the underlying PRNG; we use that as our hash function.
function seedToUint32(seed: string): number {
  const rng = seedrandom(seed, { state: false });
  // seedrandom returns a function, but the alea PRNG also exposes int32.
  // Calling the function directly gives [0,1); we scale to uint32.
  return Math.floor(rng() * 0x100000000) >>> 0;
}

function shadeColor(hex: string, percent: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const amount = Math.round(2.55 * percent);
  const red = clampColor((value >> 16) + amount);
  const green = clampColor(((value >> 8) & 0x00ff) + amount);
  const blue = clampColor((value & 0x0000ff) + amount);

  return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
}

function clampColor(value: number) {
  return Math.max(0, Math.min(255, value));
}
