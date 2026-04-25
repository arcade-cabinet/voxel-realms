import { generateRealmClimb } from "@world/climber";
import { evaluateRealmHazardExposure, evaluateRealmInstability } from "@world/instability";
import { describe, expect, test } from "vitest";

describe("realm instability", () => {
  test("detects active hazard exposure by proximity", () => {
    const realm = createHazardRealm();
    const hazard = realm.hazards[0];
    const exposure = evaluateRealmHazardExposure(realm, hazard.position);

    expect(exposure.activeHazard?.id).toBe(hazard.id);
    expect(exposure.nearestHazardKind).toBe(hazard.kind);
    expect(exposure.pressurePerSecond).toBeGreaterThan(0);
  });

  test("converts time, hazard exposure, and signal scans into stability state", () => {
    const realm = createHazardRealm();
    const hazard = realm.hazards[0];
    const stable = evaluateRealmInstability({
      realm,
      position: realm.platforms[0].position,
      elapsedMs: 0,
      discoveredAnomalyCount: 0,
      hazardExposureMs: 0,
    });
    const critical = evaluateRealmInstability({
      realm,
      position: hazard.position,
      elapsedMs: 120_000,
      discoveredAnomalyCount: 0,
      hazardExposureMs: 10_000,
    });
    const relieved = evaluateRealmInstability({
      realm,
      position: hazard.position,
      elapsedMs: 120_000,
      discoveredAnomalyCount: realm.anomalies.length,
      hazardExposureMs: 10_000,
    });

    expect(stable.level).toBe("stable");
    expect(critical.remaining).toBeLessThan(stable.remaining);
    expect(["critical", "collapsed"]).toContain(critical.level);
    expect(relieved.remaining).toBeGreaterThan(critical.remaining);
  });
});

function createHazardRealm() {
  for (let index = 0; index < 20; index++) {
    const realm = generateRealmClimb({
      seed: `instability-hazard-${index}`,
      archetype: "steampunk",
    });

    if (realm.hazards.length > 0) {
      return realm;
    }
  }

  throw new Error("Expected at least one deterministic hazard realm.");
}
