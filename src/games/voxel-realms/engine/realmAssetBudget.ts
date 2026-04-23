import type { RealmAnomaly, RealmAssetRef } from "./realmClimber";
import type { Vec3 } from "./types";

export type RealmAssetPromotionTier = "inline" | "safe" | "deferred" | "reference";
export type RealmAssetModelSource = "source" | "static-variant" | "none";

export interface RealmAssetBudget {
  assetId: string;
  sizeBytes: number | null;
  sizeLabel: string;
  tier: RealmAssetPromotionTier;
  canLoadAtRuntime: boolean;
  reason: string;
}

export interface RealmStaticVariantRef {
  publicPath: string;
  sizeBytes: number;
  sourceBytes: number;
}

export interface RealmAssetRuntimeModel {
  assetId: string;
  publicPath: string | null;
  source: RealmAssetModelSource;
  tier: RealmAssetPromotionTier;
  sizeBytes: number;
  sizeLabel: string;
  canLoadAtRuntime: boolean;
  reason: string;
}

export interface RealmAssetPromotionPolicy {
  maxTier?: Extract<RealmAssetPromotionTier, "inline" | "safe">;
  maxBytes?: number;
}

export interface RealmAssetTierSummary {
  count: number;
  bytes: number;
}

export interface RealmAssetBudgetSummary {
  totalAssets: number;
  totalBytes: number;
  promotedAssets: number;
  promotedBytes: number;
  deferredAssets: number;
  referenceAssets: number;
  tiers: Record<RealmAssetPromotionTier, RealmAssetTierSummary>;
}

export interface RealmRenderableAssetPolicy extends RealmAssetPromotionPolicy {
  maxActiveModels?: number;
  maxActiveBytes?: number;
  inlineLoadRadius?: number;
  safeLoadRadius?: number;
}

export interface RealmRenderableAnomalySelection {
  anomalyId: string;
  assetId: string;
  label: string;
  tier: RealmAssetPromotionTier;
  modelTier: RealmAssetPromotionTier | null;
  modelSource: RealmAssetModelSource;
  modelPublicPath: string | null;
  distance: number;
  sizeBytes: number;
  sizeLabel: string;
  shouldRenderModel: boolean;
  reason: string;
}

export interface RealmRenderableBudgetSummary {
  totalAnomalies: number;
  selectedModels: number;
  selectedBytes: number;
  selectedBytesLabel: string;
  markerOnlyAnomalies: number;
  selectedInlineModels: number;
  selectedSafeModels: number;
  deferredAnomalies: number;
  referenceAnomalies: number;
  nearestSelected: RealmRenderableAnomalySelection | null;
}

export const REALM_ASSET_INLINE_MAX_BYTES = 750 * 1024;
export const REALM_ASSET_SAFE_MAX_BYTES = 3 * 1024 * 1024;
export const REALM_RENDERABLE_ASSET_MAX_ACTIVE_MODELS = 4;
export const REALM_RENDERABLE_ASSET_MAX_ACTIVE_BYTES = 4 * 1024 * 1024;
export const REALM_RENDERABLE_INLINE_LOAD_RADIUS = 42;
export const REALM_RENDERABLE_SAFE_LOAD_RADIUS = 18;
export const REALM_PRELOAD_INLINE_LOAD_RADIUS = 64;
export const REALM_PRELOAD_SAFE_LOAD_RADIUS = 32;

export const DEFAULT_REALM_ASSET_PROMOTION_POLICY: Required<RealmAssetPromotionPolicy> = {
  maxTier: "safe",
  maxBytes: REALM_ASSET_SAFE_MAX_BYTES,
};

export const DEFAULT_REALM_RENDERABLE_ASSET_POLICY: Required<RealmRenderableAssetPolicy> = {
  ...DEFAULT_REALM_ASSET_PROMOTION_POLICY,
  maxActiveModels: REALM_RENDERABLE_ASSET_MAX_ACTIVE_MODELS,
  maxActiveBytes: REALM_RENDERABLE_ASSET_MAX_ACTIVE_BYTES,
  inlineLoadRadius: REALM_RENDERABLE_INLINE_LOAD_RADIUS,
  safeLoadRadius: REALM_RENDERABLE_SAFE_LOAD_RADIUS,
};

