import {
  describeRealmHazard,
  REALM_HAZARD_KINDS,
  realmHazardAdvice,
  realmHazardLabel,
} from "@world/hazard-vocabulary";
import { describe, expect, test } from "vitest";

describe("realm hazard vocabulary", () => {
  test("covers every hazard kind with non-trivial copy", () => {
    for (const kind of REALM_HAZARD_KINDS) {
      const descriptor = describeRealmHazard(kind);
      expect(descriptor.label.length, `${kind} label`).toBeGreaterThan(2);
      expect(descriptor.shortLabel.length, `${kind} shortLabel`).toBeGreaterThan(2);
      expect(descriptor.advice.length, `${kind} advice`).toBeGreaterThan(20);
      expect(descriptor.advice).toContain(descriptor.shortLabel);
    }
  });

  test("labels, shortLabels, and advice lines are distinct per kind", () => {
    const labels = REALM_HAZARD_KINDS.map(realmHazardLabel);
    const shorts = REALM_HAZARD_KINDS.map((kind) => describeRealmHazard(kind).shortLabel);
    const advice = REALM_HAZARD_KINDS.map(realmHazardAdvice);
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(shorts).size).toBe(shorts.length);
    expect(new Set(advice).size).toBe(advice.length);
  });

  test("never leaks the raw internal kind token into player-facing label", () => {
    for (const kind of REALM_HAZARD_KINDS) {
      const descriptor = describeRealmHazard(kind);
      // The internal kind is a machine identifier. The surfaced label
      // may reuse the word in some cases (e.g. "thorns" reads fine),
      // but the label must never be EXACTLY the kind token — it should
      // always be a composed noun phrase.
      expect(descriptor.label).not.toBe(kind);
    }
  });
});
