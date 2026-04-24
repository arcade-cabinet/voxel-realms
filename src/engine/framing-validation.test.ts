import { describe, expect, test } from "vitest";
import { generateRealmClimb, REALM_ARCHETYPE_IDS } from "@world/climber";
import { validateRealmFramingContract } from "@engine/framing-validation";
import { createRealmPlaythroughPlan } from "@world/playthrough-plan";

describe("realm framing validation", () => {
  test("keeps generated checkpoint cameras pointed at readable route targets", () => {
    const seeds = Array.from({ length: 8 }, (_, index) => `framing-contract-${index + 1}`);

    for (const archetype of REALM_ARCHETYPE_IDS) {
      for (const seed of seeds) {
        const realm = generateRealmClimb({ seed, archetype });
        const framing = validateRealmFramingContract(realm);

        expect(framing.issues, `${archetype}:${seed}`).toEqual([]);
        expect(framing.valid).toBe(true);
        expect(framing.metrics.captureCount).toBe(3);
        expect(framing.metrics.maximumNextPlatformAngle).toBeLessThanOrEqual(42);
        expect(framing.metrics.maximumCaptureTargetAngle).toBeLessThanOrEqual(58);
        expect(framing.metrics.minimumLookDistance).toBeGreaterThanOrEqual(1.2);
        expect(framing.metrics.occludedViewCount).toBe(0);
      }
    }
  });

  test("reports a checkpoint looking away from the next route platform", () => {
    const realm = generateRealmClimb({
      seed: "framing-backwards-route",
      archetype: "jungle",
    });
    const plan = createRealmPlaythroughPlan(realm);
    const brokenIndex = plan.checkpoints.findIndex(
      (checkpoint) => checkpoint.kind === "route" && checkpoint.capture !== "signal"
    );
    expect(brokenIndex).toBeGreaterThan(0);
    const routeCheckpoint = plan.checkpoints[brokenIndex];
    const broken = {
      ...plan,
      checkpoints: plan.checkpoints.map((checkpoint, index) =>
        index === brokenIndex
          ? {
              ...checkpoint,
              lookAt: {
                x: checkpoint.position.x * 2 - routeCheckpoint.lookAt.x,
                y: checkpoint.position.y * 2 - routeCheckpoint.lookAt.y,
                z: checkpoint.position.z * 2 - routeCheckpoint.lookAt.z,
              },
            }
          : checkpoint
      ),
    };
    const framing = validateRealmFramingContract(realm, broken);

    expect(framing.valid).toBe(false);
    expect(framing.issues.map((issue) => issue.code)).toContain("next-platform-outside-frame");
  });

  test("reports missing visual capture coverage", () => {
    const realm = generateRealmClimb({
      seed: "framing-missing-captures",
      archetype: "ocean",
    });
    const plan = createRealmPlaythroughPlan(realm);
    const broken = {
      ...plan,
      checkpoints: plan.checkpoints.map((checkpoint) => ({
        ...checkpoint,
        capture: undefined,
      })),
    };
    const framing = validateRealmFramingContract(realm, broken);

    expect(framing.valid).toBe(false);
    expect(framing.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "missing-start-capture",
        "missing-signal-capture",
        "missing-goal-capture",
      ])
    );
  });
});
