export type RealmVisualCaptureKind = "route-start" | "signal" | "goal";

export interface RealmVisualManifestCapture {
  path: string;
  mode: "canvas" | "page";
  viewport: {
    name: string;
    width: number;
    height: number;
  };
  base64Length: number;
  sha256: string;
  visiblePixelRatio: number | null;
  colorBuckets: number | null;
  averageLuma: number | null;
  lumaStdDev: number | null;
  perceptualHash: string | null;
  kind: RealmVisualCaptureKind;
  pathIndex: number;
  scannedAnomalies: number;
  extractionState: string | null;
}

export interface RealmVisualManifest {
  schemaVersion: number;
  generatedBy: string;
  realmSeed: string;
  archetypeId: string;
  viewport: {
    name: string;
    width: number;
    height: number;
  };
  route: {
    startPlatformId: string;
    exitPlatformId: string;
    checkpointCount: number;
    expectedScannedAnomalies: number;
  };
  pathfinding: {
    valid: boolean;
    discoveredPathMatchesGoldenPath: boolean;
    discoveredPathLength: number;
    shortestPathCost: number;
    reachablePlatformCount: number;
    traversableEdgeCount: number;
    goldenStepCount: number;
    traversableGoldenStepCount: number;
    routeLinkTraversableCount: number;
    goldenPathShortcutCount: number;
    goldenPathDetourCount: number;
    discoveredPathDivergenceCount: number;
    firstDivergentPathIndex: number | null;
    nonGoldenDiscoveredStepCount: number;
  };
  yuka: {
    valid: boolean;
    totalDurationMs: number;
    frameCount: number;
    browserFrameCount: number;
    landedFrameCount: number;
    maximumSegmentDurationMs: number;
    maximumLandingDistance: number;
    finalDistanceToGoal: number;
  };
  runtime: {
    valid: boolean;
    frameCount: number;
    finalPathIndex: number;
    maximumPathIndex: number;
    discoveredAnomalyCount: number;
    extractionFrameCount: number;
    firstExtractionFrameIndex: number | null;
    minimumInstabilityRemaining: number;
    minimumInstabilityRatio: number;
    hazardExposureMs: number;
    pathRegressionCount: number;
    targetRegressionCount: number;
    objectiveRegressionCount: number;
  };
  visualDistinctness: {
    allFingerprintsPresent: boolean;
    allFingerprintsUnique: boolean;
    minimumHashDistance: number;
    minimumColorBuckets: number;
    minimumVisiblePixelRatio: number;
    pairDistances: Array<{
      from: RealmVisualCaptureKind;
      to: RealmVisualCaptureKind;
      distance: number;
    }>;
  };
  captures: RealmVisualManifestCapture[];
}

export interface RealmVisualManifestThresholds {
  minBase64Length: number;
  minColorBuckets: number;
  minVisiblePixelRatio: number;
  minHashDistance: number;
  expectedCaptureKinds: RealmVisualCaptureKind[];
}

export interface RealmVisualManifestIssue {
  code:
    | "schema-version-mismatch"
    | "capture-kind-order-mismatch"
    | "capture-mode-mismatch"
    | "capture-too-small"
    | "capture-low-visibility"
    | "capture-low-color"
    | "capture-missing-fingerprint"
    | "capture-missing-digest"
    | "capture-invalid-state"
    | "capture-path-index-mismatch"
    | "capture-scan-regressed"
    | "visual-fingerprints-not-unique"
    | "visual-hash-distance-too-low"
    | "pathfinding-invalid"
    | "pathfinding-diverged"
    | "pathfinding-step-count-mismatch"
    | "yuka-invalid"
    | "yuka-frame-mismatch"
    | "runtime-invalid"
    | "runtime-regressed"
    | "runtime-scan-mismatch"
    | "runtime-extraction-mismatch";
  message: string;
  value?: number | string | null;
  limit?: number | string | null;
}

export interface RealmVisualManifestValidation {
  valid: boolean;
  issues: RealmVisualManifestIssue[];
}

export const DEFAULT_REALM_VISUAL_MANIFEST_THRESHOLDS: RealmVisualManifestThresholds = {
  minBase64Length: 5_000,
  minColorBuckets: 24,
  minVisiblePixelRatio: 0.9,
  minHashDistance: 4,
  expectedCaptureKinds: ["route-start", "signal", "goal"],
};

export function validateRealmVisualManifest(
  manifest: RealmVisualManifest,
  thresholds: RealmVisualManifestThresholds = DEFAULT_REALM_VISUAL_MANIFEST_THRESHOLDS
): RealmVisualManifestValidation {
  const issues: RealmVisualManifestIssue[] = [];

  validateSchema(manifest, issues);
  validateCaptureOrder(manifest, thresholds, issues);
  validateCaptures(manifest, thresholds, issues);
  validateVisualDistinctness(manifest, thresholds, issues);
  validatePathfinding(manifest, issues);
  validateYuka(manifest, issues);
  validateRuntime(manifest, issues);

  return {
    valid: issues.length === 0,
    issues,
  };
}

