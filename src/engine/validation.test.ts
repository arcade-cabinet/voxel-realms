import { describe, expect, test } from "vitest";
import { REALM_ARCHETYPE_IDS } from "@world/climber";
import { validateRealmBatch } from "@engine/validation";

describe("realm validation batch", () => {
  test("validates deterministic generator and agent runs across a seed batch", () => {
    const report = validateRealmBatch({
      seedPrefix: "batch-contract",
      seedsPerArchetype: 8,
    });
    const again = validateRealmBatch({
      seedPrefix: "batch-contract",
      seedsPerArchetype: 8,
    });

    expect(report).toEqual(again);
    expect(report.total).toBe(REALM_ARCHETYPE_IDS.length * 8);
    expect(report.invalid).toBe(0);
    expect(report.valid).toBe(report.total);
    expect(report.summaries).toHaveLength(REALM_ARCHETYPE_IDS.length);
    expect(report.entries.every((entry) => entry.generatorValid && entry.agentValid)).toBe(true);
    expect(report.entries.every((entry) => entry.pathfindingValid)).toBe(true);
    expect(report.entries.every((entry) => entry.runtimeTelemetryValid)).toBe(true);
    expect(report.entries.every((entry) => entry.yukaValid)).toBe(true);
    expect(report.entries.every((entry) => entry.spatialValid)).toBe(true);
    expect(report.entries.every((entry) => entry.framingValid)).toBe(true);
    expect(report.entries.every((entry) => entry.pathfindingIssues.length === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.runtimeTelemetryIssues.length === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.spatialIssues.length === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.framingIssues.length === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.yukaIssues.length === 0)).toBe(true);
    expect(
      report.entries.every(
        (entry) => entry.traversableGoldenStepCount === entry.goldenPathLength - 1
      )
    ).toBe(true);
    expect(report.entries.every((entry) => entry.discoveredPathMatchesGoldenPath)).toBe(true);
    expect(report.entries.every((entry) => entry.discoveredPathDivergenceCount === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.nonGoldenDiscoveredStepCount === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.goldenPathShortcutCount === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.goldenPathDetourCount === 0)).toBe(true);
    expect(
      report.entries.every((entry) => entry.runtimeFinalPathIndex === entry.goldenPathLength - 1)
    ).toBe(true);
    expect(
      report.entries.every((entry) => entry.runtimeMaximumPathIndex === entry.goldenPathLength - 1)
    ).toBe(true);
    expect(
      report.entries.every(
        (entry) => entry.runtimeDiscoveredAnomalyCount >= entry.scannedAnomalyCount
      )
    ).toBe(true);
    expect(report.entries.every((entry) => entry.runtimeExtractionFrameCount > 0)).toBe(true);
    expect(report.entries.every((entry) => entry.runtimePathRegressionCount === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.runtimeObjectiveRegressionCount === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.runtimeMinimumInstabilityRemaining > 0)).toBe(
      true
    );
    expect(
      report.entries.every((entry) => entry.routeLinkTraversableCount === entry.routeLinkCount)
    ).toBe(true);
    expect(
      report.entries.every((entry) => entry.reachablePlatformCount >= entry.goldenPathLength)
    ).toBe(true);
    expect(report.entries.every((entry) => entry.unsupportedLandingSampleCount === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.visualCaptureCount === 3)).toBe(true);
    expect(
      report.entries.every((entry) => entry.yukaLandedFrameCount === entry.goldenPathLength)
    ).toBe(true);
    expect(report.entries.every((entry) => entry.yukaFrameCount > entry.goldenPathLength)).toBe(
      true
    );
    expect(report.entries.every((entry) => entry.finalYukaGoalDistance === 0)).toBe(true);
    expect(report.entries.every((entry) => entry.scannedAnomalyCount > 0)).toBe(true);
    expect(report.entries.every((entry) => entry.runtimeAnomalyCount > 0)).toBe(true);
    expect(
      report.entries.every((entry) => entry.uniqueAnomalyAssetCount === entry.anomalyCount)
    ).toBe(true);
  });

  test("can fail fast when the movement envelope is made intentionally impossible", () => {
    const report = validateRealmBatch({
      seedPrefix: "batch-impossible",
      seedsPerArchetype: 3,
      movement: { maxJumpDistance: 0.5 },
      failFast: true,
    });

    expect(report.total).toBe(1);
    expect(report.invalid).toBe(1);
    expect(report.entries[0].goldenPathIssues.map((issue) => issue.code)).toContain("gap-too-wide");
    expect(report.entries[0].spatialIssues.length).toBe(0);
    expect(report.entries[0].framingIssues.length).toBe(0);
  });

  test("validates deterministic discovery sequences across all archetypes", () => {
    const report = validateRealmBatch({
      seedPrefix: "sequence-contract",
      sequenceCount: REALM_ARCHETYPE_IDS.length * 2,
    });

    expect(report.sequenceCount).toBe(REALM_ARCHETYPE_IDS.length * 2);
    expect(report.total).toBe(REALM_ARCHETYPE_IDS.length * 2);
    expect(report.invalid).toBe(0);

    for (let cycle = 0; cycle < 2; cycle++) {
      const archetypes = report.entries
        .slice(cycle * REALM_ARCHETYPE_IDS.length, (cycle + 1) * REALM_ARCHETYPE_IDS.length)
        .map((entry) => entry.archetype)
        .sort();

      expect(archetypes).toEqual([...REALM_ARCHETYPE_IDS].sort());
    }
  });
});