export const DEFAULT_REALM_PRELOAD_ASSET_POLICY: Required<RealmRenderableAssetPolicy> = {
  ...DEFAULT_REALM_RENDERABLE_ASSET_POLICY,
  inlineLoadRadius: REALM_PRELOAD_INLINE_LOAD_RADIUS,
  safeLoadRadius: REALM_PRELOAD_SAFE_LOAD_RADIUS,
};

export const REALM_ASSET_SIZE_BYTES_BY_ID: Record<string, number> = {
  ankylosaurus: 2_225_544,
  bull: 2_152_184,
  cabinet: 84_552,
  clown: 27_095_428,
  dwarf: 21_775_176,
  giraffe: 2_447_540,
  goblin: 32_896_252,
  griffin: 2_606_632,
  honeycomb: 162_988,
  "house-piece": 2_301,
  mermaid: 27_369_364,
  mother: 33_652_372,
  octopus: 1_331_560,
  osprey: 1_822_292,
  plant: 220_184,
  "plant-shard": 68_920,
  python: 533_900,
  samurai: 40_171_128,
  seal: 1_255_288,
  squirrel: 1_328_944,
  steampunk: 67_202_932,
  sword: 78_224,
  trap: 656_084,
  tree: 1_839_516,
  viking: 41_309_456,
  "vox-house": 306_512,
  "wood-dragon": 1_386_708,
};

export const REALM_STATIC_VARIANT_BY_ID: Record<string, RealmStaticVariantRef> = {
  clown: {
    publicPath: "/assets/models/static-variants/clown/clown-character-glt.static.glb",
    sizeBytes: 315_752,
    sourceBytes: 27_095_428,
  },
  dwarf: {
    publicPath: "/assets/models/static-variants/dwarf/dwarf-05.static.glb",
    sizeBytes: 288_948,
    sourceBytes: 21_775_176,
  },
  goblin: {
    publicPath: "/assets/models/static-variants/goblin/goblin-3.static.glb",
    sizeBytes: 395_936,
    sourceBytes: 32_896_252,
  },
  mermaid: {
    publicPath: "/assets/models/static-variants/mermaid/mermaidfemale03.static.glb",
    sizeBytes: 327_084,
    sourceBytes: 27_369_364,
  },
  mother: {
    publicPath: "/assets/models/static-variants/mother/mother.static.glb",
    sizeBytes: 327_248,
    sourceBytes: 33_652_372,
  },
  samurai: {
    publicPath: "/assets/models/static-variants/samurai/samurai-gltf.static.glb",
    sizeBytes: 350_592,
    sourceBytes: 40_171_128,
  },
  steampunk: {
    publicPath: "/assets/models/static-variants/steampunk/female-a1.static.glb",
    sizeBytes: 562_516,
    sourceBytes: 67_202_932,
  },
  viking: {
    publicPath: "/assets/models/static-variants/viking/male-d1.static.glb",
    sizeBytes: 284_728,
    sourceBytes: 41_309_456,
  },
};

const PROMOTION_TIER_RANK: Record<RealmAssetPromotionTier, number> = {
  inline: 0,
  safe: 1,
  deferred: 2,
  reference: 3,
};