function validateSchema(manifest: RealmVisualManifest, issues: RealmVisualManifestIssue[]) {
  if (manifest.schemaVersion !== 1) {
    issues.push({
      code: "schema-version-mismatch",
      message: "Visual manifest schema version is not supported.",
      value: manifest.schemaVersion,
      limit: 1,
    });
  }
}

function validateCaptureOrder(
  manifest: RealmVisualManifest,
  thresholds: RealmVisualManifestThresholds,
  issues: RealmVisualManifestIssue[]
) {
  const actual = manifest.captures.map((capture) => capture.kind).join(",");
  const expected = thresholds.expectedCaptureKinds.join(",");

  if (actual !== expected) {
    issues.push({
      code: "capture-kind-order-mismatch",
      message: "Visual captures must be written in route-start, signal, goal order.",
      value: actual,
      limit: expected,
    });
  }
}

function validateCaptures(
  manifest: RealmVisualManifest,
  thresholds: RealmVisualManifestThresholds,
  issues: RealmVisualManifestIssue[]
) {
  let previousScannedAnomalies = 0;

  for (const capture of manifest.captures) {
    if (capture.mode !== "canvas") {
      issues.push({
        code: "capture-mode-mismatch",
        message: "Voxel Realms visual validation expects canvas captures, not page fallbacks.",
        value: capture.mode,
        limit: "canvas",
      });
    }

    if (capture.base64Length < thresholds.minBase64Length) {
      issues.push({
        code: "capture-too-small",
        message: "Visual capture payload is too small to be a reliable screenshot.",
        value: capture.base64Length,
        limit: thresholds.minBase64Length,
      });
    }

    if ((capture.visiblePixelRatio ?? 0) < thresholds.minVisiblePixelRatio) {
      issues.push({
        code: "capture-low-visibility",
        message: "Visual capture does not have enough visible pixels.",
        value: capture.visiblePixelRatio,
        limit: thresholds.minVisiblePixelRatio,
      });
    }

    if ((capture.colorBuckets ?? 0) < thresholds.minColorBuckets) {
      issues.push({
        code: "capture-low-color",
        message: "Visual capture does not have enough color variation.",
        value: capture.colorBuckets,
        limit: thresholds.minColorBuckets,
      });
    }

    if (!capture.perceptualHash || capture.perceptualHash.length !== 16) {
      issues.push({
        code: "capture-missing-fingerprint",
        message: "Visual capture is missing a 64-bit perceptual fingerprint.",
        value: capture.perceptualHash,
        limit: "16 hex chars",
      });
    }

    if (!/^[a-f0-9]{64}$/.test(capture.sha256)) {
      issues.push({
        code: "capture-missing-digest",
        message: "Visual capture is missing a SHA-256 file digest.",
        value: capture.sha256,
        limit: "64 lowercase hex chars",
      });
    }

    if (capture.scannedAnomalies < previousScannedAnomalies) {
      issues.push({
        code: "capture-scan-regressed",
        message: "Visual capture scan count moved backward.",
        value: capture.scannedAnomalies,
        limit: previousScannedAnomalies,
      });
    }

    previousScannedAnomalies = capture.scannedAnomalies;
  }

  validateSemanticCapture(manifest, "route-start", 0, 0, "camp", issues);
  validateSemanticCapture(manifest, "signal", undefined, 1, "ascending", issues);
  validateSemanticCapture(
    manifest,
    "goal",
    manifest.route.checkpointCount - 1,
    manifest.route.expectedScannedAnomalies,
    "extracted",
    issues
  );
}

function validateSemanticCapture(
  manifest: RealmVisualManifest,
  kind: RealmVisualCaptureKind,
  expectedPathIndex: number | undefined,
  minimumScannedAnomalies: number,
  expectedState: string,
  issues: RealmVisualManifestIssue[]
) {
  const capture = manifest.captures.find((item) => item.kind === kind);
  if (!capture) {
    return;
  }

  if (expectedPathIndex !== undefined && capture.pathIndex !== expectedPathIndex) {
    issues.push({
      code: "capture-path-index-mismatch",
      message: `${kind} capture is not at the expected golden-path index.`,
      value: capture.pathIndex,
      limit: expectedPathIndex,
    });
  }

  if (capture.scannedAnomalies < minimumScannedAnomalies) {
    issues.push({
      code: "capture-scan-regressed",
      message: `${kind} capture has not scanned enough anomalies.`,
      value: capture.scannedAnomalies,
      limit: minimumScannedAnomalies,
    });
  }

  if (capture.extractionState !== expectedState) {
    issues.push({
      code: "capture-invalid-state",
      message: `${kind} capture has the wrong extraction state.`,
      value: capture.extractionState,
      limit: expectedState,
    });
  }
}

