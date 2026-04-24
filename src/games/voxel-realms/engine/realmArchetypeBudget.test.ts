import { describe, expect, test } from "vitest";
import { generateRealmClimb, REALM_ARCHETYPE_IDS } from "./realmClimber";
import { createRealmSequenceEntry } from "./realmSequence";

/**
 * P4.6 — archetype-level budgets. Lock-in thresholds so future
 * generator tuning or asset pushes can't silently inflate the scene
 * past its playable envelope. Tight enough to catch regressions,
 * loose enough to accommodate the current deterministic generator.
 *
 * Bounds were captured against the live generator on main (2026-04-24)
 * and padded by ~10%. Breaking one of these asserts means either:
 *   - the change is an intended new budget — update the threshold
 *     here with a one-line comment explaining why, OR
 *   - the change leaked budget that shouldn't have — fix the code.
 */

const BOUNDS = {
  minPlatforms: 8,
  maxPlatforms: 28,
  minGoldenPath: 8,
  maxGoldenPath: 28,
  minAnomalies: 2,
  maxAnomalies: 8,
  maxHazards: 10,
  maxRouteLinks: 64,
} as const;

describe("archetype budgets", () => {
  for (const archetype of REALM_ARCHETYPE_IDS) {
    describe(archetype, () => {
      // Sample three deterministic realms per archetype so we catch
      // per-seed drift without pretending to cover every possible seed.
      for (const sampleIndex of [0, 7, 19]) {
        test(`sample ${sampleIndex} stays within bounds`, () => {
          const entry = createRealmSequenceEntry(`budget-${archetype}-${sampleIndex}`, 0);
          // Force the seed-derived archetype if the deck cycle didn't
          // pick it; we want to test THIS archetype specifically.
          const realm = generateRealmClimb({ seed: entry.seed, archetype });

          expect(
            realm.platforms.length,
            `${archetype}#${sampleIndex} platform count`
          ).toBeGreaterThanOrEqual(BOUNDS.minPlatforms);
          expect(
            realm.platforms.length,
            `${archetype}#${sampleIndex} platform count`
          ).toBeLessThanOrEqual(BOUNDS.maxPlatforms);

          expect(
            realm.goldenPath.length,
            `${archetype}#${sampleIndex} goldenPath length`
          ).toBeGreaterThanOrEqual(BOUNDS.minGoldenPath);
          expect(
            realm.goldenPath.length,
            `${archetype}#${sampleIndex} goldenPath length`
          ).toBeLessThanOrEqual(BOUNDS.maxGoldenPath);

          expect(
            realm.anomalies.length,
            `${archetype}#${sampleIndex} anomaly count`
          ).toBeGreaterThanOrEqual(BOUNDS.minAnomalies);
          expect(
            realm.anomalies.length,
            `${archetype}#${sampleIndex} anomaly count`
          ).toBeLessThanOrEqual(BOUNDS.maxAnomalies);

          expect(
            realm.hazards.length,
            `${archetype}#${sampleIndex} hazard count`
          ).toBeLessThanOrEqual(BOUNDS.maxHazards);

          expect(realm.links.length, `${archetype}#${sampleIndex} link count`).toBeLessThanOrEqual(
            BOUNDS.maxRouteLinks
          );

          // Validation must remain true for every sampled realm.
          expect(
            realm.validation.valid,
            `${archetype}#${sampleIndex} validation issues: ${realm.validation.issues
              .map((i) => i.code)
              .join(", ")}`
          ).toBe(true);
        });
      }
    });
  }
});