export function getRealmAssetBudget(asset: RealmAssetRef): RealmAssetBudget {
  const sizeBytes = REALM_ASSET_SIZE_BYTES_BY_ID[asset.id] ?? null;
  const sizeLabel = formatRealmAssetBytes(sizeBytes);

  if (!asset.runtimeReady || asset.format !== "glb") {
    return {
      assetId: asset.id,
      sizeBytes,
      sizeLabel,
      tier: "reference",
      canLoadAtRuntime: false,
      reason: "Needs conversion or a non-GLB loader before runtime promotion.",
    };
  }

  if (sizeBytes === null) {
    return {
      assetId: asset.id,
      sizeBytes,
      sizeLabel,
      tier: "deferred",
      canLoadAtRuntime: false,
      reason: "Size is unknown; audit before runtime promotion.",
    };
  }

  if (sizeBytes <= REALM_ASSET_INLINE_MAX_BYTES) {
    return {
      assetId: asset.id,
      sizeBytes,
      sizeLabel,
      tier: "inline",
      canLoadAtRuntime: true,
      reason: "Small GLB suitable for early marker replacement.",
    };
  }

  if (sizeBytes <= REALM_ASSET_SAFE_MAX_BYTES) {
    return {
      assetId: asset.id,
      sizeBytes,
      sizeLabel,
      tier: "safe",
      canLoadAtRuntime: true,
      reason: "Moderate GLB; load only through the promotion gate.",
    };
  }

  return {
    assetId: asset.id,
    sizeBytes,
    sizeLabel,
    tier: "deferred",
    canLoadAtRuntime: false,
    reason: "Large animated GLB; needs variant trimming before default runtime loading.",
  };
}

export function canPromoteRealmAsset(
  asset: RealmAssetRef,
  policy: RealmAssetPromotionPolicy = DEFAULT_REALM_ASSET_PROMOTION_POLICY
) {
  const budget = getRealmAssetBudget(asset);
  const maxTier = policy.maxTier ?? DEFAULT_REALM_ASSET_PROMOTION_POLICY.maxTier;
  const maxBytes = policy.maxBytes ?? DEFAULT_REALM_ASSET_PROMOTION_POLICY.maxBytes;

  return (
    budget.canLoadAtRuntime &&
    budget.sizeBytes !== null &&
    budget.sizeBytes <= maxBytes &&
    PROMOTION_TIER_RANK[budget.tier] <= PROMOTION_TIER_RANK[maxTier]
  );
}

export function getRealmAssetRuntimeModel(asset: RealmAssetRef): RealmAssetRuntimeModel {
  const sourceBudget = getRealmAssetBudget(asset);

  if (
    sourceBudget.canLoadAtRuntime &&
    sourceBudget.sizeBytes !== null &&
    (sourceBudget.tier === "inline" || sourceBudget.tier === "safe")
  ) {
    return {
      assetId: asset.id,
      publicPath: asset.publicPath,
      source: "source",
      tier: sourceBudget.tier,
      sizeBytes: sourceBudget.sizeBytes,
      sizeLabel: sourceBudget.sizeLabel,
      canLoadAtRuntime: true,
      reason: sourceBudget.reason,
    };
  }

  const staticVariant = REALM_STATIC_VARIANT_BY_ID[asset.id];
  if (staticVariant && asset.format === "glb") {
    const tier = getTierForRenderableBytes(staticVariant.sizeBytes);

    return {
      assetId: asset.id,
      publicPath: staticVariant.publicPath,
      source: "static-variant",
      tier,
      sizeBytes: staticVariant.sizeBytes,
      sizeLabel: formatRealmAssetBytes(staticVariant.sizeBytes),
      canLoadAtRuntime: tier === "inline" || tier === "safe",
      reason: "Static variant generated from deferred animated source GLB.",
    };
  }

  return {
    assetId: asset.id,
    publicPath: null,
    source: "none",
    tier: sourceBudget.tier,
    sizeBytes: 0,
    sizeLabel: "none",
    canLoadAtRuntime: false,
    reason: sourceBudget.reason,
  };
}

export function getPromotedRealmAssets(
  assets: RealmAssetRef[],
  policy: RealmAssetPromotionPolicy = DEFAULT_REALM_ASSET_PROMOTION_POLICY
) {
  return dedupeRealmAssets(assets).filter((asset) => canPromoteRealmAsset(asset, policy));
}

