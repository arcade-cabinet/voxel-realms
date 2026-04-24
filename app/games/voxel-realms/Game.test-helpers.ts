import {
  type BrowserGameScreenshotCapture,
  type BrowserGameViewport,
  captureBrowserGameScreenshot,
} from "@app/test/browserGameHarness";
import type { validateRealmPathfindingContract } from "@logic/games/voxel-realms/engine/realmPathfinding";
import type {
  createRealmPlaythroughPlan,
  RealmPlaythroughCheckpoint,
} from "@logic/games/voxel-realms/engine/realmPlaythroughPlan";
import type { validateRealmRuntimeTelemetry } from "@logic/games/voxel-realms/engine/realmRuntimeTelemetry";
import {
  type RealmVisualManifest,
  validateRealmVisualManifest,
} from "@logic/games/voxel-realms/engine/realmVisualManifest";
import type {
  createYukaRealmPlaythroughRun,
  RealmYukaPlaythroughFrame,
  RealmYukaPlaythroughIssue,
} from "@logic/games/voxel-realms/engine/realmYukaPlaythroughAgent";
import type { Vec3 } from "@logic/games/voxel-realms/engine/types";
import { waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { commands } from "vitest/browser";

export interface VoxelRealmsVisualManifestCapture extends BrowserGameScreenshotCapture {
  kind: "route-start" | "signal" | "goal";
  pathIndex: number;
  scannedAnomalies: number;
  extractionState: string | null;
}

export type VoxelRealmsBrowserTestGlobal = typeof globalThis & {
  __voxelRealmsTestTeleport?: (position: Vec3, lookAt?: Vec3) => void;
  __voxelRealmsTestTeleportCount?: number;
};

export async function captureVoxelRealmsScreenshot(
  kind: VoxelRealmsVisualManifestCapture["kind"],
  host: Element,
  rootElement: Element,
  viewport: BrowserGameViewport,
  path: string
): Promise<VoxelRealmsVisualManifestCapture> {
  const capture = await captureBrowserGameScreenshot(host, rootElement, viewport, path);

  return {
    ...capture,
    kind,
    pathIndex: Number(rootElement.getAttribute("data-realm-path-index") ?? 0),
    scannedAnomalies: Number(rootElement.getAttribute("data-realm-scanned") ?? 0),
    extractionState: rootElement.getAttribute("data-realm-extraction-state"),
  };
}

export async function writeVoxelRealmsVisualManifest({
  agentRun,
  captures,
  pathfinding,
  plan,
  runtimeTelemetry,
  visualDistinctness,
  viewport,
}: {
  agentRun: ReturnType<typeof createYukaRealmPlaythroughRun>;
  captures: VoxelRealmsVisualManifestCapture[];
  pathfinding: ReturnType<typeof validateRealmPathfindingContract>;
  plan: ReturnType<typeof createRealmPlaythroughPlan>;
  runtimeTelemetry: ReturnType<typeof validateRealmRuntimeTelemetry>;
  visualDistinctness: ReturnType<typeof createVisualDistinctnessSummary>;
  viewport: BrowserGameViewport;
}) {
  const manifest: RealmVisualManifest = {
    schemaVersion: 1,
    generatedBy: "vitest-browser",
    realmSeed: plan.realmSeed,
    archetypeId: plan.archetypeId,
    viewport,
    route: {
      startPlatformId: plan.startPlatformId,
      exitPlatformId: plan.exitPlatformId,
      checkpointCount: plan.checkpointCount,
      expectedScannedAnomalies: plan.expectedScannedAnomalies,
    },
    pathfinding: {
      valid: pathfinding.valid,
      discoveredPathMatchesGoldenPath: pathfinding.discoveredPathMatchesGoldenPath,
      discoveredPathLength: pathfinding.discoveredPathLength,
      shortestPathCost: pathfinding.shortestPathCost,
      reachablePlatformCount: pathfinding.reachablePlatformCount,
      traversableEdgeCount: pathfinding.traversableEdgeCount,
      goldenStepCount: pathfinding.goldenStepCount,
      traversableGoldenStepCount: pathfinding.traversableGoldenStepCount,
      routeLinkTraversableCount: pathfinding.routeLinkTraversableCount,
      goldenPathShortcutCount: pathfinding.goldenPathShortcutCount,
      goldenPathDetourCount: pathfinding.goldenPathDetourCount,
      discoveredPathDivergenceCount: pathfinding.discoveredPathDivergenceCount,
      firstDivergentPathIndex: pathfinding.firstDivergentPathIndex,
      nonGoldenDiscoveredStepCount: pathfinding.nonGoldenDiscoveredStepCount,
    },
    yuka: {
      valid: agentRun.valid,
      totalDurationMs: agentRun.totalDurationMs,
      frameCount: agentRun.frames.length,
      browserFrameCount: selectBrowserAgentFrames(agentRun.frames).length,
      landedFrameCount: agentRun.landedFrames.length,
      maximumSegmentDurationMs: agentRun.maximumSegmentDurationMs,
      maximumLandingDistance: agentRun.maximumLandingDistance,
      finalDistanceToGoal: agentRun.finalDistanceToGoal,
    },
    runtime: {
      valid: runtimeTelemetry.valid,
      frameCount: runtimeTelemetry.frameCount,
      finalPathIndex: runtimeTelemetry.finalPathIndex,
      maximumPathIndex: runtimeTelemetry.maximumPathIndex,
      discoveredAnomalyCount: runtimeTelemetry.discoveredAnomalyIds.length,
      extractionFrameCount: runtimeTelemetry.extractionFrameCount,
      firstExtractionFrameIndex: runtimeTelemetry.firstExtractionFrameIndex,
      minimumInstabilityRemaining: runtimeTelemetry.minimumInstabilityRemaining,
      minimumInstabilityRatio: runtimeTelemetry.minimumInstabilityRatio,
      hazardExposureMs: runtimeTelemetry.hazardExposureMs,
      pathRegressionCount: runtimeTelemetry.pathRegressionCount,
      targetRegressionCount: runtimeTelemetry.targetRegressionCount,
      objectiveRegressionCount: runtimeTelemetry.objectiveRegressionCount,
    },
    visualDistinctness,
    captures,
  };
  const manifestValidation = validateRealmVisualManifest(manifest);

  expect(
    manifestValidation.valid,
    manifestValidation.issues.map((issue) => issue.code).join(", ")
  ).toBe(true);

  await commands.writeFile(
    "test-screenshots/voxel-realms-manifest.json",
    JSON.stringify(manifest, null, 2)
  );
}

export function createVisualDistinctnessSummary(captures: VoxelRealmsVisualManifestCapture[]) {
  const pairDistances: Array<{
    from: VoxelRealmsVisualManifestCapture["kind"];
    to: VoxelRealmsVisualManifestCapture["kind"];
    distance: number;
  }> = [];

  for (let fromIndex = 0; fromIndex < captures.length; fromIndex++) {
    for (let toIndex = fromIndex + 1; toIndex < captures.length; toIndex++) {
      const from = captures[fromIndex];
      const to = captures[toIndex];

      pairDistances.push({
        from: from.kind,
        to: to.kind,
        distance: hammingDistance(from.perceptualHash, to.perceptualHash),
      });
    }
  }

  const hashes = captures
    .map((capture) => capture.perceptualHash)
    .filter((hash): hash is string => Boolean(hash));
  const visiblePixelRatios = captures
    .map((capture) => capture.visiblePixelRatio)
    .filter((value): value is number => typeof value === "number");
  const colorBuckets = captures
    .map((capture) => capture.colorBuckets)
    .filter((value): value is number => typeof value === "number");

  return {
    allFingerprintsPresent: hashes.length === captures.length,
    allFingerprintsUnique: new Set(hashes).size === captures.length,
    minimumHashDistance: Math.min(...pairDistances.map((pair) => pair.distance)),
    minimumColorBuckets: Math.min(...colorBuckets),
    minimumVisiblePixelRatio: Math.min(...visiblePixelRatios),
    pairDistances,
  };
}

function hammingDistance(left: string | null, right: string | null) {
  if (!left || !right || left.length !== right.length) {
    return 0;
  }

  let distance = 0;

  for (let index = 0; index < left.length; index++) {
    const leftNibble = Number.parseInt(left[index], 16);
    const rightNibble = Number.parseInt(right[index], 16);
    const diff = leftNibble ^ rightNibble;
    distance += countBits(diff);
  }

  return distance;
}

function countBits(value: number) {
  let bits = 0;
  let remaining = value;

  while (remaining > 0) {
    bits += remaining & 1;
    remaining >>= 1;
  }

  return bits;
}

export function selectBrowserAgentFrames(frames: RealmYukaPlaythroughFrame[]) {
  return frames.filter((frame, index) => frame.landed || frame.capture || index % 32 === 0);
}

export function getFrameSettleMs(frame: RealmYukaPlaythroughFrame) {
  if (frame.capture) {
    return 450;
  }

  return frame.landed ? 90 : 0;
}

export function formatYukaIssues(issues: RealmYukaPlaythroughIssue[]) {
  return issues
    .map((issue) => `${issue.code}: ${issue.message} (${issue.from ?? "?"}->${issue.to ?? "?"})`)
    .join(", ");
}

export async function waitForBrowserTeleportReady() {
  const testGlobal = globalThis as VoxelRealmsBrowserTestGlobal;

  await waitFor(() => expect(typeof testGlobal.__voxelRealmsTestTeleport).toBe("function"));
}

export async function teleportBrowserPlayer(position: Vec3, lookAt: Vec3, settleMs: number) {
  const testGlobal = globalThis as VoxelRealmsBrowserTestGlobal;
  const previousCount = testGlobal.__voxelRealmsTestTeleportCount ?? 0;

  testGlobal.__voxelRealmsTestTeleport?.(position, lookAt);

  expect(testGlobal.__voxelRealmsTestTeleportCount).toBe(previousCount + 1);

  if (settleMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, settleMs));
  }
}

export async function waitForCheckpoint(
  rootElement: Element,
  checkpoint: RealmPlaythroughCheckpoint
) {
  await waitFor(() =>
    expect(Number(rootElement.getAttribute("data-realm-path-index"))).toBe(
      checkpoint.expectedPathIndex
    )
  );
  await waitFor(() =>
    expect(Number(rootElement.getAttribute("data-realm-scanned"))).toBeGreaterThanOrEqual(
      checkpoint.expectedMinimumScanned
    )
  );

  if (checkpoint.capture === "goal") {
    await waitFor(() =>
      expect(rootElement.getAttribute("data-realm-extraction-state")).toBe("extracted")
    );
  } else if (checkpoint.expectedPathIndex > 0) {
    await waitFor(() =>
      expect(rootElement.getAttribute("data-realm-extraction-state")).toMatch(/ascending|extracted/)
    );
  }
}
