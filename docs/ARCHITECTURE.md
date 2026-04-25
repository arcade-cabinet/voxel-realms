---
title: Architecture
updated: 2026-04-24
status: current
domain: technical
---

# Architecture

Stack, runtime boundaries, module layout, and dependency rules. Gameplay
rules live in [RULES.md](./RULES.md). Test strategy lives in
[TESTING.md](./TESTING.md). The in-flight restructure + Jolly Pixel port
is described in
[plans/jolly-pixel-migration.prq.md](./plans/jolly-pixel-migration.prq.md)
— until that PR lands, `main` still runs the R3F scene. The layout below
is the target state.

## System Overview

```text
React DOM HUD overlay                       (flat DOM above the canvas — text, menus)
  └─ app/views, app/components, app/atoms   (landing, HUD, coach, pause, settings)

Jolly Pixel Scene Layer                     (owns the canvas + main loop)
  └─ src/scene                              (runtime, actors, behaviors, tilesets)
      ├─ terrain-actor  (VoxelRenderer)
      ├─ player-actor + player-behavior
      ├─ camera-behavior  (Camera3DControls)
      └─ route-actor    (beacons, hazards, GLTF anomalies via JP asset registry)

Koota Store (state bridge)                  (read by scene and HUD both)
  └─ src/store                              (world + traits: Realm, Voxel, Phase, ...)

Deterministic Engine                        (pure TS — no three, no react, no JP)
  ├─ src/world           (realm generation, voxel bake, sequence, signals)
  ├─ src/engine          (voxel simulation, validation, pathfinding, framing, telemetry)
  ├─ src/ai              (yuka playthrough agent, realm agent)
  └─ src/assets          (render budget, visual manifest)

Platform Layer                              (mobile shell + persistence)
  └─ src/platform                           (Capacitor bootstrap, native shell,
                                             SQLite, Preferences, storage wrappers)

Audio                                       (ambient music + SFX; subscribed via Koota)
  └─ src/audio
```

## Why the split

R3F is a UI framework pretending to be a game engine. It worked until
the shell hit a platform difference (Pages subpath, headless mobile
viewport, animated landing blocking Playwright), and each difference
became a bespoke patch (PRs #80 and #81). Jolly Pixel is an actual
game engine: it owns the main loop, the canvas, and asset resolution,
so those whole categories of bugs don't exist.

React stays for the DOM HUD overlay. Flat-DOM text and menu UI above a
fixed-size canvas was never the problem; the problem was asking R3F to
host the canvas inside React's layout system.

Three.js stays as the graphics backend on both sides of the port.

## Module Layout (target)

```text
src/
  world/                 realm generation, voxel bake, sequence
  engine/                deterministic simulation + validation
  ai/                    yuka playthrough agent
  assets/                render budget, visual manifest
  scene/                 JP scene layer (runtime, actors, behaviors, tilesets)
  audio/                 ambient music, SFX
  store/                 Koota world + traits (bridge)
  platform/              Capacitor + persistence
  shared/                event bus, cross-domain types

app/
  main.tsx               bootstrap: platform → JP runtime → React HUD overlay
  views/                 full-screen React views (landing, pause, game-over, realm-collapsed)
  components/            HUD + overlay widgets (hud, first-run coach, extraction beat, etc.)
  atoms/                 reusable primitives (buttons, cartridge, joystick)
  hooks/                 React hooks (device, responsive, auto-pause)
  styles/                globals.css
  test/                  vitest setup
```

Every domain exports through an `index.ts` barrel. Cross-domain imports
only touch barrels — no reaching into another domain's private files.

## Hard Dependency Rules

- `src/shared/` is a leaf — imports nothing from the repo.
- `src/store/` imports `src/shared/` only.
- `src/world/`, `src/engine/`, `src/ai/`, `src/assets/` import
  `src/shared/` plus each other's barrels. Never another domain's
  internal files.
- `src/scene/` imports `src/world`, `src/engine`, `src/assets`,
  `src/store`, `@jolly-pixel/*`, `three`. **Not React.**
- `src/audio/`, `src/platform/` import `src/shared/` only.
- `app/` imports from `src/*/index.ts` barrels. **Not three, not JP,
  not R3F.** React reads live scene state via Koota traits in
  `src/store`.
- `app/main.tsx` is the only module that wires scene + UI + platform.

## Runtime Flow

1. `app/main.tsx` runs platform bootstrap (`src/platform`).
2. It creates the Koota world (`src/store`) and sets an initial
   `PhaseTrait` of `landing`.
3. `src/scene/runtime.ts` constructs `new Runtime(canvas)`, creates
   terrain / player / route / camera actors, and calls
   `loadRuntime(runtime)`.
4. React mounts the HUD overlay from `app/views` + `app/components`
   above the canvas — a `position: fixed; inset: 0; pointer-events: none`
   root with children opting back in.
5. HUD subscribes to Koota traits; scene writes traits from behaviors;
   React reads the same traits and renders text/menus.

## Deterministic Validation Stack

The core contract is not "render something that looks climbable." It is
"generate something the engine can prove is climbable." Every validator
is pure TS with no scene dependency:

- `src/world/climber.ts` — build the realm and validate the golden path.
- `src/engine/pathfinding.ts` — independently verify traversability.
- `src/engine/spatial-validation.ts` — verify adjacency, landing
  support, hazard lanes, start/goal placement.
- `src/engine/framing-validation.ts` — verify start, signal, and goal
  framing readability.
- `src/engine/runtime-telemetry.ts` — verify runtime progress does not
  regress.
- `src/ai/yuka-agent.ts` — drive the playthrough plan through Yuka in
  pure engine code.
- `src/assets/visual-manifest.ts` — bind browser captures to a checked
  manifest.

## Mobile Platform Contract

Capacitor is first-class, not an afterthought.

- `capacitor.config.ts` owns app id, shell defaults, plugin config.
- `src/platform/preferences.ts` wraps `@capacitor/preferences`.
- `src/platform/sqlite.ts` wraps `@capacitor-community/sqlite`.
- Web uses `jeep-sqlite` + `sql-wasm.wasm` so persistence is shared
  across browser and native shells.
- `src/platform/native-shell.ts` owns splash hide and status-bar
  color/style.

## Asset Runtime Contract

- Source assets are cataloged in `public/assets/models/manifest.json`.
- Deferred heavy assets are replaced by generated static variants when
  possible.
- Runtime rendering is gated by count and byte budgets (`src/assets/budget.ts`),
  not by raw pack size.
- Production builds filter and prune the asset copy step before deploy.
- Anomaly GLTFs load through the JP `Runtime.assetManager`, so path
  resolution routes through Vite's `base` without hand-rolled helpers.

## Remaining Work

Tracked by domain in [plans/batch-tracker.md](./plans/batch-tracker.md).
The active lane is the restructure + JP port described in
[plans/jolly-pixel-migration.prq.md](./plans/jolly-pixel-migration.prq.md).
