import {
  DEFAULT_REALM_PREFERENCES,
  resetRealmPreferencesForTests,
  saveRealmPreferences,
} from "@platform";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { fireHaptic, invalidateHapticsPreferencesCache } from "./haptics";

describe("haptics", () => {
  beforeEach(async () => {
    window.__VOXEL_REALMS_TEST__ = true;
    await resetRealmPreferencesForTests();
    invalidateHapticsPreferencesCache();
  });

  afterEach(() => {
    invalidateHapticsPreferencesCache();
    window.__VOXEL_REALMS_TEST__ = false;
  });

  test("fireHaptic resolves when haptics are disabled", async () => {
    await saveRealmPreferences({ ...DEFAULT_REALM_PREFERENCES, hapticsEnabled: false });
    await expect(fireHaptic("extract")).resolves.toBeUndefined();
  });

  test("fireHaptic resolves when the Capacitor plugin throws (web)", async () => {
    await saveRealmPreferences({ ...DEFAULT_REALM_PREFERENCES, hapticsEnabled: true });
    // In browser tests @capacitor/haptics throws because no native bridge.
    // The wrapper must swallow the error and resolve cleanly.
    await expect(fireHaptic("collapse")).resolves.toBeUndefined();
  });

  test("invalidateHapticsPreferencesCache is safe to call anytime", () => {
    expect(() => invalidateHapticsPreferencesCache()).not.toThrow();
    expect(() => invalidateHapticsPreferencesCache()).not.toThrow();
  });
});
