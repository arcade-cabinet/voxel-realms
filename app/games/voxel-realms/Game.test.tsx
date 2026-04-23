import {
  type BrowserGameScreenshotCapture,
  type BrowserGameViewport,
  captureBrowserGameScreenshot,
  startBrowserGame,
} from "@app/test/browserGameHarness";
import { validateRealmPathfindingContract } from "@logic/games/voxel-realms/engine/realmPathfinding";
import {
  createRealmPlaythroughPlan,
  type RealmPlaythroughCheckpoint,
} from "@logic/games/voxel-realms/engine/realmPlaythroughPlan";
import { validateRealmRuntimeTelemetry } from "@logic/games/voxel-realms/engine/realmRuntimeTelemetry";
import {
  type RealmVisualManifest,
  validateRealmVisualManifest,
} from "@logic/games/voxel-realms/engine/realmVisualManifest";
import {
  createYukaRealmPlaythroughRun,
  type RealmYukaPlaythroughFrame,
  type RealmYukaPlaythroughIssue,
} from "@logic/games/voxel-realms/engine/realmYukaPlaythroughAgent";
import type { Vec3 } from "@logic/games/voxel-realms/engine/types";
import { createInitialVoxelState } from "@logic/games/voxel-realms/engine/voxelSimulation";
import {
  createInitialRealmRuntime,
  RealmTrait,
  VoxelTrait,
} from "@logic/games/voxel-realms/store/traits";
import { voxelEntity } from "@logic/games/voxel-realms/store/world";
import { cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { commands } from "vitest/browser";
import Game from "./Game";

type VoxelRealmsBrowserTestGlobal = typeof globalThis & {
  __voxelRealmsTestTeleport?: (position: Vec3, lookAt?: Vec3) => void;
  __voxelRealmsTestTeleportCount?: number;
};

interface VoxelRealmsVisualManifestCapture extends BrowserGameScreenshotCapture {
  kind: "route-start" | "signal" | "goal";
  pathIndex: number;
  scannedAnomalies: number;
  extractionState: string | null;
}

beforeEach(() => {
  voxelEntity.set(RealmTrait, createInitialRealmRuntime());
  voxelEntity.set(VoxelTrait, createInitialVoxelState("menu"));
});

afterEach(() => {
  cleanup();
});

test("Voxel Realms reaches gameplay and captures a browser start screenshot", async () => {
  const viewport = {
    height: 720,
    name: "desktop",
    width: 1280,
  };

  const result = await startBrowserGame(
    {
      Component: Game,
      expectsCanvas: true,
      ready: "HP",
      startFlow: ["Enter Realm"],
      title: "Voxel Realms",
    },
    viewport
  );

  const startCapture = await captureBrowserGameScreenshot(
    result.host,
    result.rootElement,
    viewport,
    `test-screenshots/voxel-realms-${viewport.name}.png`
  );

  expect(startCapture.path).toContain(`voxel-realms-${viewport.name}.png`);
}, 60_000);

test("Voxel Realms follows the deterministic golden path to goal capture", async () => {
  const viewport = {
    height: 720,
    name: "desktop",
    width: 1280,
  };
  const result = await startBrowserGame(
    {
      Component: Game,
      expectsCanvas: true,
      ready: "HP",
      startFlow: ["Enter Realm"],
      title: "Voxel Realms",
    },
    viewport
  );
  const realm = createInitialRealmRuntime().activeRealm;
  const plan = createRealmPlaythroughPlan(realm);
  const pathfinding = validateRealmPathfindingContract(realm);
  const agentRun = createYukaRealmPlaythroughRun(plan);
  const runtimeTelemetry = validateRealmRuntimeTelemetry(realm, agentRun.frames, {
    expectedMinimumScans: plan.expectedScannedAnomalies,
    finalCheckpointIndex: plan.checkpointCount - 1,
  });
  const browserFrames = selectBrowserAgentFrames(agentRun.frames);
  const captures: VoxelRealmsVisualManifestCapture[] = [];
  let capturedSignal = false;
  let goalPath = "";

  expect(pathfinding.valid, pathfinding.issues.map((issue) => issue.code).join(", ")).toBe(true);
  expect(pathfinding.discoveredPath[0]).toBe(realm.startPlatformId);
  expect(pathfinding.discoveredPath.at(-1)).toBe(realm.exitPlatformId);
  expect(pathfinding.discoveredPathMatchesGoldenPath).toBe(true);
  expect(pathfinding.discoveredPathDivergenceCount).toBe(0);
  expect(pathfinding.nonGoldenDiscoveredStepCount).toBe(0);
  expect(agentRun.valid, formatYukaIssues(agentRun.issues)).toBe(true);
  expect(agentRun.landedFrames).toHaveLength(plan.checkpointCount);
  expect(
    runtimeTelemetry.valid,
    runtimeTelemetry.issues.map((issue) => issue.code).join(", ")
  ).toBe(true);
  expect(runtimeTelemetry.pathRegressionCount).toBe(0);
  expect(runtimeTelemetry.objectiveRegressionCount).toBe(0);
  expect(runtimeTelemetry.finalPathIndex).toBe(plan.checkpointCount - 1);
  expect(runtimeTelemetry.discoveredAnomalyIds).toHaveLength(plan.expectedScannedAnomalies);
  expect(browserFrames.length).toBeGreaterThan(plan.checkpointCount);

  await waitForBrowserTeleportReady();
  for (const frame of browserFrames) {
    await teleportBrowserPlayer(frame.position, frame.lookAt, getFrameSettleMs(frame));

    if (!frame.landed) {
      continue;
    }

    const checkpoint = plan.checkpoints[frame.targetCheckpointIndex];
    await waitForCheckpoint(result.rootElement, checkpoint);

    if (frame.capture === "route-start") {
      captures.push(
        await captureVoxelRealmsScreenshot(
          "route-start",
          result.host,
          result.rootElement,
          viewport,
          `test-screenshots/voxel-realms-${viewport.name}.png`
        )
      );
    }

    if (frame.capture === "signal" && !capturedSignal) {
      capturedSignal = true;
      const signalCapture = await captureVoxelRealmsScreenshot(
        "signal",
        result.host,
        result.rootElement,
        viewport,
        `test-screenshots/voxel-realms-signal-${viewport.name}.png`
      );
      captures.push(signalCapture);
      expect(signalCapture.path).toContain(`voxel-realms-signal-${viewport.name}.png`);
    }

    if (frame.capture === "goal") {
      const goalCapture = await captureVoxelRealmsScreenshot(
        "goal",
        result.host,
        result.rootElement,
        viewport,
        `test-screenshots/voxel-realms-goal-${viewport.name}.png`
      );
      captures.push(goalCapture);
      goalPath = goalCapture.path;
    }
  }

  expect(capturedSignal).toBe(true);
  expect(goalPath).toContain(`voxel-realms-goal-${viewport.name}.png`);
  expect(result.rootElement.getAttribute("data-realm-extraction-state")).toBe("extracted");
  expect(captures.map((capture) => capture.kind)).toEqual(["route-start", "signal", "goal"]);
  const visualDistinctness = createVisualDistinctnessSummary(captures);

  expect(visualDistinctness.allFingerprintsPresent).toBe(true);
  expect(visualDistinctness.allFingerprintsUnique).toBe(true);
  expect(visualDistinctness.minimumHashDistance).toBeGreaterThanOrEqual(4);
  expect(visualDistinctness.minimumColorBuckets).toBeGreaterThanOrEqual(24);
  expect(visualDistinctness.minimumVisiblePixelRatio).toBeGreaterThan(0.9);

  await writeVoxelRealmsVisualManifest({
    agentRun,
    captures,
    pathfinding,
    plan,
    runtimeTelemetry,
    visualDistinctness,
    viewport,
  });
}, 150_000);

async function captureVoxelRealmsScreenshot(
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

async function writeVoxelRealmsVisualManifest({
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

function createVisualDistinctnessSummary(captures: VoxelRealmsVisualManifestCapture[]) {
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

function selectBrowserAgentFrames(frames: RealmYukaPlaythroughFrame[]) {
  return frames.filter((frame, index) => frame.landed || frame.capture || index % 32 === 0);
}

function getFrameSettleMs(frame: RealmYukaPlaythroughFrame) {
  if (frame.capture) {
    return 450;
  }

  return frame.landed ? 90 : 0;
}

function formatYukaIssues(issues: RealmYukaPlaythroughIssue[]) {
  return issues
    .map((issue) => `${issue.code}: ${issue.message} (${issue.from ?? "?"}->${issue.to ?? "?"})`)
    .join(", ");
}

async function waitForBrowserTeleportReady() {
  const testGlobal = globalThis as VoxelRealmsBrowserTestGlobal;

  await waitFor(() => expect(typeof testGlobal.__voxelRealmsTestTeleport).toBe("function"));
}

async function teleportBrowserPlayer(position: Vec3, lookAt: Vec3, settleMs: number) {
  const testGlobal = globalThis as VoxelRealmsBrowserTestGlobal;
  const previousCount = testGlobal.__voxelRealmsTestTeleportCount ?? 0;

  testGlobal.__voxelRealmsTestTeleport?.(position, lookAt);

  expect(testGlobal.__voxelRealmsTestTeleportCount).toBe(previousCount + 1);

  if (settleMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, settleMs));
  }
}

async function waitForCheckpoint(rootElement: Element, checkpoint: RealmPlaythroughCheckpoint) {
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
