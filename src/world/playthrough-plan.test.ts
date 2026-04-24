import { generateRealmClimb, REALM_ARCHETYPE_IDS } from "@world/climber";
import { createRealmPlaythroughPlan } from "@world/playthrough-plan";
import { describe, expect, test } from "vitest";

describe("realm playthrough plan", () => {
  test("creates deterministic checkpoint plans for every generated golden path", () => {
    const realm = generateRealmClimb({
      seed: "checkpoint-determinism",
      archetype: "ocean",
    });
    const plan = createRealmPlaythroughPlan(realm);
    const again = createRealmPlaythroughPlan(realm);

    expect(plan).toEqual(again);
    expect(plan.checkpointCount).toBe(realm.goldenPath.length);
    expect(plan.checkpoints[0].kind).toBe("start");
    expect(plan.checkpoints[0].capture).toBe("route-start");
    expect(plan.checkpoints.at(-1)?.kind).toBe("goal");
    expect(plan.checkpoints.at(-1)?.capture).toBe("goal");
    expect(plan.checkpoints.at(-1)?.platformId).toBe(realm.exitPlatformId);
    expect(plan.expectedScannedAnomalies).toBeGreaterThan(0);
    expect(plan.checkpoints.some((checkpoint) => checkpoint.capture === "signal")).toBe(true);
  });

  test("keeps checkpoint indexes, scan expectations, and coordinates finite across seed batches", () => {
    const seeds = Array.from({ length: 6 }, (_, index) => `checkpoint-seed-${index + 1}`);

    for (const archetype of REALM_ARCHETYPE_IDS) {
      for (const seed of seeds) {
        const realm = generateRealmClimb({ seed, archetype });
        const plan = createRealmPlaythroughPlan(realm);
        let previousScanned = 0;

        expect(plan.checkpoints).toHaveLength(realm.goldenPath.length);

        plan.checkpoints.forEach((checkpoint, index) => {
          expect(checkpoint.platformId, `${archetype}:${seed}:${index}`).toBe(
            realm.goldenPath[index]
          );
          expect(checkpoint.expectedPathIndex).toBe(index);
          expect(checkpoint.expectedMinimumScanned).toBeGreaterThanOrEqual(previousScanned);
          expect(Number.isFinite(checkpoint.position.x)).toBe(true);
          expect(Number.isFinite(checkpoint.position.y)).toBe(true);
          expect(Number.isFinite(checkpoint.position.z)).toBe(true);
          expect(Number.isFinite(checkpoint.cameraPosition.x)).toBe(true);
          expect(Number.isFinite(checkpoint.cameraPosition.y)).toBe(true);
          expect(Number.isFinite(checkpoint.cameraPosition.z)).toBe(true);
          expect(checkpoint.cameraPosition.y).toBeGreaterThan(checkpoint.position.y);
          expect(Number.isFinite(checkpoint.lookAt.x)).toBe(true);
          expect(Number.isFinite(checkpoint.lookAt.y)).toBe(true);
          expect(Number.isFinite(checkpoint.lookAt.z)).toBe(true);
          expect(
            Boolean(checkpoint.lookTargetPlatformId) || Boolean(checkpoint.lookTargetAnomalyId)
          ).toBe(true);

          previousScanned = checkpoint.expectedMinimumScanned;
        });

        expect(plan.checkpoints.at(-1)?.expectedMinimumScanned).toBeGreaterThan(0);
      }
    }
  });
});
