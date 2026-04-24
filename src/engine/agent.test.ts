import { describe, expect, test } from "vitest";
import { createRealmAgentWaypoints, runRealmAgent } from "@engine/agent";
import { generateRealmClimb, REALM_ARCHETYPE_IDS } from "@world/climber";

describe("realm golden-path agent", () => {
  test("runs deterministically over a seeded golden path", () => {
    const realm = generateRealmClimb({
      seed: "agent-determinism",
      archetype: "steampunk",
    });
    const run = runRealmAgent(realm);
    const again = runRealmAgent(realm);

    expect(run).toEqual(again);
    expect(run.valid).toBe(true);
    expect(run.finalPlatformId).toBe(realm.exitPlatformId);
    expect(run.extractionReady).toBe(true);
    expect(run.scannedAnomalyIds.length).toBeGreaterThan(0);
    expect(run.samples.at(-1)?.state).toBe("extracted");
  });

  test("validates executable agent runs across archetypes and seeds", () => {
    const seeds = Array.from({ length: 10 }, (_, index) => `agent-seed-${index + 1}`);

    for (const archetype of REALM_ARCHETYPE_IDS) {
      for (const seed of seeds) {
        const realm = generateRealmClimb({ seed, archetype });
        const run = runRealmAgent(realm);

        expect(run.issues, `${archetype}:${seed}`).toEqual([]);
        expect(run.valid).toBe(true);
        expect(run.waypoints).toHaveLength(realm.goldenPath.length);
        expect(run.segments).toHaveLength(realm.goldenPath.length - 1);
        expect(run.totalDurationMs).toBeGreaterThan(0);
        expect(run.scannedAnomalyIds.length).toBeGreaterThan(0);
      }
    }
  });

  test("creates platform-top waypoints for rendering and future Yuka handoff", () => {
    const realm = generateRealmClimb({
      seed: "agent-waypoints",
      archetype: "jungle",
    });
    const waypoints = createRealmAgentWaypoints(realm);
    const startPlatform = realm.platforms.find((platform) => platform.id === realm.startPlatformId);

    expect(waypoints[0].platformId).toBe(realm.startPlatformId);
    expect(waypoints.at(-1)?.platformId).toBe(realm.exitPlatformId);
    expect(waypoints[0].position.y).toBeGreaterThan(startPlatform?.position.y ?? 0);
  });

  test("fails structurally when a golden-path link is missing", () => {
    const realm = generateRealmClimb({
      seed: "agent-broken-link",
      archetype: "ocean",
    });
    const broken = {
      ...realm,
      links: realm.links.slice(1),
    };
    const run = runRealmAgent(broken);

    expect(run.valid).toBe(false);
    expect(run.issues.map((issue) => issue.code)).toContain("missing-link");
  });
});