export function selectRenderableRealmAnomalies(
  anomalies: RealmAnomaly[],
  position: Vec3,
  policy: RealmRenderableAssetPolicy = DEFAULT_REALM_RENDERABLE_ASSET_POLICY
): RealmRenderableAnomalySelection[] {
  const normalizedPolicy = {
    ...DEFAULT_REALM_RENDERABLE_ASSET_POLICY,
    ...policy,
  };
  const candidates = anomalies.map((anomaly) => {
    const budget = getRealmAssetBudget(anomaly.asset);
    const runtimeModel = getRealmAssetRuntimeModel(anomaly.asset);
    const distance = roundDistance(distance3d(position, anomaly.position));
    const loadRadius =
      runtimeModel.tier === "inline"
        ? normalizedPolicy.inlineLoadRadius
        : normalizedPolicy.safeLoadRadius;

    if (!canPromoteRuntimeModel(runtimeModel, normalizedPolicy)) {
      return createRenderableSelection(
        anomaly,
        budget.tier,
        runtimeModel,
        distance,
        false,
        runtimeModel.reason
      );
    }

    if (distance > loadRadius) {
      return createRenderableSelection(
        anomaly,
        budget.tier,
        runtimeModel,
        distance,
        false,
        `Outside ${runtimeModel.tier} load radius.`
      );
    }

    return createRenderableSelection(
      anomaly,
      budget.tier,
      runtimeModel,
      distance,
      true,
      "Candidate in range."
    );
  });
  const activeCandidateIds = new Set<string>();
  let activeModels = 0;
  let activeBytes = 0;

  for (const candidate of candidates
    .filter((selection) => selection.shouldRenderModel)
    .sort(compareRenderableCandidates)) {
    if (activeModels >= normalizedPolicy.maxActiveModels) {
      continue;
    }

    if (activeBytes + candidate.sizeBytes > normalizedPolicy.maxActiveBytes) {
      continue;
    }

    activeCandidateIds.add(candidate.anomalyId);
    activeModels += 1;
    activeBytes += candidate.sizeBytes;
  }

  return candidates.map((selection) =>
    selection.shouldRenderModel && !activeCandidateIds.has(selection.anomalyId)
      ? {
          ...selection,
          shouldRenderModel: false,
          reason: "Skipped by active model count or byte budget.",
        }
      : selection
  );
}

export function selectPreloadRealmModelPaths(
  anomalies: RealmAnomaly[],
  position: Vec3,
  policy: RealmRenderableAssetPolicy = DEFAULT_REALM_PRELOAD_ASSET_POLICY
): string[] {
  return [
    ...new Set(
      selectRenderableRealmAnomalies(anomalies, position, policy).flatMap((selection) =>
        selection.shouldRenderModel && selection.modelPublicPath ? [selection.modelPublicPath] : []
      )
    ),
  ];
}

export function summarizeRenderableRealmAnomalies(
  anomalies: RealmAnomaly[],
  position: Vec3,
  policy: RealmRenderableAssetPolicy = DEFAULT_REALM_RENDERABLE_ASSET_POLICY
): RealmRenderableBudgetSummary {
  const selections = selectRenderableRealmAnomalies(anomalies, position, policy);
  const selected = selections.filter((selection) => selection.shouldRenderModel);
  const selectedBytes = selected.reduce((sum, selection) => sum + selection.sizeBytes, 0);

  return {
    totalAnomalies: selections.length,
    selectedModels: selected.length,
    selectedBytes,
    selectedBytesLabel: formatRealmAssetBytes(selectedBytes),
    markerOnlyAnomalies: selections.length - selected.length,
    selectedInlineModels: selected.filter((selection) => selection.modelTier === "inline").length,
    selectedSafeModels: selected.filter((selection) => selection.modelTier === "safe").length,
    deferredAnomalies: selections.filter((selection) => selection.tier === "deferred").length,
    referenceAnomalies: selections.filter((selection) => selection.tier === "reference").length,
    nearestSelected: selected.sort(compareRenderableCandidates)[0] ?? null,
  };
}

