---
title: Jolly Pixel Engine Coverage Gap Analysis
updated: 2026-04-24
status: current
domain: technical
---

# Jolly Pixel Engine Coverage Gap Analysis

The current `feat/restructure-and-jp-port` branch ports rendering to JP
but treats JP as if it were just a voxel renderer behind a thin actor.
JP is a full game engine with Input, Audio, AssetManager, Behaviors with
property decorators, SignalEvents, ECS lifecycle, and a built-in
loading screen / GPU detection that we currently route around with our
own React layers.

This file tracks where we are duplicating engine work in app/React and
what the post-port shape should be.

## What we currently import from JP

Verified via `grep -rh 'from "@jolly-pixel'`:

- `@jolly-pixel/engine`: `Actor` (type), `ActorComponent`, `Camera3DControls`
- `@jolly-pixel/runtime`: `Runtime`, `loadRuntime`
- `@jolly-pixel/voxel.renderer`: `VoxelRenderer`, plus voxel JSON types

That is it. ~5% of the engine surface.

## What JP exports that we should be using

### Subsystems we are reinventing in React/DOM today

| JP subsystem | Currently in our repo | Where it should live |
|---|---|---|
| `Input` (mouse, keyboard, touchpad, gamepad, screen) — `world.input.isKeyDown(...)`, `isTouchDown("primary")`, gamepad axes/buttons | `app/atoms/floating-joystick.tsx`, ad-hoc DOM keyboard listeners | `src/scene/player-behavior.ts` reads `this.actor.world.input` |
| `AudioBackground` + `AudioLibrary` + `GlobalAudio` (engine-managed playlist + one-shot library, with a single audio context) | `app/components/audio-bindings.tsx` + `src/audio/ambient-music.*` (custom `<audio>` element re-entrancy fix) | `src/audio/` thin wrappers around JP audio, subscribed via Koota traits |
| `AssetManager` (lazy-loading queue + cache + GLTF loader, hooks into `loadRuntime` progress UI) | `src/world/realmAssetCatalog.ts`, hand-rolled fetch + `BASE_URL` plumbing, manual preload heuristics | `src/scene/route-actor.ts` registers anomaly GLTFs with `world.assetManager`; `loadRuntime` shows progress |
| `loadRuntime` built-in loading screen + GPU detection | Custom `<jolly-loading>`-shaped boot splash in `index.html` + `app/main.tsx` `dismissBootSplash` | Use `loadRuntime`'s built-in screen, style via the `jolly-loading` Web Component contract; delete our HTML splash |
| `Behavior<P>` with `@SceneProperty` + `@SceneActorComponent` + `@Input.listen("gamepad.connect")` decorators | `ActorComponent` subclasses without behavior properties; React state for input device preference | `src/scene/player-behavior.ts extends Behavior` with decorators for properties |
| `SignalEvent` (Godot-style pub/sub) | `mitt` event bus (`src/shared/event-bus.ts`) | Per-actor `SignalEvent`s on `PlayerBehavior`, `RouteBehavior`, etc. App listens via Koota traits or via a thin `signal → trait` bridge in `src/store` |
| `world.sceneManager` lifecycle (`awake → start → update → destroy`) | Custom React useEffect race protection | Implicit — every Actor goes through it |
| `World.input.devicePreferenceChange` event (mouse vs gamepad vs touch detection) | Custom `useDevice` hook | Listen on the JP signal; reflect into a Koota trait for the HUD |

### What `runtime.world` actually owns

From `JP runtime README`:

> The world gives you access to the engine systems
> (scene, renderer, input, etc.)

`runtime.world` exposes: `sceneManager`, `renderer`, `input`,
`assetManager`, `setFps`, plus all actor/component plumbing. We currently
only reach into `sceneManager.getSource()` for scene background +
lights.

### What `loadRuntime` does that we are duplicating

- GPU tier detection (`detect-gpu`) — refuses to start on GPUs below
  tier 1. We currently boot regardless.
- Device pixel ratio adjustment per mobile/desktop. We override
  manually elsewhere.
- A custom-element loading screen (`<jolly-loading>`). We have our own
  HTML splash + React boot fade-in.
- Auto-runs `assetManager.loadAssets` for everything registered before
  start. We instead lazy-fetch in React effects.
- Calls `runtime.start()` once everything is ready. We do this manually.

