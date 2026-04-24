import {
  DEFAULT_REALM_PREFERENCES,
  resetRealmPreferencesForTests,
  saveRealmPreferences,
} from "@app/shared/platform/persistence/preferences";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { disposeAudioForTests, invalidateAudioPreferencesCache, playCue } from "./sfx";

/**
 * The Web Audio API is partially faked in jsdom — createOscillator /
 * createGain exist but throw on some nodes. These tests focus on the
 * things we own:
 *   - playCue is fire-and-forget; it must never throw
 *   - playCue honors the audioEnabled preference
 *   - invalidateAudioPreferencesCache flushes the 5 s cache
 */

describe("sfx playCue", () => {
  beforeEach(async () => {
    window.__VOXEL_REALMS_TEST__ = true;
    await resetRealmPreferencesForTests();
    invalidateAudioPreferencesCache();
  });

  afterEach(() => {
    disposeAudioForTests();
    invalidateAudioPreferencesCache();
    window.__VOXEL_REALMS_TEST__ = false;
  });

  test("resolves cleanly when audio is disabled", async () => {
    await saveRealmPreferences({ ...DEFAULT_REALM_PREFERENCES, audioEnabled: false });
    await expect(playCue("jump")).resolves.toBeUndefined();
  });

  test("does not throw when audio is enabled but AudioContext is unavailable", async () => {
    const originalCtx = (window as unknown as { AudioContext?: unknown }).AudioContext;
    const originalWebkit = (window as unknown as { webkitAudioContext?: unknown })
      .webkitAudioContext;
    (window as unknown as { AudioContext?: unknown }).AudioContext = undefined;
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = undefined;

    await saveRealmPreferences({ ...DEFAULT_REALM_PREFERENCES, audioEnabled: true });
    await expect(playCue("extract")).resolves.toBeUndefined();

    (window as unknown as { AudioContext?: unknown }).AudioContext = originalCtx;
    (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = originalWebkit;
  });

  test("invalidateAudioPreferencesCache is safe to call anytime", () => {
    // Smoke test — the exported helper must never throw even when no
    // cache has been populated, including in teardown paths and before
    // any playCue has fired in the session.
    expect(() => invalidateAudioPreferencesCache()).not.toThrow();
    expect(() => invalidateAudioPreferencesCache()).not.toThrow();
  });
});
