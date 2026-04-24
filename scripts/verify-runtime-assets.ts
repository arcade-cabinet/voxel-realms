import fs from "node:fs";
import path from "node:path";
import {
  getRealmAssetBudget,
  getRealmAssetRuntimeModel,
  REALM_RENDER_OVERRIDE_BY_ID,
  REALM_STATIC_VARIANT_BY_ID,
} from "../src/games/voxel-realms/engine/realmAssetBudget";
import {
  REALM_ARCHETYPE_IDS,
  REALM_ARCHETYPES,
  type RealmArchetypeId,
} from "../src/games/voxel-realms/engine/realmClimber";

interface CliOptions {
  dist?: boolean;
  json?: boolean;
  archetypes?: RealmArchetypeId[];
}

interface AssetCheck {
  scope: "public" | "dist";
  kind:
    | "source"
    | "runtime"
    | "static-variant"
    | "render-override"
    | "pruned-source"
    | "prune-report";
  id: string;
  publicPath: string;
  ok: boolean;
  message: string;
}

const root = process.cwd();
const options = parseArgs(process.argv.slice(2));
const selectedArchetypes = options.archetypes ?? REALM_ARCHETYPE_IDS;
const uniqueAssets = [
  ...new Map(
    selectedArchetypes
      .flatMap((id) => REALM_ARCHETYPES[id].assets)
      .map((asset) => [asset.id, asset])
  ).values(),
];
const checks: AssetCheck[] = [];

for (const asset of uniqueAssets) {
  checks.push(checkPath("public", "source", asset.id, asset.publicPath));

  const runtimeModel = getRealmAssetRuntimeModel(asset);
  if (runtimeModel.canLoadAtRuntime && runtimeModel.publicPath) {
    checks.push(checkPath("public", "runtime", asset.id, runtimeModel.publicPath));
  }

  const staticVariant = REALM_STATIC_VARIANT_BY_ID[asset.id];
  if (staticVariant) {
    checks.push(
      checkPath("public", "static-variant", asset.id, staticVariant.publicPath, {
        expectedBytes: staticVariant.sizeBytes,
      })
    );
  }

  const renderOverride = REALM_RENDER_OVERRIDE_BY_ID[asset.id];
  if (renderOverride) {
    checks.push(
      checkPath("public", "render-override", asset.id, renderOverride.publicPath, {
        expectedBytes: renderOverride.sizeBytes,
      })
    );
  }
}

if (options.dist) {
  for (const asset of uniqueAssets) {
    const runtimeModel = getRealmAssetRuntimeModel(asset);
    if (runtimeModel.canLoadAtRuntime && runtimeModel.publicPath) {
      checks.push(checkPath("dist", "runtime", asset.id, runtimeModel.publicPath));
    }

    if (
      getRealmAssetBudget(asset).tier === "deferred" &&
      runtimeModel.source === "static-variant"
    ) {
      checks.push(checkPrunedSource(asset.id, asset.publicPath));
    }

    const renderOverride = REALM_RENDER_OVERRIDE_BY_ID[asset.id];
    if (renderOverride) {
      checks.push(checkPath("dist", "render-override", asset.id, renderOverride.publicPath));
    }
  }

  checks.push(checkPruneReport());
}

const failed = checks.filter((check) => !check.ok);

if (options.json) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dist: Boolean(options.dist),
        archetypes: selectedArchetypes,
        checked: checks.length,
        failed: failed.length,
        checks,
      },
      null,
      2
    )
  );
} else {
  printHumanReport(checks, failed);
}

if (failed.length > 0) {
  process.exitCode = 1;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--dist") {
      options.dist = true;
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

function checkPath(
  scope: "public" | "dist",
  kind: AssetCheck["kind"],
  id: string,
  publicPath: string,
  options: { expectedBytes?: number } = {}
): AssetCheck {
  const filePath = resolveScopedPublicPath(scope, publicPath);

  if (!fs.existsSync(filePath)) {
    return {
      scope,
      kind,
      id,
      publicPath,
      ok: false,
      message: "missing file",
    };
  }

  if (typeof options.expectedBytes === "number") {
    const actualBytes = fs.statSync(filePath).size;
    if (actualBytes !== options.expectedBytes) {
      return {
        scope,
        kind,
        id,
        publicPath,
        ok: false,
        message: `byte mismatch: expected ${options.expectedBytes}, got ${actualBytes}`,
      };
    }
  }

  return {
    scope,
    kind,
    id,
    publicPath,
    ok: true,
    message: "ok",
  };
}

function checkPrunedSource(id: string, publicPath: string): AssetCheck {
  const filePath = resolveScopedPublicPath("dist", publicPath);
  const ok = !fs.existsSync(filePath);

  return {
    scope: "dist",
    kind: "pruned-source",
    id,
    publicPath,
    ok,
    message: ok ? "ok" : "deferred source GLB should be pruned from dist",
  };
}

function checkPruneReport(): AssetCheck {
  const reportPath = "/assets/models/pruned-assets.json";
  const filePath = resolveScopedPublicPath("dist", reportPath);

  if (!fs.existsSync(filePath)) {
    return {
      scope: "dist",
      kind: "prune-report",
      id: "pruned-assets",
      publicPath: reportPath,
      ok: false,
      message: "missing prune report",
    };
  }

  const report = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const skipped = Array.isArray(report.skippedFiles) ? report.skippedFiles : [];

  return {
    scope: "dist",
    kind: "prune-report",
    id: "pruned-assets",
    publicPath: reportPath,
    ok: skipped.length > 0,
    message: skipped.length > 0 ? `ok (${skipped.length} pruned files)` : "prune report is empty",
  };
}

function resolveScopedPublicPath(scope: "public" | "dist", publicPath: string) {
  const base = scope === "public" ? "public" : "dist";
  return path.join(root, base, publicPath.replace(/^\//, ""));
}

function printHumanReport(checks: AssetCheck[], failed: AssetCheck[]) {
  const runtime = checks.filter((check) => check.kind === "runtime" && check.ok).length;
  const pruned = checks.filter((check) => check.kind === "pruned-source" && check.ok).length;
  const staticVariants = checks.filter(
    (check) => check.kind === "static-variant" && check.ok
  ).length;
  const renderOverrides = checks.filter(
    (check) => check.kind === "render-override" && check.ok
  ).length;

  console.log(
    `Runtime asset verification: ${checks.length - failed.length}/${checks.length} checks passed ` +
      `(${runtime} runtime paths, ${staticVariants} static variants, ${renderOverrides} render overrides, ${pruned} pruned sources)`
  );

  if (failed.length > 0) {
    console.log("\nFailures:");
    for (const check of failed) {
      console.log(
        `- ${check.scope}:${check.kind}:${check.id} ${check.publicPath} - ${check.message}`
      );
    }
  }
}

function printHelp() {
  console.log(`Usage: pnpm assets:verify-runtime [options]

Options:
  --dist                   Also verify built dist assets and pruned source GLBs.
  --archetypes <list>      Comma-separated archetypes: ${REALM_ARCHETYPE_IDS.join(", ")}.
  --json                   Print JSON report.
`);
}

function isRealmArchetypeId(value: string): value is RealmArchetypeId {
  return REALM_ARCHETYPE_IDS.includes(value as RealmArchetypeId);
}
