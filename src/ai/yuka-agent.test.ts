import { describe, expect, test } from "vitest";
import { createInitialRealmRuntime } from "@store/traits";
import { generateRealmClimb } from "@world/climber";
import { createRealmPlaythroughPlan } from "@world/playthrough-plan";
import { createRealmSequenceEntry } from "@world/sequence";
import { createYukaRealmPlaythroughRun } from "@ai/yuka-agent";

describe("createYukaRealmPlaythroughRun", () => {
  test("follows the default realm checkpoints with landed capture frames", () => {
    const plan = createRealmPlaythroughPlan(createInitialRealmRuntime().activeRealm);
    const run = createYukaRealmPlaythroughRun(plan);

    expect(run.valid).toBe(true);
    expect(run.issues).toEqual([]);
    expect(run.landedFrames).toHaveLength(plan.checkpointCount);
    expect(run.frames.length).toBeGreaterThan(plan.checkpointCount);
    expect(run.finalDistanceToGoal).toBe(0);
    expect(run.maximumLandingDistance).toBeLessThanOrEqual(0.32);
    expect(run.landedFrames.flatMap((frame) => frame.capture ?? [])).toEqual([
      "route-start",
      "signal",
      "goal",
    ]);
  });

  test("keeps a deterministic yuka route valid across the biome cycle", () => {
    for (let realmIndex = 0; realmIndex < 5; realmIndex++) {
      const entry = createRealmSequenceEntry("yuka-cycle", realmIndex);
      const realm = generateRealmClimb({ archetype: entry.archetype, seed: entry.seed });
      const plan = createRealmPlaythroughPlan(realm);
      const run = createYukaRealmPlaythroughRun(plan);

      expect(run.valid, `${entry.archetype} ${entry.seed}: ${formatIssues(run.issues)}`).toBe(true);
      expect(run.landedFrames).toHaveLength(plan.checkpointCount);
      expect(run.totalDurationMs).toBeGreaterThan(0);
      expect(run.finalDistanceToGoal).toBe(0);
    }
  });
});

function formatIssues(issues: Array<{ code: string; message: string }>) {
  return issues.map((issue) => `${issue.code}: ${issue.message}`).join(", ");
}