## What needs to change for a real JP-shaped game

### Immediate (this PR)

- [ ] Add `mergeLayers: true` to `vr.load()` in `TerrainBehavior.setRealm`
  — matches reference and avoids per-layer-mesh fragmentation.
- [ ] Confirm runtime is wired so React HUD reads scene state via
  Koota traits and not via direct JP imports — `app/` must not import
  `@jolly-pixel/*` (already enforced by ARCH rules).

### Pillar A — Player + Camera + Input (next PR after #83 merges)

- [ ] `src/scene/player-actor.ts` — actor named `player`, owns
  `ModelRenderer` (GLB rig) + `PlayerBehavior`.
- [ ] `src/scene/player-behavior.ts extends Behavior<PlayerProperties>`
  — kinematic movement reading `world.input.isKeyDown`,
  `world.input.isTouchDown("primary")`, `world.input.wasGamepadAxisJustPressed`.
- [ ] `src/scene/camera-behavior.ts` — drives `Camera3DControls` based
  on player position + framing rules from `src/engine/framing-validation.ts`.
- [ ] Replace `app/atoms/floating-joystick.tsx` with the engine's touch
  input (`Touchpad`). Keep a thin DOM hint overlay only for tutorial.
- [ ] Player position writes to `RealmTrait.playerPosition` in Koota so
  HUD can render distance/objective text.

### Pillar B — Asset pipeline through `world.assetManager`

- [ ] `src/scene/route-actor.ts` — loads anomaly GLTFs via
  `world.assetManager.register(...)` so they're picked up by
  `loadRuntime`'s loading screen instead of fetched in React.
- [ ] Delete `src/world/realmAssetPreloader` style code that dupes the
  asset queue.
- [ ] `world.assetManager.context.manager` can be passed to
  `TilesetLoader` (matches reference `VoxelBehavior.initialize`).

### Pillar C — Audio via `AudioBackground` + `AudioLibrary`

- [ ] Replace `src/audio/ambient-music.ts` with `AudioBackground` (JP
  has built-in playlist + crossfade + onended handling).
- [ ] One-shot SFX (signal scan, gate arm, extraction beat, collapse)
  via `AudioLibrary`.
- [ ] `app/components/audio-bindings.tsx` becomes a Koota subscriber
  that calls `AudioBackground.play("realm-archetype-X")` on phase
  changes — no `<audio>` elements in React.

### Pillar D — Loading screen via `loadRuntime`

- [ ] Style the `<jolly-loading>` Web Component to match brand.
- [ ] Delete the bespoke HTML splash + `dismissBootSplash` in
  `app/main.tsx`.
- [ ] Move `bootstrapPlatform` so it runs *during*
  `assetManager.loadAssets` (Capacitor + Preferences are async; let JP
  drive the progress bar).

### Pillar E — Replace `mitt` with `SignalEvent`

- [ ] Per-actor signals (`PlayerBehavior.onCollapse`,
  `RouteBehavior.onAnomalyDiscovered`,
  `TerrainBehavior.onRealmReady`).
- [ ] A single bridge in `src/store/signal-bridge.ts` listens to the
  signals and writes Koota traits.
- [ ] Remove `src/shared/event-bus.ts` once nothing imports it.

### Pillar F — `Behavior` + decorators for tunable values

- [ ] Use `@SceneProperty({ type: "number" })` for every gameplay
  number that designers tune (player speed, climb rate, instability
  drain, hazard radii).
- [ ] Wire `@SceneActorComponent(VoxelRenderer)` so behaviors that
  need terrain receive a typed handle automatically.

## Out of scope for this PR (#83)

This PR fixes the build and lands the restructure + minimum-viable JP
voxel scene. The engine-coverage uplift is a separate batch tracked
here — six pillars (A–F) above. Sequence them after #83 lands and
release-please cuts a prerelease.

## References

- `~/src/reference-codebases/editor/packages/engine/README.md`
- `~/src/reference-codebases/editor/packages/runtime/README.md`
- `~/src/reference-codebases/editor/packages/voxel-renderer/examples/scripts/demo-tiled.ts`
- `~/src/reference-codebases/editor/packages/voxel-renderer/examples/scripts/components/VoxelMap.ts`
- `~/src/reference-codebases/editor/packages/runtime/examples/src/components/PlayerBehavior.ts`
