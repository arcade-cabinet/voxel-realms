import { afterEach, expect, test } from "vitest";
import {
  DEFAULT_REALM_PREFERENCES,
  loadRealmPreferences,
  resetRealmPreferencesForTests,
  updateRealmPreferences,
} from "./preferences";
import {
  loadCurrentRealmRun,
  loadPersistedSetting,
  resetPersistenceForTests,
  saveCurrentRealmRun,
  savePersistedSetting,
} from "./storage";

afterEach(async () => {
  await resetPersistenceForTests();
  await resetRealmPreferencesForTests();
});

test("Capacitor Preferences wrapper returns normalized player defaults", async () => {
  await expect(loadRealmPreferences()).resolves.toEqual(DEFAULT_REALM_PREFERENCES);

  await updateRealmPreferences({ motionReduced: true, onboardingSeen: true });

  await expect(loadRealmPreferences()).resolves.toEqual({
    ...DEFAULT_REALM_PREFERENCES,
    motionReduced: true,
    onboardingSeen: true,
  });
});

test("SQLite persistence wrapper stores current realm run and settings in test mode", async () => {
  const run = {
    id: "run-1",
    seed: 4242,
    realmIndex: 2,
    archetypeId: "steampunk",
    extractionState: "ascending" as const,
    scannedAnomalyIds: ["signal-a"],
    updatedAt: "2026-04-22T00:00:00.000Z",
  };

  await saveCurrentRealmRun(run);
  await savePersistedSetting("last-control-scheme", "touch");

  await expect(loadCurrentRealmRun()).resolves.toEqual(run);
  await expect(loadPersistedSetting<string>("last-control-scheme")).resolves.toBe("touch");

  await saveCurrentRealmRun(null);

  await expect(loadCurrentRealmRun()).resolves.toBeNull();
});
