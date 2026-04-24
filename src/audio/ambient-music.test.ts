import { afterEach, describe, expect, test } from "vitest";
import {
  AMBIENT_ARCHETYPE_IDS,
  disposeAmbientForTests,
  invalidateAmbientPreferencesCache,
  playAmbientForArchetype,
  stopAmbient,
} from "./ambient-music";

describe("ambientMusic", () => {
  afterEach(() => {
    disposeAmbientForTests();
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ = undefined;
  });

  test("is a no-op under the browser test harness flag", async () => {
    (window as unknown as { __VOXEL_REALMS_TEST__?: boolean }).__VOXEL_REALMS_TEST__ = true;
    await expect(playAmbientForArchetype("jungle")).resolves.toBeUndefined();
  });

  test("gracefully ignores unknown archetype ids", async () => {
    await expect(playAmbientForArchetype("unknown-archetype")).resolves.toBeUndefined();
  });

  test("exports the full archetype roster", () => {
    expect(AMBIENT_ARCHETYPE_IDS).toEqual(["jungle", "ocean", "steampunk", "dinosaur", "arctic"]);
  });

  test("stopAmbient and invalidateAmbientPreferencesCache are safe to call with no active voice", () => {
    expect(() => {
      stopAmbient();
      invalidateAmbientPreferencesCache();
    }).not.toThrow();
  });
});
