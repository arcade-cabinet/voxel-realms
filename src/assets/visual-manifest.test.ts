import { describe, expect, test } from "vitest";
import { type RealmVisualManifest, validateRealmVisualManifest } from "@assets/visual-manifest";

describe("validateRealmVisualManifest", () => {
  test("accepts a complete visual manifest contract", () => {
    const manifest = createManifest();
    const validation = validateRealmVisualManifest(manifest);

    expect(validation.valid, validation.issues.map((issue) => issue.code).join(", ")).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  test("rejects visual captures that collapse into identical fingerprints", () => {
    const manifest = createManifest();
    manifest.captures[1] = {
      ...manifest.captures[1],
      perceptualHash: manifest.captures[0].perceptualHash,
    };
    manifest.visualDistinctness = {
      ...manifest.visualDistinctness,
      allFingerprintsUnique: false,
      minimumHashDistance: 0,
      pairDistances: [
        { from: "route-start", to: "signal", distance: 0 },
        { from: "route-start", to: "goal", distance: 27 },
        { from: "signal", to: "goal", distance: 21 },
      ],
    };

    const validation = validateRealmVisualManifest(manifest);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      "visual-fingerprints-not-unique"
    );
    expect(validation.issues.map((issue) => issue.code)).toContain("visual-hash-distance-too-low");
  });

  test("rejects semantic drift in route, runtime, and capture state", () => {
    const manifest = createManifest();
    manifest.pathfinding.discoveredPathMatchesGoldenPath = false;
    manifest.pathfinding.discoveredPathDivergenceCount = 2;
    manifest.runtime.pathRegressionCount = 1;
    manifest.captures[2] = {
      ...manifest.captures[2],
      extractionState: "ascending",
      scannedAnomalies: 1,
    };

    const validation = validateRealmVisualManifest(manifest);
    const issueCodes = validation.issues.map((issue) => issue.code);

    expect(validation.valid).toBe(false);
    expect(issueCodes).toContain("pathfinding-diverged");
    expect(issueCodes).toContain("runtime-regressed");
    expect(issueCodes).toContain("capture-invalid-state");
    expect(issueCodes).toContain("capture-scan-regressed");
  });

  test("rejects captures without a file digest", () => {
    const manifest = createManifest();
    manifest.captures[0] = {
      ...manifest.captures[0],
      sha256: "",
    };

    const validation = validateRealmVisualManifest(manifest);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain("capture-missing-digest");
  });
});

function createManifest(): RealmVisualManifest {
  const viewport = { height: 720, name: "desktop", width: 1280 };

  return {
    schemaVersion: 1,
    generatedBy: "vitest-browser",
    realmSeed: "manifest-contract",
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
      createCapture("route-start", 0, 0, "camp", "ffffff8400450000", viewport),
      createCapture("signal", 4, 1, "ascending", "ffff3f0f0f071178", viewport),
      createCapture("goal", 12, 3, "extracted", "07fffffff7870339", viewport),
    ],
  };
}

function createCapture(
  kind: "route-start" | "signal" | "goal",
  pathIndex: number,
  scannedAnomalies: number,
  extractionState: string,
  perceptualHash: string,
  viewport: RealmVisualManifest["viewport"]
): RealmVisualManifest["captures"][number] {
  return {
    path: `test-screenshots/${kind}.png`,
    mode: "canvas",
    viewport,
    base64Length: 300_000,
    sha256: "a".repeat(64),
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
