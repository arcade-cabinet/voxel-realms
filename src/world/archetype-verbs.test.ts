import { describe, expect, test } from "vitest";
import { REALM_ARCHETYPE_IDS, REALM_ARCHETYPES } from "@world/climber";

describe("realm archetype verbs", () => {
  test("every archetype exposes a non-empty verb and verbDetail", () => {
    for (const id of REALM_ARCHETYPE_IDS) {
      const archetype = REALM_ARCHETYPES[id];
      expect(archetype.verb.trim().length, `${id} verb`).toBeGreaterThan(0);
      expect(archetype.verbDetail.trim().length, `${id} verbDetail`).toBeGreaterThan(8);
    }
  });

  test("verbs are distinct per archetype", () => {
    const verbs = REALM_ARCHETYPE_IDS.map((id) => REALM_ARCHETYPES[id].verb.toLowerCase());
    expect(new Set(verbs).size).toBe(verbs.length);
  });

  test("verbDetails are distinct per archetype", () => {
    const details = REALM_ARCHETYPE_IDS.map((id) => REALM_ARCHETYPES[id].verbDetail);
    expect(new Set(details).size).toBe(details.length);
  });
});
