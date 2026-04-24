import fs from "node:fs";
import path from "node:path";

interface CliOptions {
  distDir: string;
  json?: boolean;
}

interface BudgetCheck {
  id: string;
  ok: boolean;
  actualBytes: number;
  budgetBytes: number;
  comparator: "max" | "min";
  message: string;
}

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
}

interface PruneReport {
  copiedBytes?: number;
  skippedFiles?: Array<{ bytes?: number }>;
}

const root = process.cwd();
const options = parseArgs(process.argv.slice(2));
const distPath = path.resolve(root, options.distDir);
const checks: BudgetCheck[] = [];

if (!fs.existsSync(distPath)) {
  failMissingDist();
} else {
  const entries = listFiles(distPath);
  const assetEntries = entries.filter((entry) => entry.relativePath.startsWith("assets/"));
  const jsEntries = assetEntries.filter((entry) => entry.relativePath.endsWith(".js"));
  const totalDistBytes = sumBytes(entries);
  const totalJsBytes = sumBytes(jsEntries);
  const pruneReport = readPruneReport(distPath);
  const prunedBytes =
    pruneReport?.skippedFiles?.reduce((sum, file) => sum + (file.bytes ?? 0), 0) ?? 0;
  const copiedPublicBytes = pruneReport?.copiedBytes ?? 0;

  addMaxCheck("dist-total", totalDistBytes, 42 * 1024 * 1024);
  addMaxCheck("js-total", totalJsBytes, 4_100_000);
  addMaxCheck("copied-public-assets", copiedPublicBytes, 30 * 1024 * 1024);
  addMinCheck("pruned-source-assets", prunedBytes, 250 * 1024 * 1024);

  // Budgets after the JP port. vendor-jp is the JP engine + runtime +
  // voxel renderer. vendor-three is the raw three.js the JP packages
  // depend on. @react-three/* are gone; their chunks no longer exist.
  addChunkMaxCheck(jsEntries, "vendor-jp", 900_000);
  addChunkMaxCheck(jsEntries, "vendor-three", 760_000);
  addChunkMaxCheck(jsEntries, "vendor-react", 300_000);
  addChunkMaxCheck(jsEntries, "vendor-ecs", 60_000);
  addChunkMaxCheck(jsEntries, "realm-engine", 120_000);
  // index caps the top-level chunk (main.tsx + hud overlay + scene
  // wiring). 120 KB gives headroom for the scene bootstrap code that
  // moved out of Game.tsx.
  addChunkMaxCheck(jsEntries, "index", 120_000);
  addChunkMaxCheck(jsEntries, "vendor-sqlite", 380_000);
  addChunkMaxCheck(jsEntries, "vendor-misc", 60_000);
}

const failed = checks.filter((check) => !check.ok);

if (options.json) {
  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        distDir: options.distDir,
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
  const options: CliOptions = {
    distDir: "dist",
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--dist-dir") {
      options.distDir = args[++index] ?? options.distDir;
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

function failMissingDist() {
  checks.push({
    id: "dist-exists",
    ok: false,
    actualBytes: 0,
    budgetBytes: 1,
    comparator: "min",
    message: `missing ${path.relative(root, distPath)}`,
  });
}

function listFiles(dirPath: string, basePath = dirPath): FileEntry[] {
  const entries: FileEntry[] = [];

  for (const child of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, child.name);

    if (child.isDirectory()) {
      entries.push(...listFiles(absolutePath, basePath));
      continue;
    }

    if (!child.isFile()) {
      continue;
    }

    entries.push({
      absolutePath,
      relativePath: path.relative(basePath, absolutePath),
      sizeBytes: fs.statSync(absolutePath).size,
    });
  }

  return entries;
}

function readPruneReport(distPath: string): PruneReport | undefined {
  const reportPath = path.join(distPath, "assets/models/pruned-assets.json");

  if (!fs.existsSync(reportPath)) {
    checks.push({
      id: "prune-report",
      ok: false,
      actualBytes: 0,
      budgetBytes: 1,
      comparator: "min",
      message: "missing assets/models/pruned-assets.json",
    });
    return undefined;
  }

  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

function addChunkMaxCheck(jsEntries: FileEntry[], chunkName: string, maxBytes: number) {
  const chunkEntries = jsEntries.filter((entry) =>
    path.basename(entry.relativePath).startsWith(`${chunkName}-`)
  );

  if (chunkEntries.length === 0) {
    checks.push({
      id: `chunk:${chunkName}`,
      ok: false,
      actualBytes: 0,
      budgetBytes: maxBytes,
      comparator: "max",
      message: `missing ${chunkName} chunk`,
    });
    return;
  }

  const totalBytes = sumBytes(chunkEntries);
  addMaxCheck(`chunk:${chunkName}`, totalBytes, maxBytes);
}

function addMaxCheck(id: string, actualBytes: number, budgetBytes: number) {
  checks.push({
    id,
    ok: actualBytes <= budgetBytes,
    actualBytes,
    budgetBytes,
    comparator: "max",
    message:
      actualBytes <= budgetBytes
        ? "ok"
        : `${formatBytes(actualBytes)} exceeds ${formatBytes(budgetBytes)}`,
  });
}

function addMinCheck(id: string, actualBytes: number, budgetBytes: number) {
  checks.push({
    id,
    ok: actualBytes >= budgetBytes,
    actualBytes,
    budgetBytes,
    comparator: "min",
    message:
      actualBytes >= budgetBytes
        ? "ok"
        : `${formatBytes(actualBytes)} is below ${formatBytes(budgetBytes)}`,
  });
}

function sumBytes(entries: FileEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
}

function printHumanReport(checks: BudgetCheck[], failed: BudgetCheck[]) {
  console.log(
    `Build budget verification: ${checks.length - failed.length}/${checks.length} checks passed`
  );

  for (const check of checks) {
    const operator = check.comparator === "max" ? "<=" : ">=";
    console.log(
      `- ${check.id}: ${formatBytes(check.actualBytes)} ${operator} ${formatBytes(
        check.budgetBytes
      )} (${check.message})`
    );
  }
}

function printHelp() {
  console.log(`Usage: pnpm build:verify-budget [options]

Options:
  --dist-dir <path>        Built output directory. Defaults to dist.
  --json                   Print JSON report.
`);
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}
