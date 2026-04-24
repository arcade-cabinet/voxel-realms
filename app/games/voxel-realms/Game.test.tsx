import {
  DEFAULT_REALM_PREFERENCES,
  resetRealmPreferencesForTests,
  saveRealmPreferences,
} from "@app/shared/platform/persistence/preferences";
import { captureBrowserGameScreenshot, startBrowserGame } from "@app/test/browserGameHarness";
import { createInitialVoxelState } from "@logic/games/voxel-realms/engine/voxelSimulation";
import {
  createInitialRealmRuntime,
  RealmTrait,
  VoxelTrait,
} from "@logic/games/voxel-realms/store/traits";
import { voxelEntity } from "@logic/games/voxel-realms/store/world";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import Game from "./Game";

beforeEach(async () => {
  window.__VOXEL_REALMS_TEST__ = true;
  await resetRealmPreferencesForTests();
  await saveRealmPreferences({ ...DEFAULT_REALM_PREFERENCES, onboardingSeen: true });
  voxelEntity.set(RealmTrait, createInitialRealmRuntime());
  voxelEntity.set(VoxelTrait, createInitialVoxelState("menu"));
});

afterEach(() => {
  cleanup();
  window.__VOXEL_REALMS_TEST__ = false;
});

test("Voxel Realms reaches gameplay and captures a browser start screenshot", async () => {
  const viewport = {
    height: 720,
    name: "desktop",
    width: 1280,
  };

  const result = await startBrowserGame(
    {
      Component: Game,
      expectsCanvas: true,
      ready: "HP",
      startFlow: ["Enter Realm"],
      title: "Voxel Realms",
    },
    viewport
  );

  const startCapture = await captureBrowserGameScreenshot(
    result.host,
    result.rootElement,
    viewport,
    `test-screenshots/voxel-realms-${viewport.name}.png`
  );

  expect(startCapture.path).toContain(`voxel-realms-${viewport.name}.png`);
}, 120_000);
