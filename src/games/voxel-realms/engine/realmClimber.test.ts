import { describe, expect, test } from "vitest";
import {
  canLoadRealmAssetAtRuntime,
  DEFAULT_MOVEMENT_ENVELOPE,
  evaluateRealmProgress,
  generateRealmClimb,
  REALM_ARCHETYPE_IDS,
  validateGoldenPath,
} from "./realmClimber";

describe("realm climber generator", () => {
  test("generates deterministic seeded climbs", () => {
    const realm = generateRealmClimb({
      seed: "first-chaos-slice",
      archetype: "jungle",
    });
    const again = generateRealmClimb({
      seed: "first-chaos-slice",
      archetype: "jungle",
    });
    const reroll = generateRealmClimb({
      seed: "second-chaos-slice",
      archetype: "jungle",
    });

    expect(realm).toEqual(again);
    expect(reroll.platforms.map((platform) => platform.position)).not.toEqual(
      realm.platforms.map((platform) => platform.position)
    );
    expect(realm.validation.valid).toBe(true);
    expect(realm.goldenPath[0]).toBe(realm.startPlatformId);
    expect(realm.goldenPath.at(-1)).toBe(realm.exitPlatformId);
  });

  test("keeps every archetype golden path inside the movement envelope across seeds", () => {
    const seeds = Array.from({ length: 16 }, (_, index) => `validation-seed-${index + 1}`);

    for (const archetype of REALM_ARCHETYPE_IDS) {
      for (const seed of seeds) {
        const realm = generateRealmClimb({ seed, archetype });

        expect(realm.validation.issues, `${archetype}:${seed}`).toEqual([]);
        expect(realm.validation.valid).toBe(true);
        expect(realm.validation.maximumHorizontalGap).toBeLessThanOrEqual(
          DEFAULT_MOVEMENT_ENVELOPE.maxJumpDistance
        );
        expect(realm.validation.maximumStepUp).toBeLessThanOrEqual(
          DEFAULT_MOVEMENT_ENVELOPE.maxStepUp
        );
        expect(realm.validation.stepsChecked).toBe(realm.goldenPath.length - 1);
      }
    }
  });

  test("binds chaos-slice assets to generated anomalies without requiring every model at runtime", () => {
    const realm = generateRealmClimb({
      seed: "asset-binding",
      archetype: "ocean",
    });

    expect(realm.anomalies.length).toBeGreaterThanOrEqual(3);
    expect(
      realm.anomalies.every((anomaly) => anomaly.asset.publicPath.startsWith("/assets/"))
    ).toBe(true);
    expect(realm.anomalies.some((anomaly) => canLoadRealmAssetAtRuntime(anomaly.asset))).toBe(true);
    expect(realm.anomalies.map((anomaly) => anomaly.platformId)).toContain(realm.exitPlatformId);
  });

  test("chooses unique role-aware anomaly assets with runtime primary and exit signals", () => {
    const seeds = Array.from({ length: 10 }, (_, index) => `asset-plan-${index + 1}`);

    for (const archetype of REALM_ARCHETYPE_IDS) {
      for (const seed of seeds) {
        const realm = generateRealmClimb({ seed, archetype });
        const assetIds = realm.anomalies.map((anomaly) => anomaly.asset.id);
        const exitAnomaly = realm.anomalies.find(
          (anomaly) => anomaly.platformId === realm.exitPlatformId
        );

        expect(new Set(assetIds).size, `${archetype}:${seed}`).toBe(assetIds.length);
        expect(canLoadRealmAssetAtRuntime(realm.anomalies[0].asset), `${archetype}:${seed}`).toBe(
          true
        );
        expect(exitAnomaly, `${archetype}:${seed}`).toBeTruthy();
        expect(canLoadRealmAssetAtRuntime(exitAnomaly?.asset ?? realm.anomalies[0].asset)).toBe(
          true
        );
      }
    }
  });

  test("reports structural failures when a seeded route is mutated out of reach", () => {
    const realm = generateRealmClimb({
      seed: "broken-route",
      archetype: "steampunk",
    });
    const broken = {
      ...realm,
      platforms: realm.platforms.map((platform, index) =>
        index === 4
          ? {
              ...platform,
              position: {
                ...platform.position,
                x: platform.position.x + 30,
                y: platform.position.y + 5,
              },
              size: {
                ...platform.size,
                x: 1.2,
                z: 1.2,
              },
            }
          : platform
      ),
    };
    const validation = validateGoldenPath(broken);

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["gap-too-wide", "step-too-high", "landing-too-small"])
    );
  });

  test("evaluates anomaly scan and extraction readiness from player position", () => {
    const realm = generateRealmClimb({
      seed: "scan-route",
      archetype: "dinosaur",
    });
    const anomaly = realm.anomalies[0];
    const atSignal = evaluateRealmProgress(realm, anomaly.position);

    expect(atSignal.scannedAnomaly?.id).toBe(anomaly.id);
    expect(atSignal.objective).toContain("scanned");
    expect(atSignal.scanProgress).toBeGreaterThan(0);

    const exitPlatform = realm.platforms.find((platform) => platform.id === realm.exitPlatformId);
    expect(exitPlatform).toBeTruthy();

    const atExit = evaluateRealmProgress(
      realm,
      {
        x: exitPlatform?.position.x ?? 0,
        y: (exitPlatform?.position.y ?? 0) + (exitPlatform?.size.y ?? 0) / 2,
        z: exitPlatform?.position.z ?? 0,
      },
      [anomaly.id]
    );

    expect(atExit.pathIndex).toBe(realm.goldenPath.length - 1);
    expect(atExit.reachedExit).toBe(true);
    expect(atExit.extractionReady).toBe(true);
    expect(atExit.objectiveProgress).toBe(100);
  });
});
