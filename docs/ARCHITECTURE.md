---
title: Architecture
updated: 2026-04-23
status: current
domain: technical
---

# Architecture

This document owns the stack, runtime boundaries, directory layout, and system
contracts. Gameplay rules live in [DESIGN.md](./DESIGN.md). Validation and test
strategy live in [TESTING.md](./TESTING.md).

## System Overview

```text
React UI / App Shell
  -> menu, HUD, landing, overlays
R3F Scene Layer
  -> World, Player, SpawnCamp, TerrainManager, RealmClimbRoute
Koota State
  -> VoxelTrait and RealmTrait runtime state
Deterministic Engine
  -> voxelSimulation, realmClimber, validation, telemetry, Yuka plan
Platform Layer
  -> Capacitor shell config, Preferences, SQLite, web jeep-sqlite bridge
Static Asset Layer
  -> curated models, static variants, fonts, sql-wasm
Automation Layer
  -> Vitest Browser, golden-path captures, CI/CD, release workflow
```

## Directory Ownership

```text
app/
  games/voxel-realms/
    Game.tsx                    # world mount, phase switching, landing
    r3f/                        # Player, World, SpawnCamp, TerrainManager,
                                # RealmClimbRoute
    ui/                         # HUD, RealmLanding
  shared/platform/
    bootstrap.ts                # native shell + persistence init
    nativeShell.ts              # status bar, splash behavior
    persistence/                # SQLite and Preferences wrappers

src/games/voxel-realms/
  engine/
    voxelSimulation.ts          # deterministic terrain and camp contract
    realmClimber.ts             # realm generation and golden-path validation
    realmValidation.ts          # batch validation entrypoint
    realmSpatialValidation.ts   # route-space structural checks
    realmFramingValidation.ts   # camera/readability checks
    realmRuntimeTelemetry.ts    # runtime-frame telemetry checks
    realmYukaPlaythroughAgent.ts# pure-engine Yuka route run
    realmAssetBudget.ts         # runtime model policy and render budgets
  store/
    traits.ts                   # VoxelTrait and RealmTrait lifecycle
    world.ts                    # shared Koota world and entity

public/
  assets/models/                # tracked runtime asset catalog
  assets/fonts/brand/           # tracked brand fonts
  assets/sql-wasm.wasm          # web SQLite wasm

android/ and ios/
  first-class Capacitor shells that must remain buildable

scripts/
  asset, budget, validation, and manifest tooling
```

## Runtime Flow

1. `app/main.tsx` mounts the app and asynchronously bootstraps the platform
   layer.
2. `bootstrapPlatform()` initializes persistence and native shell decoration.
3. `Game.tsx` owns phase changes between landing, playing, and game over.
4. `VoxelTrait` stores player/terrain state. `RealmTrait` stores the active
   deterministic realm contract and expedition state.
5. `World.tsx` composes the scene from terrain, camp, player, and realm-route
   layers.
6. `HUD.tsx` reads both traits to render route guidance, gate state, anomaly
   progress, stability, and render-budget signals.

## Deterministic Validation Stack

The core product contract is not "render something that looks climbable." It
is "generate something the engine can prove is climbable."

Validation layers:

- `realmClimber.ts`: build the realm and validate the golden path.
- `realmPathfinding.ts`: independently verify traversability.
- `realmSpatialValidation.ts`: verify adjacency, landing support, hazard lanes,
  and clean start/goal placement.
- `realmFramingValidation.ts`: verify start, signal, and goal framing.
- `realmRuntimeTelemetry.ts`: verify runtime progress does not regress.
- `realmYukaPlaythroughAgent.ts`: drive the playthrough plan through Yuka in
  pure engine code.
- `realmVisualManifest.ts`: bind browser captures to a checked manifest.

## Mobile Platform Contract

Capacitor is first-class, not an afterthought.

- `capacitor.config.ts` owns app id, shell defaults, and plugin config.
- `@capacitor/preferences` stores player preferences.
- `@capacitor-community/sqlite` stores current-run and settings state.
- Web uses `jeep-sqlite` plus `sql-wasm.wasm` so persistence behavior is shared
  across browser and native shells.
- Native shell setup currently owns splash hide and status-bar color/style.

## Asset Runtime Contract

- Source assets are cataloged in `public/assets/models/manifest.json`.
- Deferred heavy assets are replaced by generated static variants when possible.
- Runtime rendering is gated by count and byte budgets, not by raw pack size.
- Production builds filter and prune the asset copy step before deployment.

## Remaining Work In This Domain

- Wire active-run persistence into actual resume/load UX rather than only the
  storage wrapper layer.
- Add explicit settings surfaces for audio, motion, haptics, and onboarding
  state.
- Decide whether the live player should remain bespoke first-person control or
  move to a runtime agent/controller hybrid for deterministic replays.
- Improve scene streaming and asset preloading policy once more real models
  replace markers.
- Add crash/telemetry infrastructure before broader mobile testing.
