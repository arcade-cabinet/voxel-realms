import { describe, expect, test } from "vitest";
import {
  describeRealmArchetypeLighting,
  REALM_LIGHTING_ARCHETYPES,
} from "./realmArchetypeLighting";

describe("realm archetype lighting", () => {
  test("every archetype exposes a non-empty lighting descriptor", () => {
    for (const id of REALM_LIGHTING_ARCHETYPES) {
      const light = describeRealmArchetypeLighting(id);
      expect(light.archetype, `${id} archetype`).toBe(id);
      expect(light.ambient.intensity, `${id} ambient`).toBeGreaterThan(0);
      expect(light.sun.intensity, `${id} sun`).toBeGreaterThan(0);
      expect(light.hemisphere.intensity, `${id} hemisphere`).toBeGreaterThan(0);
      expect(light.fog.near, `${id} fog near`).toBeGreaterThan(0);
      expect(light.fog.far, `${id} fog far`).toBeGreaterThan(light.fog.near);
    }
  });

  test("colors are well-formed hex codes", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    for (const id of REALM_LIGHTING_ARCHETYPES) {
      const light = describeRealmArchetypeLighting(id);
      expect(light.ambient.color).toMatch(hex);
      expect(light.sun.color).toMatch(hex);
      expect(light.hemisphere.sky).toMatch(hex);
      expect(light.hemisphere.ground).toMatch(hex);
      expect(light.fog.color).toMatch(hex);
      expect(light.backgroundColor).toMatch(hex);
    }
  });

  test("background colors are distinct per archetype", () => {
    const colors = REALM_LIGHTING_ARCHETYPES.map(
      (id) => describeRealmArchetypeLighting(id).backgroundColor
    );
    expect(new Set(colors).size).toBe(colors.length);
  });

  test("sun positions are behind-and-above vectors", () => {
    for (const id of REALM_LIGHTING_ARCHETYPES) {
      const [x, y, z] = describeRealmArchetypeLighting(id).sun.position;
      expect(x, `${id} sun x should be negative for stage-left rim light`).toBeLessThan(0);
      expect(y, `${id} sun y should be above the scene`).toBeGreaterThan(50);
      expect(z, `${id} sun z should be behind the scene`).toBeLessThan(0);
    }
  });
});
