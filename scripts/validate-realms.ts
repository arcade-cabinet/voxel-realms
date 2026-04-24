import {
  REALM_ARCHETYPE_IDS,
  type RealmArchetypeId,
} from "@world/climber";
import { validateRealmBatch } from "@engine/validation";

interface CliOptions {
  seedPrefix?: string;
  seedsPerArchetype?: number;
  archetypes?: RealmArchetypeId[];
  platformCount?: number;
  sequenceCount?: number;
  failFast?: boolean;
  json?: boolean;
}

const options = parseArgs(process.argv.slice(2));
const report = validateRealmBatch(options);

if (options.json) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...report,
      },
      null,
      2
    )
  );
} else {
  printHumanReport(report);
}

if (report.invalid > 0) {
  process.exitCode = 1;
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

    if (arg === "--fail-fast") {
      options.failFast = true;
      continue;
    }

    if (arg === "--seed-prefix") {
      options.seedPrefix = args[++index];
      continue;
    }

    if (arg === "--seeds") {
      options.seedsPerArchetype = Number.parseInt(args[++index] ?? "", 10);
      continue;
    }

    if (arg === "--platform-count") {
      options.platformCount = Number.parseInt(args[++index] ?? "", 10);
      continue;
    }

    if (arg === "--sequence-count") {
      options.sequenceCount = Number.parseInt(args[++index] ?? "", 10);
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

function printHumanReport(report: ReturnType<typeof validateRealmBatch>) {
  console.log(
    `Realm validation: ${report.valid}/${report.total} valid, ${report.invalid} invalid ` +
      `(prefix=${report.seedPrefix}, seedsPerArchetype=${report.seedsPerArchetype}, sequenceCount=${report.sequenceCount})`
  );

  for (const summary of report.summaries) {
    if (summary.total === 0) {
      continue;
    }

    console.log(
      [
        `- ${summary.archetype}`,
        `${summary.valid}/${summary.total} valid`,
        `avg platforms ${summary.averagePlatforms}`,
        `avg duration ${summary.averageAgentDurationMs}ms`,
        `avg yuka ${summary.averageYukaDurationMs}ms`,
        `avg runtime frames ${summary.averageRuntimeTelemetryFrames}`,
        `avg route cost ${summary.averageShortestPathCost}`,
        `avg samples ${summary.averageAgentSamples}`,
        `avg yuka frames ${summary.averageYukaFrames}`,
        `avg reachable ${summary.averageReachablePlatforms}`,
        `avg captures ${summary.averageVisualCaptures}`,
        `avg scans ${summary.averageScannedAnomalies}`,
        `avg runtime signals ${summary.averageRuntimeAnomalies}`,
        `min unique assets ${summary.minimumUniqueAnomalyAssets}`,
        `min landing ${summary.minimumLandingClearance}`,
        `min look ${summary.minimumLookDistance}`,
        `max gap ${summary.maximumHorizontalGap}`,
        `max route gap ${summary.maximumRouteGap}`,
        `max walk gap ${summary.maximumWalkGap}`,
        `max route frame ${summary.maximumNextPlatformAngle}deg`,
        `max capture frame ${summary.maximumCaptureTargetAngle}deg`,
        `max yuka segment ${summary.maximumYukaSegmentDurationMs}ms`,
        `max yuka landing ${summary.maximumYukaLandingDistance}`,
        `min runtime stability ${summary.minimumRuntimeInstabilityRemaining}`,
        `min runtime ratio ${summary.minimumRuntimeInstabilityRatio}`,
        `max hazard ms ${summary.maximumRuntimeHazardExposureMs}`,
        `max path regressions ${summary.maximumRuntimePathRegressionCount}`,
        `max objective regressions ${summary.maximumRuntimeObjectiveRegressionCount}`,
        `max shortcuts ${summary.maximumGoldenPathShortcutCount}`,
        `max detours ${summary.maximumGoldenPathDetourCount}`,
        `max divergence ${summary.maximumDiscoveredPathDivergenceCount}`,
        `max non-gold steps ${summary.maximumNonGoldenDiscoveredStepCount}`,
        `max step ${summary.maximumStepUp}`,
        `bad path ${summary.pathfindingIssues}`,
        `bad runtime ${summary.runtimeTelemetryIssues}`,
        `bad landings ${summary.unsupportedLandingSamples}`,
        `bad framing ${summary.framingIssues}`,
        `bad yuka ${summary.yukaIssues}`,
      ].join(" | ")
    );
  }

  if (report.invalid > 0) {
    console.log("\nInvalid seeds:");
    for (const entry of report.entries.filter((item) => !item.valid).slice(0, 12)) {
      const issueSummary = [
        ...entry.goldenPathIssues.map((issue) => issue.code),
        ...entry.pathfindingIssues.map((issue) => issue.code),
        ...entry.runtimeTelemetryIssues.map((issue) => issue.code),
        ...entry.spatialIssues.map((issue) => issue.code),
        ...entry.framingIssues.map((issue) => issue.code),
        ...entry.agentIssues.map((issue) => issue.code),
        ...entry.yukaIssues.map((issue) => issue.code),
      ].join(", ");
      console.log(`- ${entry.seed} (${entry.archetype}): ${issueSummary}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: pnpm realm:validate [options]

Options:
  --seeds <n>              Seeds per archetype. Default: 25.
  --seed-prefix <value>    Prefix used to create deterministic seed ids.
  --archetypes <list>      Comma-separated archetypes: ${REALM_ARCHETYPE_IDS.join(", ")}.
  --sequence-count <n>     Validate a deterministic multi-realm sequence instead of per-archetype batches.
  --platform-count <n>     Override generated route platform count.
  --fail-fast              Stop at the first invalid seed.
  --json                   Print JSON report.
`);
}

function isRealmArchetypeId(value: string): value is RealmArchetypeId {
  return REALM_ARCHETYPE_IDS.includes(value as RealmArchetypeId);
}
