import { describe, expect, test } from "vitest";
import { createInitialRealmRuntime } from "@store/traits";

/**
 * P3.2 failure-recovery retry contract: re-creating the realm with the
 * same baseSeed, realmIndex, and prior completedRealms produces an
 * identical realm shape (same archetype, same platform layout, same
 * anomaly seeds). The retry must not consume a new sequence entry or
 * advance the expedition cycle.
 */
describe("same-seed realm retry", () => {
  test("retry produces identical archetype and realm seed", () => {
    const first = createInitialRealmRuntime("retry-seed", 2, []);
    const retry = createInitialRealmRuntime("retry-seed", 2, []);

    expect(retry.archetype).toBe(first.archetype);
    expect(retry.seed).toBe(first.seed);
    expect(retry.realmIndex).toBe(first.realmIndex);
  });

  test("retry produces identical golden path", () => {
    const first = createInitialRealmRuntime("retry-seed", 1, []);
    const retry = createInitialRealmRuntime("retry-seed", 1, []);

    expect(retry.activeRealm.goldenPath).toEqual(first.activeRealm.goldenPath);
    expect(retry.activeRealm.platforms.map((p) => p.id)).toEqual(
      first.activeRealm.platforms.map((p) => p.id)
    );
  });

  test("retry preserves prior completedRealms ledger", () => {
    const priorCompleted = [
      {
        seed: "realm-0",
        archetype: "jungle" as const,
        outcome: "extracted" as const,
        scannedAnomalies: 2,
        stabilityRemaining: 45,
      },
    ];
    const retry = createInitialRealmRuntime("retry-seed", 1, priorCompleted);

    expect(retry.completedRealms).toEqual(priorCompleted);
    expect(retry.realmIndex).toBe(1);
    expect(retry.extractionState).toBe("camp");
    expect(retry.discoveredAnomalies).toEqual([]);
  });

  test("different realmIndex yields different archetype sequence", () => {
    const a = createInitialRealmRuntime("retry-seed", 0, []);
    const b = createInitialRealmRuntime("retry-seed", 1, []);

    // Sequences cycle through five archetypes; consecutive indices must
    // pick different slots.
    expect(a.archetype).not.toBe(b.archetype);
  });
});
