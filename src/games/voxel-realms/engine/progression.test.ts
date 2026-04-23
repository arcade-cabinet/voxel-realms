import { describe, expect, test } from "vitest";
import {
  COLLAPSE_PENALTY,
  EXTRACTION_BONUS,
  rankForScore,
  SIGNAL_WEIGHT,
  scoreExpedition,
} from "./progression";

import type { RealmArchetypeId } from "./realmClimber";

type CompletedRealm = {
  seed: string;
  archetype: RealmArchetypeId;
  outcome: "extracted" | "collapsed";
  scannedAnomalies: number;
  stabilityRemaining: number;
};

function completedRealm(overrides: Partial<CompletedRealm> = {}): CompletedRealm {
  return {
    seed: "realm-seed",
    archetype: "jungle",
    outcome: "extracted",
    scannedAnomalies: 3,
    stabilityRemaining: 50,
    ...overrides,
  };
}

describe("scoreExpedition", () => {
  test("empty expedition is a candidate with score 0", () => {
    const result = scoreExpedition({ completedRealms: [], inFlightScannedAnomalies: 0 });
    expect(result.score).toBe(0);
    expect(result.rank).toBe("candidate");
    expect(result.totalSignals).toBe(0);
    expect(result.extractedCount).toBe(0);
    expect(result.collapsedCount).toBe(0);
  });

  test("single extracted realm with signals and stability scores correctly", () => {
    const result = scoreExpedition({
      completedRealms: [completedRealm({ scannedAnomalies: 3, stabilityRemaining: 60 })],
      inFlightScannedAnomalies: 0,
    });

    const expected =
      3 * SIGNAL_WEIGHT + // 150
      1 * EXTRACTION_BONUS + // 200
      0 * COLLAPSE_PENALTY + // 0
      Math.floor(60 / 2); // 30
    expect(result.score).toBe(expected);
    expect(result.extractedCount).toBe(1);
    expect(result.bestStabilityRemaining).toBe(60);
  });

  test("collapse penalizes score", () => {
    const extractedOnly = scoreExpedition({
      completedRealms: [completedRealm({ scannedAnomalies: 2, stabilityRemaining: 40 })],
      inFlightScannedAnomalies: 0,
    });
    const withCollapse = scoreExpedition({
      completedRealms: [
        completedRealm({ scannedAnomalies: 2, stabilityRemaining: 40 }),
        completedRealm({
          outcome: "collapsed",
          scannedAnomalies: 0,
          stabilityRemaining: 0,
        }),
      ],
      inFlightScannedAnomalies: 0,
    });

    expect(withCollapse.score).toBe(extractedOnly.score - COLLAPSE_PENALTY);
    expect(withCollapse.collapsedCount).toBe(1);
  });

  test("in-flight signals are counted toward total even before extraction", () => {
    const result = scoreExpedition({
      completedRealms: [],
      inFlightScannedAnomalies: 2,
    });
    expect(result.totalSignals).toBe(2);
    expect(result.score).toBe(2 * SIGNAL_WEIGHT);
  });

  test("rank climbs with score thresholds", () => {
    expect(rankForScore(0).rank).toBe("candidate");
    expect(rankForScore(299).rank).toBe("candidate");
    expect(rankForScore(300).rank).toBe("surveyor");
    expect(rankForScore(900).rank).toBe("senior-surveyor");
    expect(rankForScore(1_800).rank).toBe("chief-surveyor");
    expect(rankForScore(3_500).rank).toBe("legend");
    expect(rankForScore(10_000).rank).toBe("legend");
  });

  test("deterministic: same input produces same score", () => {
    const input = {
      completedRealms: [
        completedRealm({ scannedAnomalies: 4, stabilityRemaining: 72 }),
        completedRealm({
          archetype: "ocean",
          outcome: "collapsed",
          scannedAnomalies: 1,
          stabilityRemaining: 0,
        }),
        completedRealm({ archetype: "steampunk", scannedAnomalies: 2, stabilityRemaining: 41 }),
      ],
      inFlightScannedAnomalies: 1,
    };
    const first = scoreExpedition(input);
    const second = scoreExpedition(input);
    expect(first).toEqual(second);
  });
});