export function summarizeRealmAssetBudgets(
  assets: RealmAssetRef[],
  policy: RealmAssetPromotionPolicy = DEFAULT_REALM_ASSET_PROMOTION_POLICY
): RealmAssetBudgetSummary {
  const summary: RealmAssetBudgetSummary = {
    totalAssets: 0,
    totalBytes: 0,
    promotedAssets: 0,
    promotedBytes: 0,
    deferredAssets: 0,
    referenceAssets: 0,
    tiers: createEmptyTierSummary(),
  };

  for (const asset of dedupeRealmAssets(assets)) {
    const budget = getRealmAssetBudget(asset);
    const bytes = budget.sizeBytes ?? 0;

    summary.totalAssets += 1;
    summary.totalBytes += bytes;
    summary.tiers[budget.tier].count += 1;
    summary.tiers[budget.tier].bytes += bytes;

    if (canPromoteRealmAsset(asset, policy)) {
      summary.promotedAssets += 1;
      summary.promotedBytes += bytes;
    }

    if (budget.tier === "deferred") {
      summary.deferredAssets += 1;
    }

    if (budget.tier === "reference") {
      summary.referenceAssets += 1;
    }
  }

  return summary;
}

export function dedupeRealmAssets(assets: RealmAssetRef[]) {
  return [...new Map(assets.map((asset) => [asset.id, asset])).values()];
}

export function formatRealmAssetBytes(bytes: number | null) {
  if (bytes === null) {
    return "unknown";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createEmptyTierSummary(): Record<RealmAssetPromotionTier, RealmAssetTierSummary> {
  return {
    inline: { count: 0, bytes: 0 },
    safe: { count: 0, bytes: 0 },
    deferred: { count: 0, bytes: 0 },
    reference: { count: 0, bytes: 0 },
  };
}

function createRenderableSelection(
  anomaly: RealmAnomaly,
  tier: RealmAssetPromotionTier,
  runtimeModel: RealmAssetRuntimeModel,
  distance: number,
  shouldRenderModel: boolean,
  reason: string
): RealmRenderableAnomalySelection {
  return {
    anomalyId: anomaly.id,
    assetId: anomaly.asset.id,
    label: anomaly.label,
    tier,
    modelTier: runtimeModel.canLoadAtRuntime ? runtimeModel.tier : null,
    modelSource: runtimeModel.source,
    modelPublicPath: runtimeModel.publicPath,
    distance,
    sizeBytes: runtimeModel.canLoadAtRuntime ? runtimeModel.sizeBytes : 0,
    sizeLabel: runtimeModel.canLoadAtRuntime ? runtimeModel.sizeLabel : "none",
    shouldRenderModel,
    reason,
  };
}

function canPromoteRuntimeModel(
  runtimeModel: RealmAssetRuntimeModel,
  policy: Required<RealmRenderableAssetPolicy>
) {
  return (
    runtimeModel.canLoadAtRuntime &&
    runtimeModel.publicPath !== null &&
    runtimeModel.sizeBytes <= policy.maxBytes &&
    PROMOTION_TIER_RANK[runtimeModel.tier] <= PROMOTION_TIER_RANK[policy.maxTier]
  );
}

function compareRenderableCandidates(
  left: RealmRenderableAnomalySelection,
  right: RealmRenderableAnomalySelection
) {
  const distanceDelta = left.distance - right.distance;

  if (Math.abs(distanceDelta) > 0.001) {
    return distanceDelta;
  }

  return PROMOTION_TIER_RANK[left.tier] - PROMOTION_TIER_RANK[right.tier];
}

function distance3d(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function roundDistance(value: number) {
  return Math.round(value * 100) / 100;
}

function getTierForRenderableBytes(bytes: number): RealmAssetPromotionTier {
  if (bytes <= REALM_ASSET_INLINE_MAX_BYTES) {
    return "inline";
  }

  if (bytes <= REALM_ASSET_SAFE_MAX_BYTES) {
    return "safe";
  }

  return "deferred";
}
