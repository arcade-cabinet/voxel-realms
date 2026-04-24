import {
  DEFAULT_REALM_PREFERENCES,
  resetRealmPreferencesForTests,
  saveRealmPreferences,
} from "@app/shared/platform/persistence/preferences";
import { startBrowserGame } from "@app/test/browserGameHarness";
import { validateRealmPathfindingContract } from "@logic/games/voxel-realms/engine/realmPathfinding";
import { createRealmPlaythroughPlan } from "@logic/games/voxel-realms/engine/realmPlaythroughPlan";
import { validateRealmRuntimeTelemetry } from "@logic/games/voxel-realms/engine/realmRuntimeTelemetry";
import { createYukaRealmPlaythroughRun } from "@logic/games/voxel-realms/engine/realmYukaPlaythroughAgent";
import { createInitialVoxelState } from "@logic/games/voxel-realms/engine/voxelSimulation";
import {
  createInitialRealmRuntime,
  RealmTrait,
  VoxelTrait,
} from "@logic/games/voxel-realms/store/traits";
import { voxelEntity } from "@logic/games/voxel-realms/store/world";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import Game from "./Game";
import {
  captureVoxelRealmsScreenshot,
  createVisualDistinctnessSummary,
  formatYukaIssues,
  getFrameSettleMs,
  selectBrowserAgentFrames,
  teleportBrowserPlayer,
  type VoxelRealmsVisualManifestCapture,
  waitForBrowserTeleportReady,
  waitForCheckpoint,
  writeVoxelRealmsVisualManifest,
} from "./Game.test-helpers";

beforeEach(async () => {
  window.__VOXEL_REALMS_TEST__ = true;
  await resetRealmPreferencesForTests();
  await saveRealmPreferences({ ...DEFAULT_REALM_PREFERENCES, onboardingSeen: true });
  voxelEntity.set(RealmTrait, createInitialRealmRuntime());
  voxelEntity.set(VoxelTrait, createInitialVoxelState("menu"));
});

afterEach(() => {
  cleanup();
  window.__VOXEL_REALMS_TEST__ = false;
});

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
