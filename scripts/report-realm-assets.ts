import {
  DEFAULT_REALM_RENDERABLE_ASSET_POLICY,
  dedupeRealmAssets,
  formatRealmAssetBytes,
  getPromotedRealmAssets,
  getRealmAssetBudget,
  getRealmAssetRuntimeModel,
  REALM_STATIC_VARIANT_BY_ID,
  summarizeRealmAssetBudgets,
} from "@world/asset-budget";
import {
  REALM_ARCHETYPE_IDS,
  REALM_ARCHETYPES,
  type RealmArchetypeId,
} from "@world/climber";

interface CliOptions {
  json?: boolean;
  archetypes?: RealmArchetypeId[];
}

const options = parseArgs(process.argv.slice(2));
const selectedArchetypes = options.archetypes ?? REALM_ARCHETYPE_IDS;
const selectedAssets = selectedArchetypes.flatMap((id) => REALM_ARCHETYPES[id].assets);
const summary = summarizeRealmAssetBudgets(selectedAssets);
const runtimeModels = dedupeRealmAssets(selectedAssets).map((asset) =>
  getRealmAssetRuntimeModel(asset)
);
const runtimeCandidates = runtimeModels.filter((model) => model.canLoadAtRuntime);
const runtimeVariantCandidates = runtimeCandidates.filter(
  (model) => model.source === "static-variant"
);
const runtimeSourceCandidates = runtimeCandidates.filter((model) => model.source === "source");
const runtimeBytes = runtimeCandidates.reduce((sum, model) => sum + model.sizeBytes, 0);
const entries = dedupeRealmAssets(selectedAssets).map((asset) => ({
  id: asset.id,
  label: asset.label,
  role: asset.role,
  format: asset.format,
  publicPath: asset.publicPath,
  runtimeModel: getRealmAssetRuntimeModel(asset),
  ...getRealmAssetBudget(asset),
}));

if (options.json) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        archetypes: selectedArchetypes,
        renderPolicy: DEFAULT_REALM_RENDERABLE_ASSET_POLICY,
        staticVariants: REALM_STATIC_VARIANT_BY_ID,
        summary,
        entries,
      },
      null,
      2
    )
  );
} else {
  printHumanReport();
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--archetypes") {
      const requested = (args[++index] ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      options.archetypes = requested.filter(isRealmArchetypeId);
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHumanReport() {
  console.log(
    `Realm asset budget: ${summary.promotedAssets}/${summary.totalAssets} safe-policy promotable, ` +
      `${formatRealmAssetBytes(summary.promotedBytes)} promotable, ` +
      `${formatRealmAssetBytes(summary.totalBytes)} cataloged`
  );
  console.log(
    `Tiers: inline ${summary.tiers.inline.count}, safe ${summary.tiers.safe.count}, ` +
      `deferred ${summary.tiers.deferred.count}, reference ${summary.tiers.reference.count}`
  );
  console.log(
    `Runtime candidates: ${runtimeCandidates.length}/${runtimeModels.length}, ` +
      `${runtimeSourceCandidates.length} source GLBs, ` +
      `${runtimeVariantCandidates.length} static variants, ` +
      `${formatRealmAssetBytes(runtimeBytes)} renderable bytes`
  );
  console.log(
    `Render gate: max ${DEFAULT_REALM_RENDERABLE_ASSET_POLICY.maxActiveModels} active models, ` +
      `${formatRealmAssetBytes(DEFAULT_REALM_RENDERABLE_ASSET_POLICY.maxActiveBytes)} active bytes, ` +
      `${DEFAULT_REALM_RENDERABLE_ASSET_POLICY.inlineLoadRadius}m inline radius, ` +
      `${DEFAULT_REALM_RENDERABLE_ASSET_POLICY.safeLoadRadius}m safe radius`
  );

  for (const archetypeId of selectedArchetypes) {
    const archetype = REALM_ARCHETYPES[archetypeId];
    const archetypeSummary = summarizeRealmAssetBudgets(archetype.assets);
    const promoted = getPromotedRealmAssets(archetype.assets);
    const deferred = archetype.assets.filter(
      (asset) => getRealmAssetBudget(asset).tier === "deferred"
    );
    const references = archetype.assets.filter(
      (asset) => getRealmAssetBudget(asset).tier === "reference"
    );

    console.log(
      [
        `- ${archetype.name}`,
        `${archetypeSummary.promotedAssets}/${archetypeSummary.totalAssets} promotable`,
        `${formatRealmAssetBytes(archetypeSummary.promotedBytes)} promotable`,
        `promote: ${formatAssetList(promoted)}`,
      ].join(" | ")
    );

    if (deferred.length > 0) {
      console.log(`  defer: ${formatAssetList(deferred)}`);
    }

    if (references.length > 0) {
      console.log(`  reference: ${formatAssetList(references)}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: pnpm realm:assets [options]

Options:
  --archetypes <list>      Comma-separated archetypes: ${REALM_ARCHETYPE_IDS.join(", ")}.
  --json                   Print JSON report.
`);
}

function formatAssetList(assets: Array<{ id: string; label: string }>) {
  if (assets.length === 0) {
    return "none";
  }

  return assets.map((asset) => `${asset.label} (${asset.id})`).join(", ");
}

function isRealmArchetypeId(value: string): value is RealmArchetypeId {
  return REALM_ARCHETYPE_IDS.includes(value as RealmArchetypeId);
}
