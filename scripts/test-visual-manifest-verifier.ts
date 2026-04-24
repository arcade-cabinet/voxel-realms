import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { RealmVisualManifest } from "@assets/visual-manifest";
import { verifyVisualManifest } from "./visual-manifest-verifier";

interface Fixture {
  dir: string;
  manifestPath: string;
  manifest: RealmVisualManifest;
}

const checks: Array<[string, () => void]> = [
  ["accepts manifest and matching capture files", acceptsMatchingFiles],
  ["rejects missing manifest", rejectsMissingManifest],
  ["rejects missing capture file", rejectsMissingCaptureFile],
  ["rejects stale capture digest", rejectsStaleDigest],
  ["rejects malformed manifest JSON", rejectsMalformedManifest],
];

for (const [name, run] of checks) {
  run();
  console.log(`ok - ${name}`);
}

function acceptsMatchingFiles() {
  const fixture = createFixture();
  const report = verifyVisualManifest({ manifestPath: fixture.manifestPath });

  assert(report.valid, "expected matching fixture to verify");
  assert(report.artifactIssues.length === 0, "expected no artifact issues");
  assert(report.semanticIssues.length === 0, "expected no semantic issues");
}

function rejectsMissingManifest() {
  const dir = mkdtempSync(path.join(tmpdir(), "voxel-visual-missing-manifest-"));
  const report = verifyVisualManifest({ manifestPath: path.join(dir, "missing.json") });

  assert(!report.valid, "expected missing manifest to fail");
  assert(hasArtifactIssue(report, "manifest-missing"), "expected manifest-missing issue");
}

function rejectsMissingCaptureFile() {
  const fixture = createFixture();
  rmSync(fixture.manifest.captures[1].path);

  const report = verifyVisualManifest({ manifestPath: fixture.manifestPath });

  assert(!report.valid, "expected missing capture file to fail");
  assert(hasArtifactIssue(report, "capture-file-missing"), "expected capture-file-missing issue");
}

function rejectsStaleDigest() {
  const fixture = createFixture();
  const signalPath = fixture.manifest.captures[1].path;
  writeFileSync(signalPath, Buffer.alloc(readFileSync(signalPath).length, 99));

  const report = verifyVisualManifest({ manifestPath: fixture.manifestPath });

  assert(!report.valid, "expected stale capture file to fail");
  assert(
    hasArtifactIssue(report, "capture-file-digest-mismatch"),
    "expected capture-file-digest-mismatch issue"
  );
}

function rejectsMalformedManifest() {
  const dir = mkdtempSync(path.join(tmpdir(), "voxel-visual-malformed-"));
  const manifestPath = path.join(dir, "manifest.json");
  writeFileSync(manifestPath, "{ nope", "utf8");

  const report = verifyVisualManifest({ manifestPath });

  assert(!report.valid, "expected malformed manifest to fail");
  assert(hasArtifactIssue(report, "manifest-parse-error"), "expected manifest-parse-error issue");
}

function createFixture(): Fixture {
  const dir = mkdtempSync(path.join(tmpdir(), "voxel-visual-manifest-"));
  const viewport = { height: 720, name: "desktop", width: 1280 };
  const routeStart = writeCaptureFile(dir, "route-start", 11);
  const signal = writeCaptureFile(dir, "signal", 37);
  const goal = writeCaptureFile(dir, "goal", 71);
  const manifest: RealmVisualManifest = {
    schemaVersion: 1,
    generatedBy: "verifier-self-test",
    realmSeed: "verifier-self-test",
    archetypeId: "ocean",
    viewport,
    route: {
      startPlatformId: "start",
      exitPlatformId: "goal",
      checkpointCount: 13,
      expectedScannedAnomalies: 3,
    },
    pathfinding: {
      valid: true,
      discoveredPathMatchesGoldenPath: true,
      discoveredPathLength: 12,
      shortestPathCost: 117.54,
      reachablePlatformCount: 17,
      traversableEdgeCount: 32,
      goldenStepCount: 12,
      traversableGoldenStepCount: 12,
      routeLinkTraversableCount: 12,
      goldenPathShortcutCount: 0,
      goldenPathDetourCount: 0,
      discoveredPathDivergenceCount: 0,
      firstDivergentPathIndex: null,
      nonGoldenDiscoveredStepCount: 0,
    },
    yuka: {
      valid: true,
      totalDurationMs: 22_110,
      frameCount: 348,
      browserFrameCount: 22,
      landedFrameCount: 13,
      maximumSegmentDurationMs: 2_046,
      maximumLandingDistance: 0.3,
      finalDistanceToGoal: 0,
    },
    runtime: {
      valid: true,
      frameCount: 348,
      finalPathIndex: 12,
      maximumPathIndex: 12,
      discoveredAnomalyCount: 3,
      extractionFrameCount: 10,
      firstExtractionFrameIndex: 338,
      minimumInstabilityRemaining: 78.16,
      minimumInstabilityRatio: 0.859,
      hazardExposureMs: 1_518,
      pathRegressionCount: 0,
      targetRegressionCount: 0,
      objectiveRegressionCount: 0,
    },
    visualDistinctness: {
      allFingerprintsPresent: true,
      allFingerprintsUnique: true,
      minimumHashDistance: 18,
      minimumColorBuckets: 147,
      minimumVisiblePixelRatio: 0.9963,
      pairDistances: [
        { from: "route-start", to: "signal", distance: 18 },
        { from: "route-start", to: "goal", distance: 27 },
        { from: "signal", to: "goal", distance: 21 },
      ],
    },
    captures: [
      createCapture("route-start", 0, 0, "camp", "ffffff8400450000", viewport, routeStart),
      createCapture("signal", 4, 1, "ascending", "ffff3f0f0f071178", viewport, signal),
      createCapture("goal", 12, 3, "extracted", "07fffffff7870339", viewport, goal),
    ],
  };
  const manifestPath = path.join(dir, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return { dir, manifestPath, manifest };
}

function writeCaptureFile(dir: string, name: string, seed: number) {
  const filePath = path.join(dir, `${name}.png`);
  const bytes = Buffer.alloc(4_096, seed);
  writeFileSync(filePath, bytes);
  return {
    path: filePath,
    base64Length: bytes.toString("base64").length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function createCapture(
  kind: "route-start" | "signal" | "goal",
  pathIndex: number,
  scannedAnomalies: number,
  extractionState: string,
  perceptualHash: string,
  viewport: RealmVisualManifest["viewport"],
  file: ReturnType<typeof writeCaptureFile>
): RealmVisualManifest["captures"][number] {
  return {
    path: file.path,
    mode: "canvas",
    viewport,
    base64Length: file.base64Length,
    sha256: file.sha256,
    visiblePixelRatio: 0.99,
    colorBuckets: 128,
    averageLuma: 160,
    lumaStdDev: 70,
    perceptualHash,
    kind,
    pathIndex,
    scannedAnomalies,
    extractionState,
  };
}

function hasArtifactIssue(report: ReturnType<typeof verifyVisualManifest>, code: string) {
  return report.artifactIssues.some((issue) => issue.code === code);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
