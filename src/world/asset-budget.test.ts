import { describe, expect, test } from "vitest";
import {
  canPromoteRealmAsset,
  getPromotedRealmAssets,
  getRealmAssetBudget,
  getRealmAssetRenderModel,
  getRealmAssetRuntimeModel,
  REALM_ASSET_INLINE_MAX_BYTES,
  REALM_ASSET_SAFE_MAX_BYTES,
  selectPreloadRealmModelPaths,
  selectRenderableRealmAnomalies,
  summarizeRealmAssetBudgets,
  summarizeRenderableRealmAnomalies,
} from "@world/asset-budget";
import { REALM_ARCHETYPES, type RealmAnomaly } from "@world/climber";

const allArchetypeAssets = Object.values(REALM_ARCHETYPES).flatMap((archetype) => archetype.assets);
const uniqueAssets = [...new Map(allArchetypeAssets.map((asset) => [asset.id, asset])).values()];

describe("realm asset budget", () => {
  test("classifies chaos-slice assets by runtime promotion risk", () => {
    const tiers = Object.fromEntries(
      uniqueAssets.map((asset) => [asset.id, getRealmAssetBudget(asset).tier])
    );

    expect(
      Object.entries(tiers)
        .filter(([, tier]) => tier === "inline")
        .map(([id]) => id)
    ).toEqual(
      expect.arrayContaining([
        "cabinet",
        "honeycomb",
        "plant",
        "plant-shard",
        "python",
        "sword",
        "trap",
      ])
    );
    expect(
      Object.entries(tiers)
        .filter(([, tier]) => tier === "safe")
        .map(([id]) => id)
    ).toEqual(
      expect.arrayContaining([
        "ankylosaurus",
        "bull",
        "giraffe",
        "griffin",
        "octopus",
        "osprey",
        "seal",
        "squirrel",
        "tree",
        "wood-dragon",
      ])
    );
    expect(
      Object.entries(tiers)
        .filter(([, tier]) => tier === "deferred")
        .map(([id]) => id)
    ).toEqual(
      expect.arrayContaining([
        "clown",
        "dwarf",
        "goblin",
        "mermaid",
        "mother",
        "samurai",
        "steampunk",
        "viking",
      ])
    );
    expect(
      Object.entries(tiers)
        .filter(([, tier]) => tier === "reference")
        .map(([id]) => id)
    ).toEqual(["house-piece", "vox-house"]);
  });

  test("keeps the default promotion gate below heavy animated character assets", () => {
    const promotedSteampunk = getPromotedRealmAssets(REALM_ARCHETYPES.steampunk.assets);
    const promotedIds = promotedSteampunk.map((asset) => asset.id);

    expect(promotedIds).toEqual(["trap", "cabinet", "sword"]);
    expect(canPromoteRealmAsset(findAsset("steampunk"))).toBe(false);
    expect(canPromoteRealmAsset(findAsset("clown"))).toBe(false);
    expect(canPromoteRealmAsset(findAsset("house-piece"))).toBe(false);
  });

  test("uses static variants as runtime candidates for deferred character sources", () => {
    const viking = findAsset("viking");
    const runtimeModel = getRealmAssetRuntimeModel(viking);

    expect(getRealmAssetBudget(viking).tier).toBe("deferred");
    expect(runtimeModel.source).toBe("static-variant");
    expect(runtimeModel.publicPath).toBe(
      "/assets/models/static-variants/viking/male-d1.static.glb"
    );
    expect(runtimeModel.tier).toBe("inline");
    expect(runtimeModel.sizeBytes).toBe(284_728);
    expect(runtimeModel.canLoadAtRuntime).toBe(true);
  });

  test("summarizes the first archetype asset budget without duplicate shared assets", () => {
    const summary = summarizeRealmAssetBudgets(allArchetypeAssets);

    expect(summary.totalAssets).toBe(27);
    expect(summary.promotedAssets).toBe(17);
    expect(summary.deferredAssets).toBe(8);
    expect(summary.referenceAssets).toBe(2);
    expect(summary.tiers.inline.count).toBe(7);
    expect(summary.tiers.safe.count).toBe(10);
    expect(summary.tiers.deferred.count).toBe(8);
    expect(summary.tiers.reference.count).toBe(2);
  });

  test("documents exact thresholds used by future model loading", () => {
    const trap = getRealmAssetBudget(findAsset("trap"));
    const tree = getRealmAssetBudget(findAsset("tree"));
    const viking = getRealmAssetBudget(findAsset("viking"));

    expect(trap.sizeBytes).toBeLessThanOrEqual(REALM_ASSET_INLINE_MAX_BYTES);
    expect(trap.tier).toBe("inline");
    expect(tree.sizeBytes).toBeGreaterThan(REALM_ASSET_INLINE_MAX_BYTES);
    expect(tree.sizeBytes).toBeLessThanOrEqual(REALM_ASSET_SAFE_MAX_BYTES);
    expect(tree.tier).toBe("safe");
    expect(viking.sizeBytes).toBeGreaterThan(REALM_ASSET_SAFE_MAX_BYTES);
    expect(viking.tier).toBe("deferred");
  });

  test("selects only nearby promoted anomalies under active model and byte budgets", () => {
    const anomalies = [
      createAnomaly("inline-trap", "trap", { x: 1, y: 0, z: 0 }),
      createAnomaly("safe-tree", "tree", { x: 3, y: 0, z: 0 }),
      createAnomaly("safe-anky", "ankylosaurus", { x: 4, y: 0, z: 0 }),
      createAnomaly("deferred-viking", "viking", { x: 1.5, y: 0, z: 0 }),
      createAnomaly("override-house", "house-piece", { x: 2, y: 0, z: 0 }),
    ];
    const policy = {
      maxActiveModels: 3,
      maxActiveBytes: 3 * 1024 * 1024,
      safeLoadRadius: 8,
    };
    const selections = selectRenderableRealmAnomalies(anomalies, { x: 0, y: 0, z: 0 }, policy);
    const summary = summarizeRenderableRealmAnomalies(anomalies, { x: 0, y: 0, z: 0 }, policy);

    expect(renderedIds(selections)).toEqual(["inline-trap", "deferred-viking", "override-house"]);
    expect(summary.selectedModels).toBe(3);
    expect(summary.selectedBytes).toBe(1_279_564);
    expect(summary.markerOnlyAnomalies).toBe(2);
    expect(summary.selectedInlineModels).toBe(3);
    expect(summary.selectedSafeModels).toBe(0);
    expect(summary.deferredAnomalies).toBe(1);
    expect(summary.referenceAnomalies).toBe(1);
    expect(summary.nearestSelected?.anomalyId).toBe("inline-trap");
    expect(selections.find((selection) => selection.anomalyId === "safe-tree")?.reason).toContain(
      "budget"
    );
    expect(selections.find((selection) => selection.anomalyId === "deferred-viking")?.tier).toBe(
      "deferred"
    );
    expect(
      selections.find((selection) => selection.anomalyId === "deferred-viking")?.modelSource
    ).toBe("static-variant");
    expect(
      selections.find((selection) => selection.anomalyId === "deferred-viking")?.shouldRenderModel
    ).toBe(true);
    expect(selections.find((selection) => selection.anomalyId === "override-house")?.tier).toBe(
      "reference"
    );
    expect(
      selections.find((selection) => selection.anomalyId === "override-house")?.modelSource
    ).toBe("render-override");
    expect(
      selections.find((selection) => selection.anomalyId === "override-house")?.shouldRenderModel
    ).toBe(true);
  });

  test("can restrict runtime selection to inline assets only", () => {
    const selections = selectRenderableRealmAnomalies(
      [
        createAnomaly("inline-trap", "trap", { x: 1, y: 0, z: 0 }),
        createAnomaly("safe-tree", "tree", { x: 2, y: 0, z: 0 }),
      ],
      { x: 0, y: 0, z: 0 },
      { maxTier: "inline" }
    );

    expect(renderedIds(selections)).toEqual(["inline-trap"]);
    expect(
      selections.find((selection) => selection.anomalyId === "safe-tree")?.shouldRenderModel
    ).toBe(false);
  });

  test("render-override promotes reference-tier sources to GLB without touching pool determinism", () => {
    const housePiece = findAsset("house-piece");
    const voxHouse = findAsset("vox-house");

    const housePieceBudget = getRealmAssetBudget(housePiece);
    const voxHouseBudget = getRealmAssetBudget(voxHouse);
    expect(housePieceBudget.tier).toBe("reference");
    expect(housePieceBudget.canLoadAtRuntime).toBe(false);
    expect(voxHouseBudget.tier).toBe("reference");
    expect(voxHouseBudget.canLoadAtRuntime).toBe(false);

    const housePieceRuntime = getRealmAssetRuntimeModel(housePiece);
    const voxHouseRuntime = getRealmAssetRuntimeModel(voxHouse);
    expect(housePieceRuntime.canLoadAtRuntime).toBe(false);
    expect(housePieceRuntime.source).toBe("none");
    expect(voxHouseRuntime.canLoadAtRuntime).toBe(false);
    expect(voxHouseRuntime.source).toBe("none");

    const housePieceRender = getRealmAssetRenderModel(housePiece);
    const voxHouseRender = getRealmAssetRenderModel(voxHouse);
    expect(housePieceRender.source).toBe("render-override");
    expect(housePieceRender.publicPath).toBe(
      "/assets/models/chaos-slice/voxel-props-pack-ruin/treasure-chest.glb"
    );
    expect(housePieceRender.tier).toBe("inline");
    expect(housePieceRender.sizeBytes).toBe(338_752);
    expect(housePieceRender.canLoadAtRuntime).toBe(true);
    expect(voxHouseRender.source).toBe("render-override");
    expect(voxHouseRender.publicPath).toBe(
      "/assets/models/chaos-slice/voxel-props-pack-ruin/closet.glb"
    );
    expect(voxHouseRender.tier).toBe("inline");
    expect(voxHouseRender.sizeBytes).toBe(163_860);
    expect(voxHouseRender.canLoadAtRuntime).toBe(true);
  });

  test("keeps safe assets marker-only when outside safe load radius", () => {
    const selections = selectRenderableRealmAnomalies(
      [createAnomaly("safe-tree", "tree", { x: 16, y: 0, z: 0 })],
      { x: 0, y: 0, z: 0 },
      { safeLoadRadius: 12 }
    );

    expect(renderedIds(selections)).toEqual([]);
    expect(selections[0].reason).toContain("Outside safe load radius");
  });

  test("preloads upcoming models ahead of render radius while preserving promotion rules", () => {
    const anomalies = [
      createAnomaly("safe-tree", "tree", { x: 24, y: 0, z: 0 }),
      createAnomaly("inline-trap", "trap", { x: 50, y: 0, z: 0 }),
      createAnomaly("deferred-viking", "viking", { x: 52, y: 0, z: 0 }),
      createAnomaly("override-house", "house-piece", { x: 4, y: 0, z: 0 }),
      createAnomaly("safe-anky", "ankylosaurus", { x: 48, y: 0, z: 0 }),
      createAnomaly("safe-griffin", "griffin", { x: 49, y: 0, z: 0 }),
    ];
    const renderPaths = selectRenderableRealmAnomalies(anomalies, { x: 0, y: 0, z: 0 })
      .filter((selection) => selection.shouldRenderModel)
      .map((selection) => selection.modelPublicPath);
    const preloadPaths = selectPreloadRealmModelPaths(anomalies, { x: 0, y: 0, z: 0 });

    expect(renderPaths).toEqual([
      "/assets/models/chaos-slice/voxel-props-pack-ruin/treasure-chest.glb",
    ]);
    expect(preloadPaths).toEqual([
      "/assets/models/chaos-slice/all-trees-uploads/Tree 10_2.glb",
      "/assets/models/chaos-slice/trap-pack-upload/trap 18.glb",
      "/assets/models/static-variants/viking/male-d1.static.glb",
      "/assets/models/chaos-slice/voxel-props-pack-ruin/treasure-chest.glb",
    ]);
  });
});

function findAsset(id: string) {
  const asset = uniqueAssets.find((candidate) => candidate.id === id);

  if (!asset) {
    throw new Error(`Missing test asset: ${id}`);
  }

  return asset;
}

function createAnomaly(id: string, assetId: string, position: { x: number; y: number; z: number }) {
  return {
    id,
    label: id,
    platformId: "test-platform",
    position,
    scanRadius: 3,
    asset: findAsset(assetId),
  } satisfies RealmAnomaly;
}

function renderedIds(selections: ReturnType<typeof selectRenderableRealmAnomalies>) {
  return selections
    .filter((selection) => selection.shouldRenderModel)
    .map((selection) => selection.anomalyId);
}
