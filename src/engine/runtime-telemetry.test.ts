import { describe, expect, test } from "vitest";
import { createInitialRealmRuntime } from "@store/traits";
import { generateRealmClimb } from "@world/climber";
import { createRealmPlaythroughPlan } from "@world/playthrough-plan";
import { validateRealmRuntimeTelemetry } from "@engine/runtime-telemetry";
import { createRealmSequenceEntry } from "@world/sequence";
import { createYukaRealmPlaythroughRun } from "@ai/yuka-agent";

describe("validateRealmRuntimeTelemetry", () => {
  test("replays every Yuka frame through runtime progress without regressions", () => {
    const realm = createInitialRealmRuntime().activeRealm;
    const plan = createRealmPlaythroughPlan(realm);
    const yuka = createYukaRealmPlaythroughRun(plan);
    const telemetry = validateRealmRuntimeTelemetry(realm, yuka.frames, {
      expectedMinimumScans: plan.expectedScannedAnomalies,
      finalCheckpointIndex: plan.checkpointCount - 1,
    });

    expect(telemetry.valid, telemetry.issues.map((issue) => issue.code).join(", ")).toBe(true);
    expect(telemetry.frameCount).toBe(yuka.frames.length);
    expect(telemetry.finalPathIndex).toBe(plan.checkpointCount - 1);
    expect(telemetry.maximumPathIndex).toBe(plan.checkpointCount - 1);
    expect(telemetry.discoveredAnomalyIds).toHaveLength(plan.expectedScannedAnomalies);
    expect(telemetry.pathRegressionCount).toBe(0);
    expect(telemetry.targetRegressionCount).toBe(0);
    expect(telemetry.objectiveRegressionCount).toBe(0);
    expect(telemetry.extractionFrameCount).toBeGreaterThan(0);
    expect(telemetry.firstExtractionFrameIndex).not.toBeNull();
    expect(telemetry.minimumInstabilityRemaining).toBeGreaterThan(0);
  });

  test("stays valid across deterministic realm sequence samples", () => {
    for (let realmIndex = 0; realmIndex < 5; realmIndex++) {
      const entry = createRealmSequenceEntry("runtime-telemetry-cycle", realmIndex);
      const realm = generateRealmClimb({ archetype: entry.archetype, seed: entry.seed });
      const plan = createRealmPlaythroughPlan(realm);
      const yuka = createYukaRealmPlaythroughRun(plan);
      const telemetry = validateRealmRuntimeTelemetry(realm, yuka.frames, {
        expectedMinimumScans: plan.expectedScannedAnomalies,
        finalCheckpointIndex: plan.checkpointCount - 1,
      });

      expect(
        telemetry.valid,
        `${entry.archetype} ${entry.seed}: ${telemetry.issues.map((issue) => issue.code).join(", ")}`
      ).toBe(true);
      expect(telemetry.finalPathIndex).toBe(plan.checkpointCount - 1);
    }
  });

  test("reports missing scans and missing extraction on truncated frame data", () => {
    const realm = createInitialRealmRuntime().activeRealm;
    const plan = createRealmPlaythroughPlan(realm);
    const yuka = createYukaRealmPlaythroughRun(plan);
    const telemetry = validateRealmRuntimeTelemetry(realm, yuka.frames.slice(0, 8), {
      expectedMinimumScans: plan.expectedScannedAnomalies,
      finalCheckpointIndex: plan.checkpointCount - 1,
    });

    expect(telemetry.valid).toBe(false);
    expect(telemetry.issues.map((issue) => issue.code)).toContain("missing-expected-scan");
    expect(telemetry.issues.map((issue) => issue.code)).toContain("goal-not-extracted");
  });
});
