import { describe, expect, test } from "vitest";
import { runRealmAgent } from "./realmAgent";
import { generateRealmClimb, REALM_ARCHETYPE_IDS } from "./realmClimber";
import { validateRealmSpatialContract } from "./realmSpatialValidation";

describe("realm spatial validation", () => {
  test("validates clean goal posts, route links, hazard lanes, and agent samples", () => {
    const seeds = Array.from({ length: 8 }, (_, index) => `spatial-contract-${index + 1}`);

    for (const archetype of REALM_ARCHETYPE_IDS) {
      for (const seed of seeds) {
        const realm = generateRealmClimb({ seed, archetype });
        const spatial = validateRealmSpatialContract(realm);

        expect(spatial.issues, `${archetype}:${seed}`).toEqual([]);
        expect(spatial.valid).toBe(true);
        expect(spatial.start.clean).toBe(true);
        expect(spatial.exit.clean).toBe(true);
        expect(spatial.metrics.routeLinkCount).toBe(realm.goldenPath.length - 1);
        expect(spatial.metrics.agentSampleCount).toBeGreaterThan(realm.goldenPath.length);
        expect(spatial.metrics.unsupportedLandingSampleCount).toBe(0);
        expect(spatial.metrics.maximumWalkGap).toBeLessThanOrEqual(
          Math.max(0.18, realm.movement.playerRadius * 0.65)
        );
        expect(spatial.metrics.minimumLandingClearance).toBeGreaterThanOrEqual(
          realm.movement.minLandingSize
        );
      }
    }
  });

  test("reports broken start and exit goal posts", () => {
    const realm = generateRealmClimb({
      seed: "broken-goal-posts",
      archetype: "jungle",
    });
    const broken = {
      ...realm,
      exitPlatformId: realm.goldenPath[2],
      platforms: realm.platforms.map((platform) =>
        platform.id === realm.startPlatformId
          ? {
              ...platform,
              kind: "route" as const,
              size: { ...platform.size, x: 1.2, z: 1.2 },
            }
          : platform
      ),
    };
    const spatial = validateRealmSpatialContract(broken);

    expect(spatial.valid).toBe(false);
    expect(spatial.start.clean).toBe(false);
    expect(spatial.exit.clean).toBe(false);
    expect(spatial.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "exit-not-last",
        "exit-kind-mismatch",
        "start-kind-mismatch",
        "start-landing-too-small",
      ])
    );
  });

  test("reports route and agent regressions when a link disappears", () => {
    const realm = generateRealmClimb({
      seed: "broken-spatial-link",
      archetype: "ocean",
    });
    const broken = {
      ...realm,
      links: realm.links.slice(1),
    };
    const agentRun = runRealmAgent(broken);
    const spatial = validateRealmSpatialContract(broken, agentRun);

    expect(spatial.valid).toBe(false);
    expect(spatial.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["missing-route-link"])
    );
    expect(agentRun.valid).toBe(false);
    expect(agentRun.issues.map((issue) => issue.code)).toContain("missing-link");
  });

  test("reports stale route metadata after platform geometry changes", () => {
    const realm = generateRealmClimb({
      seed: "broken-spatial-metadata",
      archetype: "steampunk",
    });
    const movedPlatformId = realm.goldenPath[3];
    const broken = {
      ...realm,
      platforms: realm.platforms.map((platform) =>
        platform.id === movedPlatformId
          ? {
              ...platform,
              position: {
                ...platform.position,
                x: platform.position.x + 1.5,
              },
            }
          : platform
      ),
    };
    const spatial = validateRealmSpatialContract(broken);

    expect(spatial.valid).toBe(false);
    expect(spatial.issues.map((issue) => issue.code)).toContain("route-link-metadata-mismatch");
  });
});
