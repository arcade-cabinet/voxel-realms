import { describe, expect, test } from "vitest";
import { generateRealmClimb } from "./realmClimber";
import { describeRealmHazard } from "./realmHazardVocabulary";
import { summarizeRealmRouteGuidance } from "./realmRouteGuidance";

describe("realm route guidance", () => {
  test("summarizes the active golden-path link", () => {
    const realm = generateRealmClimb({ seed: "route-guidance", archetype: "jungle" });
    const guidance = summarizeRealmRouteGuidance(realm, 0);

    expect(guidance.state).toBe("route");
    expect(guidance.currentPlatformId).toBe(realm.startPlatformId);
    expect(guidance.nextPlatformId).toBe(realm.goldenPath[1]);
    expect(guidance.nextPlatform?.id).toBe(realm.goldenPath[1]);
    expect(guidance.activeLink?.from).toBe(realm.goldenPath[0]);
    expect(guidance.activeLink?.to).toBe(realm.goldenPath[1]);
    expect(guidance.label).toMatch(/^Next /);
    expect(guidance.detail).toContain("gap");
    // Verb polish (P2.8): vertical deltas surface as "up"/"down", not raw sign.
    if (Math.abs(guidance.activeLink?.verticalDelta ?? 0) >= 0.1) {
      expect(guidance.detail).toMatch(/ (up|down)$|(up|down) ·/);
    }
  });

  test("clamps out-of-range path indexes to the exit state", () => {
    const realm = generateRealmClimb({ seed: "route-guidance-exit", archetype: "ocean" });
    const guidance = summarizeRealmRouteGuidance(realm, 999);

    expect(guidance.state).toBe("exit");
    expect(guidance.pathIndex).toBe(realm.goldenPath.length - 1);
    expect(guidance.currentPlatformId).toBe(realm.exitPlatformId);
    expect(guidance.activeLink).toBeNull();
    expect(guidance.move).toBe("exit");
  });

  test("identifies hazards attached to the active route link", () => {
    const { realm, pathIndex } = findRealmWithLinkedHazard();
    const guidance = summarizeRealmRouteGuidance(realm, pathIndex);

    const hazard = guidance.activeHazard;
    if (!hazard) throw new Error("expected hazard on linked route");
    const vocabulary = describeRealmHazard(hazard.kind);
    expect(guidance.hazardLabel).toBe(vocabulary.label);
    expect(guidance.detail).toContain(vocabulary.shortLabel);
    expect(guidance.activeHazard?.between).toEqual([
      guidance.activeLink?.from,
      guidance.activeLink?.to,
    ]);
  });
});

function findRealmWithLinkedHazard() {
  for (let index = 0; index < 60; index++) {
    const realm = generateRealmClimb({
      seed: `route-guidance-hazard-${index}`,
      archetype: "steampunk",
    });
    const pathIndex = realm.links.findIndex((link) =>
      realm.hazards.some(
        (hazard) => hazard.between[0] === link.from && hazard.between[1] === link.to
      )
    );

    if (pathIndex >= 0) {
      return { realm, pathIndex };
    }
  }

  throw new Error("Expected a seed with a linked hazard.");
}
