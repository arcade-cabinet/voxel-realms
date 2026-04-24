import { describe, expect, test } from "vitest";
import { generateRealmClimb, REALM_ARCHETYPE_IDS, type RealmClimb } from "@world/climber";
import { validateRealmPathfindingContract } from "@engine/pathfinding";
import { createRealmSequenceEntry } from "@world/sequence";

describe("validateRealmPathfindingContract", () => {
  test("derives a start-to-exit route from platform geometry across archetypes", () => {
    for (let index = 0; index < REALM_ARCHETYPE_IDS.length; index++) {
      const entry = createRealmSequenceEntry("pathfinding-contract", index);
      const realm = generateRealmClimb({ archetype: entry.archetype, seed: entry.seed });
      const pathfinding = validateRealmPathfindingContract(realm);

      expect(
        pathfinding.valid,
        `${entry.archetype} ${entry.seed}: ${pathfinding.issues.map((issue) => issue.code).join(", ")}`
      ).toBe(true);
      expect(pathfinding.discoveredPath[0]).toBe(realm.startPlatformId);
      expect(pathfinding.discoveredPath.at(-1)).toBe(realm.exitPlatformId);
      expect(pathfinding.discoveredPath).toEqual(realm.goldenPath);
      expect(pathfinding.discoveredPathMatchesGoldenPath).toBe(true);
      expect(pathfinding.discoveredPathDivergenceCount).toBe(0);
      expect(pathfinding.firstDivergentPathIndex).toBeNull();
      expect(pathfinding.nonGoldenDiscoveredStepCount).toBe(0);
      expect(pathfinding.reachablePlatformCount).toBeGreaterThanOrEqual(realm.goldenPath.length);
      expect(pathfinding.traversableGoldenStepCount).toBe(pathfinding.goldenStepCount);
      expect(pathfinding.routeLinkTraversableCount).toBe(realm.links.length);
      expect(pathfinding.maximumTraversableGap).toBeLessThanOrEqual(realm.movement.maxJumpDistance);
    }
  });

  test("reports when the independently discovered route diverges from the declared golden path", () => {
    const realm = generateRealmClimb({ archetype: "ocean", seed: "pathfinding-diverged-route" });
    const broken = {
      ...realm,
      goldenPath: [realm.goldenPath[0], ...realm.goldenPath.slice(2)],
    } satisfies RealmClimb;

    const pathfinding = validateRealmPathfindingContract(broken);

    expect(pathfinding.valid).toBe(false);
    expect(pathfinding.discoveredPathMatchesGoldenPath).toBe(false);
    expect(pathfinding.firstDivergentPathIndex).toBe(1);
    expect(pathfinding.discoveredPathDivergenceCount).toBeGreaterThan(0);
    expect(pathfinding.issues.map((issue) => issue.code)).toContain("golden-path-diverged");
  });

  test("reports unreachable golden steps independently of route link metadata", () => {
    const realm = generateRealmClimb({ archetype: "jungle", seed: "pathfinding-broken-step" });
    const broken = structuredClone(realm) as RealmClimb;
    broken.platforms[1] = {
      ...broken.platforms[1],
      position: {
        ...broken.platforms[1].position,
        x: broken.platforms[0].position.x + 100,
      },
    };

    const pathfinding = validateRealmPathfindingContract(broken);

    expect(pathfinding.valid).toBe(false);
    expect(pathfinding.issues.map((issue) => issue.code)).toContain("golden-step-unreachable");
    expect(pathfinding.issues.map((issue) => issue.code)).toContain("route-link-not-traversable");
    expect(pathfinding.traversableGoldenStepCount).toBeLessThan(pathfinding.goldenStepCount);
  });

  test("excludes branch platforms from the golden-path shortest-path comparison", () => {
    const realm = generateRealmClimb({
      archetype: "steampunk",
      seed: "realm-validation-steampunk-23",
    });
    const branchCount = realm.platforms.filter((platform) => platform.kind === "branch").length;

    expect(branchCount).toBeGreaterThan(0);

    const pathfinding = validateRealmPathfindingContract(realm);

    expect(pathfinding.valid).toBe(true);
    expect(pathfinding.discoveredPath).toEqual(realm.goldenPath);
    expect(pathfinding.discoveredPath.every((id) => !id.includes("-branch-"))).toBe(true);
  });

  test("reports a missing exit platform before trying to build a route", () => {
    const realm = generateRealmClimb({ archetype: "arctic", seed: "pathfinding-missing-exit" });
    const broken = {
      ...realm,
      platforms: realm.platforms.filter((platform) => platform.id !== realm.exitPlatformId),
    } satisfies RealmClimb;

    const pathfinding = validateRealmPathfindingContract(broken);

    expect(pathfinding.valid).toBe(false);
    expect(pathfinding.discoveredPath).toEqual([]);
    expect(pathfinding.issues.map((issue) => issue.code)).toContain("missing-exit-platform");
  });
});
