import { REALM_ARCHETYPE_IDS } from "@world/climber";
import { describe, expect, test } from "vitest";
import {
  advanceRealmRuntime,
  createInitialRealmRuntime,
  createNextRealmRuntime,
  summarizeRealmExpedition,
} from "./traits";

describe("realm runtime trait helpers", () => {
  test("tracks anomaly discovery and extraction state without mutating input", () => {
    const runtime = createInitialRealmRuntime("runtime-scan");
    const anomaly = runtime.activeRealm.anomalies[0];
    const scanned = advanceRealmRuntime(runtime, anomaly.position, 1_200);

    expect(scanned).not.toBe(runtime);
    expect(runtime.discoveredAnomalies).toEqual([]);
    expect(scanned.discoveredAnomalies).toContain(anomaly.id);
    expect(scanned.lastPlayerPosition).toEqual(anomaly.position);
    expect(scanned.nearestAnomalyId).toBe(anomaly.id);
    expect(scanned.lastScan).toEqual({
      id: anomaly.id,
      label: anomaly.label,
      elapsedMs: 1_200,
    });

    const exitPlatform = scanned.activeRealm.platforms.find(
      (platform) => platform.id === scanned.activeRealm.exitPlatformId
    );
    expect(exitPlatform).toBeTruthy();

    const extracted = advanceRealmRuntime(
      scanned,
      {
        x: exitPlatform?.position.x ?? 0,
        y: (exitPlatform?.position.y ?? 0) + (exitPlatform?.size.y ?? 0) / 2,
        z: exitPlatform?.position.z ?? 0,
      },
      4_000
    );

    expect(extracted.extractionState).toBe("extracted");
    expect(extracted.objectiveProgress).toBe(100);
    expect(extracted.agentPathIndex).toBe(scanned.activeRealm.goldenPath.length - 1);
  });

  test("accumulates hazard exposure into realm instability state", () => {
    const runtime = createHazardRuntime();
    const hazard = runtime.activeRealm.hazards[0];
    const exposed = advanceRealmRuntime(runtime, hazard.position, 1_000);
    const later = advanceRealmRuntime(exposed, hazard.position, 3_000);

    expect(exposed.activeHazardKind).toBe(hazard.kind);
    expect(exposed.hazardExposureMs).toBe(1_000);
    expect(later.hazardExposureMs).toBe(3_000);
    expect(later.instabilityRemaining).toBeLessThan(runtime.instabilityRemaining);
    expect(later.lastHazard).toEqual({
      kind: hazard.kind,
      elapsedMs: 3_000,
    });
  });

  test("creates deterministic next realms while preserving completion history", () => {
    const runtime = createInitialRealmRuntime("sequence-test");
    const scanned = {
      ...runtime,
      discoveredAnomalies: runtime.activeRealm.anomalies.slice(0, 2).map((anomaly) => anomaly.id),
      extractionState: "extracted" as const,
    };
    const next = createNextRealmRuntime(scanned);
    const again = createNextRealmRuntime(scanned);

    expect(next).toEqual(again);
    expect(next.baseSeed).toBe(runtime.baseSeed);
    expect(next.realmIndex).toBe(1);
    expect(next.seed).toBe("sequence-test-realm-2");
    expect(next.activeRealm.seed).toBe(next.seed);
    expect(next.activeRealm.archetype.id).toBe(next.archetype);
    expect(next.discoveredAnomalies).toEqual([]);
    expect(next.lastPlayerPosition).toEqual(next.activeRealm.platforms[0].position);
    expect(next.extractionState).toBe("camp");
    expect(next.completedRealms).toEqual([
      {
        seed: runtime.seed,
        archetype: runtime.archetype,
        outcome: "extracted",
        scannedAnomalies: 2,
        stabilityRemaining: runtime.instabilityRemaining,
      },
    ]);
  });

  test("marks realm collapse and records collapsed outcomes for rerolls", () => {
    const runtime = createInitialRealmRuntime("runtime-collapse");
    const collapsed = advanceRealmRuntime(
      runtime,
      runtime.activeRealm.platforms[0].position,
      240_000
    );
    const next = createNextRealmRuntime(collapsed);

    expect(collapsed.extractionState).toBe("collapsed");
    expect(collapsed.instabilityLevel).toBe("collapsed");
    expect(collapsed.objective).toContain("collapse");
    expect(next.completedRealms.at(-1)).toEqual({
      seed: collapsed.seed,
      archetype: collapsed.archetype,
      outcome: "collapsed",
      scannedAnomalies: 0,
      stabilityRemaining: 0,
    });
  });

  test("runtime realm progression covers each archetype before repeating", () => {
    const sequence = [createInitialRealmRuntime("runtime-variety")];

    while (sequence.length < REALM_ARCHETYPE_IDS.length) {
      const previous = sequence.at(-1);
      if (!previous) {
        throw new Error("missing previous runtime");
      }
      sequence.push(createNextRealmRuntime({ ...previous, extractionState: "extracted" }));
    }

    expect(sequence.map((runtime) => runtime.archetype).sort()).toEqual(
      [...REALM_ARCHETYPE_IDS].sort()
    );
  });

  test("summarizes completed expedition history and current realm progress", () => {
    const runtime = {
      ...createInitialRealmRuntime("survey-log"),
      realmIndex: 2,
      completedRealms: [
        {
          seed: "survey-log",
          archetype: "jungle" as const,
          outcome: "extracted" as const,
          scannedAnomalies: 3,
          stabilityRemaining: 42,
        },
        {
          seed: "survey-log-realm-2",
          archetype: "ocean" as const,
          outcome: "collapsed" as const,
          scannedAnomalies: 1,
          stabilityRemaining: 0,
        },
      ],
      discoveredAnomalies: ["active-signal"],
    };

    expect(summarizeRealmExpedition(runtime)).toEqual({
      currentRealmNumber: 3,
      completedCount: 2,
      extractedCount: 1,
      collapsedCount: 1,
      totalSignals: 5,
      averageSignals: 2.5,
      bestStabilityRemaining: 42,
      currentCyclePosition: 3,
      currentCycleSize: REALM_ARCHETYPE_IDS.length,
      lastCompleted: runtime.completedRealms[1],
    });
  });
});

function createHazardRuntime() {
  for (let index = 0; index < 30; index++) {
    const runtime = createInitialRealmRuntime(`runtime-hazard-${index}`);

    if (runtime.activeRealm.hazards.length > 0) {
      return runtime;
    }
  }

  throw new Error("Expected at least one runtime hazard seed.");
}
