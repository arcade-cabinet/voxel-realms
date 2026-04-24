import { describe, expect, test } from "vitest";
import { REALM_ARCHETYPE_IDS } from "@world/climber";
import { createRealmSequence, createRealmSequenceEntry } from "@world/sequence";

describe("realm sequence", () => {
  test("creates deterministic sequence entries with stable seeds", () => {
    const entry = createRealmSequenceEntry("sequence-seed", 3);
    const again = createRealmSequenceEntry("sequence-seed", 3);

    expect(entry).toEqual(again);
    expect(entry.seed).toBe("sequence-seed-realm-4");
    expect(entry.realmIndex).toBe(3);
    expect(entry.cycle).toBe(0);
    expect(entry.slot).toBe(3);
    expect(REALM_ARCHETYPE_IDS).toContain(entry.archetype);
  });

  test("covers every archetype once per cycle before repeating", () => {
    const sequence = createRealmSequence("coverage-seed", REALM_ARCHETYPE_IDS.length * 3);

    for (let cycle = 0; cycle < 3; cycle++) {
      const archetypes = sequence
        .slice(cycle * REALM_ARCHETYPE_IDS.length, (cycle + 1) * REALM_ARCHETYPE_IDS.length)
        .map((entry) => entry.archetype)
        .sort();

      expect(archetypes).toEqual([...REALM_ARCHETYPE_IDS].sort());
    }
  });
});