function validateVisualDistinctness(
  manifest: RealmVisualManifest,
  thresholds: RealmVisualManifestThresholds,
  issues: RealmVisualManifestIssue[]
) {
  const distinctness = manifest.visualDistinctness;

  if (!distinctness.allFingerprintsUnique) {
    issues.push({
      code: "visual-fingerprints-not-unique",
      message: "Canonical visual captures must not share identical perceptual fingerprints.",
    });
  }

  if (distinctness.minimumHashDistance < thresholds.minHashDistance) {
    issues.push({
      code: "visual-hash-distance-too-low",
      message: "Canonical visual captures are too visually similar.",
      value: distinctness.minimumHashDistance,
      limit: thresholds.minHashDistance,
    });
  }

  for (const pair of distinctness.pairDistances) {
    if (pair.distance >= thresholds.minHashDistance) {
      continue;
    }

    issues.push({
      code: "visual-hash-distance-too-low",
      message: `${pair.from} and ${pair.to} captures are too visually similar.`,
      value: pair.distance,
      limit: thresholds.minHashDistance,
    });
  }
}

function validatePathfinding(manifest: RealmVisualManifest, issues: RealmVisualManifestIssue[]) {
  const pathfinding = manifest.pathfinding;
  const expectedGoldenSteps = manifest.route.checkpointCount - 1;

  if (!pathfinding.valid) {
    issues.push({
      code: "pathfinding-invalid",
      message: "Manifest pathfinding block reports invalid topology.",
    });
  }

  if (
    !pathfinding.discoveredPathMatchesGoldenPath ||
    pathfinding.discoveredPathDivergenceCount > 0 ||
    pathfinding.nonGoldenDiscoveredStepCount > 0 ||
    pathfinding.goldenPathShortcutCount > 0 ||
    pathfinding.goldenPathDetourCount > 0
  ) {
    issues.push({
      code: "pathfinding-diverged",
      message: "Manifest pathfinding route diverges from the declared golden path.",
      value: pathfinding.discoveredPathDivergenceCount,
      limit: 0,
    });
  }

  if (
    pathfinding.goldenStepCount !== expectedGoldenSteps ||
    pathfinding.traversableGoldenStepCount !== expectedGoldenSteps ||
    pathfinding.routeLinkTraversableCount !== expectedGoldenSteps
  ) {
    issues.push({
      code: "pathfinding-step-count-mismatch",
      message: "Manifest pathfinding step counts do not cover every golden-path segment.",
      value: pathfinding.traversableGoldenStepCount,
      limit: expectedGoldenSteps,
    });
  }
}

function validateYuka(manifest: RealmVisualManifest, issues: RealmVisualManifestIssue[]) {
  const yuka = manifest.yuka;

  if (!yuka.valid) {
    issues.push({
      code: "yuka-invalid",
      message: "Manifest Yuka block reports invalid playback.",
    });
  }

  if (
    yuka.landedFrameCount !== manifest.route.checkpointCount ||
    yuka.browserFrameCount <= yuka.landedFrameCount ||
    yuka.finalDistanceToGoal !== 0
  ) {
    issues.push({
      code: "yuka-frame-mismatch",
      message: "Manifest Yuka playback metrics do not cover the full golden route.",
      value: yuka.landedFrameCount,
      limit: manifest.route.checkpointCount,
    });
  }
}

function validateRuntime(manifest: RealmVisualManifest, issues: RealmVisualManifestIssue[]) {
  const runtime = manifest.runtime;
  const expectedFinalPathIndex = manifest.route.checkpointCount - 1;

  if (!runtime.valid) {
    issues.push({
      code: "runtime-invalid",
      message: "Manifest runtime telemetry block reports invalid playback.",
    });
  }

  if (
    runtime.pathRegressionCount > 0 ||
    runtime.targetRegressionCount > 0 ||
    runtime.objectiveRegressionCount > 0
  ) {
    issues.push({
      code: "runtime-regressed",
      message: "Manifest runtime telemetry reports progression regression.",
      value:
        runtime.pathRegressionCount +
        runtime.targetRegressionCount +
        runtime.objectiveRegressionCount,
      limit: 0,
    });
  }

  if (runtime.discoveredAnomalyCount < manifest.route.expectedScannedAnomalies) {
    issues.push({
      code: "runtime-scan-mismatch",
      message: "Manifest runtime telemetry did not scan the expected anomaly count.",
      value: runtime.discoveredAnomalyCount,
      limit: manifest.route.expectedScannedAnomalies,
    });
  }

  if (
    runtime.finalPathIndex !== expectedFinalPathIndex ||
    runtime.maximumPathIndex !== expectedFinalPathIndex ||
    runtime.extractionFrameCount <= 0 ||
    runtime.firstExtractionFrameIndex === null
  ) {
    issues.push({
      code: "runtime-extraction-mismatch",
      message: "Manifest runtime telemetry did not finish at the extraction goal.",
      value: runtime.finalPathIndex,
      limit: expectedFinalPathIndex,
    });
  }
}
