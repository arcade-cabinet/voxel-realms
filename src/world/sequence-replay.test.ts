import { describe, expect, test } from "vitest";
import { DEFAULT_REALM_SEED, generateRealmClimb } from "@world/climber";
import { createRealmPlaythroughPlan } from "@world/playthrough-plan";
import { validateRealmRuntimeTelemetry } from "@engine/runtime-telemetry";
import { createRealmSequence } from "@world/sequence";
import { createYukaRealmPlaythroughRun } from "@ai/yuka-agent";

/**
 * Full-sequence replay check (P7.3). Walks the first N realms the game
 * generates from the default seed and asserts each realm's deterministic
 * Yuka playthrough survives the runtime telemetry validator without
 * regressing path index, target, or objective. Catches drift in
 * generator, plan, agent, or telemetry layers that a single-realm test
 * would miss.
 */
describe("realm sequence replay", () => {
  const SEQUENCE_LENGTH = 8;

  test("every realm in the default sequence replays cleanly", () => {
    const sequence = createRealmSequence(DEFAULT_REALM_SEED, SEQUENCE_LENGTH);

    for (const entry of sequence) {
      const realm = generateRealmClimb({ seed: entry.seed, archetype: entry.archetype });
      const plan = createRealmPlaythroughPlan(realm);
      const yuka = createYukaRealmPlaythroughRun(plan);

      expect(
        yuka.valid,
        `realm ${entry.realmIndex} yuka: ${yuka.issues.map((issue) => issue.code).join(", ")}`
      ).toBe(true);

      const telemetry = validateRealmRuntimeTelemetry(realm, yuka.frames, {
        expectedMinimumScans: plan.expectedScannedAnomalies,
        finalCheckpointIndex: plan.checkpointCount - 1,
      });

      expect(
        telemetry.valid,
        `realm ${entry.realmIndex} (${entry.archetype}): ${telemetry.issues.map((issue) => issue.code).join(", ")}`
      ).toBe(true);
      expect(telemetry.pathRegressionCount, `realm ${entry.realmIndex} path regressions`).toBe(0);
      expect(
        telemetry.objectiveRegressionCount,
        `realm ${entry.realmIndex} objective regressions`
      ).toBe(0);
      expect(telemetry.finalPathIndex).toBe(plan.checkpointCount - 1);
      expect(telemetry.minimumInstabilityRemaining).toBeGreaterThan(0);
    }
  });

  test("sequence covers every archetype at least once within the first cycle", () => {
    const sequence = createRealmSequence(DEFAULT_REALM_SEED, 5);
    const archetypes = new Set(sequence.map((entry) => entry.archetype));
    // Five archetypes, five realms per cycle — every one should show up exactly once.
    expect(archetypes.size).toBe(5);
  });
});
