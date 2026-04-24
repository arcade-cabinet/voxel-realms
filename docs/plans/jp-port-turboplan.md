---
title: JP Port + Audit Fixes — Turboplan
updated: 2026-04-24
status: current
domain: plan
---

# JP Port + Audit Fixes — Turboplan (remote execution)

This is the remote-execution turboplan that picks up after the
restructure PR (`feat/restructure-and-jp-port`, commits
`2b66b58`→`a45ce10`→`936d2f1`) lands. That PR only flattens the
module layout; it does not port to Jolly Pixel and does not fix the
audit findings below.

Everything here runs remotely via CI. Local runtime is not used
(vitest, playwright, chrome, dev server, build — none of it). CI
uses xvfb-run for any browser-backed checks.

## Context you need to know

**Restructure already landed** (prior PR): flat domain folders under
`src/` (`world/`, `engine/`, `ai/`, `assets/`, `audio/`, `store/`,
`platform/`, `workers/`, `shared/`) and under `app/` (`views/`,
`components/`, `atoms/`, `hooks/`, `styles/`, `test/`). Every domain
is behind an `index.ts` barrel. Path aliases exist in `tsconfig.json`,
`vite.config.ts`, and `vitest.config.ts`: `@world`, `@engine`, `@ai`,
`@assets`, `@scene`, `@audio`, `@store`, `@platform`, `@workers`,
`@shared`, `@views`, `@components`, `@atoms`, `@hooks`.

**`src/scene/` does not exist yet.** Creating it is the JP port.

**R3F is still live** at `app/games/voxel-realms/r3f/` and
`app/games/voxel-realms/Game.tsx` + `AudioBindings.tsx`. The rest of
`app/` imports from these paths. Until the JP port lands, the R3F
mount is what ships.

**Fix list below** is from a security + performance audit dispatched
before this turboplan was written. Some items vanish when R3F is
deleted; those are marked "auto-resolved."

## Part 1 — Findings auto-resolved by deleting R3F

These die with the files; no separate work needed:

- **R3F-A** `RealmClimbRoute.tsx:657-680` per-frame `setTick(...)`
- **R3F-B** `Player.tsx` + `RealmClimbRoute.tsx` per-frame
  `new THREE.Vector3/Quaternion/Box3` allocation
- **R3F-C** `TerrainManager.tsx:196-202` cleanup leaves
  `streamQueue`/`queuedChunks` live
- **R3F-D** `TerrainManager.initialChunkRing` synchronous generation
- **R3F-E** `useGLTF.preload` Set eviction
- **R3F-F** Per-frame Koota `trait.set(...)` → React reconcile storm

## Part 2 — Findings that must be fixed in code

### Performance / memory

- **P1** `app/atoms/circular-gallery.tsx:69-84` — rAF loop calling
  `setState` every frame. Replace with `useRef` + direct DOM style
  mutation, or CSS `@keyframes` driven by a ref-updated element.
- **P2** `src/audio/ambient-music.ts:164-243` —
  `playAmbientForArchetype` is non-reentrant. StrictMode double-
  invoke leaks the whole `OscillatorNode` + `BiquadFilterNode` +
  `GainNode` graph because the module-level `ambientBus` ref is
  overwritten before the previous bus is torn down. Required fix:
  check `ambientBus` at the top, call `stopAmbient()` synchronously
  before constructing new nodes; then build new bus.
- **P3** `src/audio/ambient-music.ts:270-283` — `stopAmbient()`
  clears references but relies on `oscA.stop()` to fire `onended`.
  If the oscillator never started (already stopped or context
  suspended), `onended` never fires → filter/envelope/LFO
  `disconnect()` calls never run → node graph leaks. Required
  fix: `disconnect()` every owned node unconditionally inside
  `stopAmbient()` in a try/catch, then null the bus.
- **P4** `src/audio/ambient-music.ts` — the dispose helper
  (`disposeAmbientForTests`) must walk every owned node (oscA, oscB,
  filter, gain, LFO osc, LFO gain, envelope, master) and call
  `disconnect()` on each; currently some are only implicitly cleaned
  up through graph-garbage-collection which does not work under test
  re-entry.
- **P5** `src/audio/sfx.ts` — audit for the same pattern; each `playCue`
  call creates new oscillators + envelopes. Verify each cue's
  oscillator has an `onended` that disconnects, even if the cue is
  cut short.
- **P6** `app/hooks/use-auto-pause.ts` — callback in `useEffect` deps
  causes listener churn on every render. Use a `ref` to hold the
  callback; attach listener once.

### Correctness

- **C1** `app/main.tsx` — `createRoot().render(<Game />)` fires
  before `bootstrapPlatform()` resolves. React renders; `AudioBindings`
  reads preferences; preferences initializer hasn't run; defaults
  win. Required: `await bootstrapPlatform()` before calling
  `createRoot`. After the JP port, `main.tsx` will instead be:
  1. `await bootstrapPlatform()`
  2. create canvas element in DOM (or grab pre-existing one)
  3. `await startScene(canvas)` from `@scene` (calls `loadRuntime`)
  4. `createRoot(hudRoot).render(<HUDOverlay />)` — last
- **C2** `scripts/*.ts` still import from the old
  `../src/games/voxel-realms/engine/...` paths. Files:
  - `scripts/validate-realms.ts`
  - `scripts/verify-runtime-assets.ts`
  - `scripts/verify-visual-manifest.ts`
  - `scripts/verify-build-budget.ts`
  - `scripts/report-realm-assets.ts`
  - `scripts/test-visual-manifest-verifier.ts`
  These power `pnpm realm:validate`, `pnpm realm:verify-visual`,
  `pnpm realm:assets`, `pnpm build:verify-budget`, the `prebuild`
  hook, and the `test` script. They all break until paths are
  rewritten to `@world/*`, `@engine/*`, `@ai/*`, `@assets/*`.
  **This is the highest priority fix — CI is red on this branch
  without it.** Use the same kind of regex rewrite the restructure
  used.

### Security

- **S1** `android/.gitignore` — `*.jks`, `*.keystore`, `key.properties`
  are all commented out. Uncomment. Do the same for `ios/` with
  `*.mobileprovision`, `*.p12`, `ExportOptions.plist`,
  `GoogleService-Info.plist` if/when those materialize.
- **S2** `src/platform/preferences.ts:46-57, 91-98` —
  `normalizeRealmPreferences` does a shallow spread that preserves
  unknown keys and wrong-typed values. Required: field-by-field
  coercion that drops unknown keys, type-checks each known key,
  clamps numeric ranges, caps string lengths. Wrap the
  `JSON.stringify(next)` output in a byte-length guard (reject >64KiB)
  before `Preferences.set`.
- **S3** `src/platform/storage.ts` — the `value TEXT` column has no
  length cap. Required: `CHECK(length(value) < 131072)` in the
  schema + a JS-side size guard in `setItem` that rejects/truncates
  over a cap (32 KiB for settings, 128 KiB for run state).
- **S4** `src/platform/storage.ts:30-33, 20-28, 75` — `getItem`
  rethrows on database init failure. When `connectionPromise` is
  reset to null after a failed init, every subsequent read throws.
  Required: treat DB init failure as a degraded read, return `null`
  + log once. Consumers already tolerate `null` via defaults.
- **S5** `src/platform/database.ts:87-99` —
  `closeDatabase()` doesn't remove the injected `jeep-sqlite`
  element or null `webReadyPromise`. Required: clean up both.
- **S6** `android/app/src/main/res/xml/config.xml` with
  `<access origin="*"/>` is a dead Cordova artifact. Capacitor
  doesn't read it. Delete the file.

## Part 3 — Jolly Pixel port

### New code

- **JP1** Add to `package.json`:
  `@jolly-pixel/engine@^2.5`, `@jolly-pixel/runtime@^3.3`,
  `@jolly-pixel/voxel.renderer@^1.4`. Confirmed available on npm.
- **JP2** `src/world/voxel-bake.ts` — pure function
  `bakeRealmVoxels(realm: RealmClimb): VoxelWorldJSON` that emits
  the JP voxel-renderer JSON format. Snapshot-tested per archetype
  × seed. See JP schema at
  `@jolly-pixel/voxel.renderer/dist/serialization/VoxelSerializer.d.ts`:
  ```ts
  interface VoxelWorldJSON {
    version: 1;
    chunkSize: number;
    tilesets: TilesetDefinition[];
    blocks?: BlockDefinition[];
    layers: VoxelLayerJSON[];
  }
  ```
- **JP3** `src/scene/runtime.ts` — `startScene(canvas)`:
  ```ts
  import { Camera3DControls } from "@jolly-pixel/engine";
  import { Runtime, loadRuntime } from "@jolly-pixel/runtime";

  export async function startScene(canvas: HTMLCanvasElement) {
    const runtime = new Runtime(canvas, { includePerformanceStats: false });
    const { world } = runtime;

    world.createActor("camera").addComponent(Camera3DControls, {}, (c) => {
      // framing rules from @engine/framing-validation
    });
    world.createActor("terrain").addComponent(TerrainBehavior);
    world.createActor("player").addComponent(PlayerBehavior);
    world.createActor("route").addComponent(RouteBehavior);

    await loadRuntime(runtime);
    return runtime;
  }
  ```
- **JP4** `src/scene/terrain-actor.ts` — `TerrainBehavior extends
  ActorComponent`, `initialize({ assetManager })` loads tileset;
  `awake()` adds `VoxelRenderer`, calls
  `vr.load(bakeRealmVoxels(realm), { mergeLayers: true })`.
  References: `@jolly-pixel/voxel.renderer/src/VoxelRenderer.ts`,
  example `packages/voxel-renderer/examples/scripts/components/VoxelMap.ts`
  at `/Users/jbogaty/src/reference-codebases/editor`.
- **JP5** `src/scene/player-actor.ts` + `src/scene/player-behavior.ts`
  — input reader (WASD/arrows/touch), kinematic controller,
  write-back to `RealmTrait` via `@store`. Use module-level scratch
  vectors (avoid R3F-B allocation storm).
- **JP6** `src/scene/camera-behavior.ts` — `Camera3DControls`
  wrapper using framing rules from `@engine/framing-validation`.
- **JP7** `src/scene/route-actor.ts` — anomaly GLTFs via
  `runtime.world.assetManager` (JP's Loaders), beacons/hazards via
  voxel layer. Deletes the `resolveAssetUrl` helper since JP
  resolves paths correctly against Vite base out of the box.
- **JP8** `src/scene/tileset.ts` — a catalog that hands out the
  project's tilesets to `TilesetLoader` (one per archetype, plus a
  default). Use an Outfit-ish palette for now; tileset swap is a
  follow-up.
- **JP9** `src/scene/index.ts` — barrel that exports `startScene`
  and the public behaviors.

### Wire-up

- **JP10** Rewire `app/main.tsx`:
  1. `import "@app/styles/globals.css"`
  2. `await bootstrapPlatform()` (fixes C1)
  3. Grab `<canvas id="scene-canvas" />` from `index.html`
     (add the canvas element to `index.html` at body-level,
     absolute-positioned, full viewport)
  4. `await startScene(canvas)` from `@scene`
  5. `createRoot(document.getElementById("hud-root")).render(<HUDOverlay />)`
     — the HUD overlay is a `<div id="hud-root" style="position:fixed; inset:0; pointer-events:none">`
     with children re-enabling pointer events.
  6. React reads live scene state from Koota traits via `useTrait`;
     the scene writes to the same traits from behaviors.
- **JP11** `app/views/HUDOverlay.tsx` (new) — replaces the
  phase-switching logic that lived in `Game.tsx`. Subscribes
  `PhaseTrait`, swaps between `<Landing>`, `<HUD>`, `<Pause>`,
  `<RealmCollapsed>`, `<GameOver>`, `<Settings>`.
- **JP12** Update `src/store/traits.ts` to add `PhaseTrait` if it
  isn't there (the phase was held in React state inside `Game.tsx`).
- **JP13** `index.html` — add `<canvas id="scene-canvas">` +
  `<div id="hud-root">`. Remove any `height: 100dvh` CSS chain
  that fought R3F layout.

### Delete

- **D1** `app/games/voxel-realms/r3f/**/*`
- **D2** `app/games/voxel-realms/Game.tsx`
- **D3** `app/games/voxel-realms/Game.test.tsx`,
  `Game.golden-path.test.tsx`, `Game.test-helpers.ts` — R3F-coupled;
  scene-level tests are future work (add a `src/scene/runtime.test.ts`
  stub if desired but it's not required for this PR).
- **D4** `app/games/voxel-realms/AudioBindings.tsx` — replace
  with `app/components/audio-bindings.tsx` that imports from
  `@audio` + `@store` only.
- **D5** `app/games/voxel-realms/index.ts`, `index.d.ts`,
  `vite-env.d.ts` — delete; replace with `src/vite-env.d.ts` at repo
  root if any `/// <reference types="vite/client" />` is needed.
- **D6** `app/hooks/use-game-loop.ts` — JP owns the frame loop.
- **D7** `app/test/browserGameHarness.tsx` — R3F-specific harness;
  new scene harness (if any) lives at `src/scene/test-harness.ts`
  (future work, not required for this PR).
- **D8** From `package.json` dependencies:
  `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
- **D9** From `app/styles/globals.css`: any `height: 100dvh` /
  `height: 100vh` cascade on `html/body/#root`.

### Vite chunk splits

- **JP14** Remove the `vendor-physics`, `vendor-r3f`,
  `vendor-three`, `vendor-sqlite`, `vendor-react`, `vendor-ecs`
  manualChunks entries that reference R3F packages. Replace with:
  - `vendor-jp` → `@jolly-pixel/*`
  - `vendor-three` (keep, now imported by JP packages)
  - `vendor-react` (keep)
  - `vendor-ecs` → `koota`
  - `vendor-sqlite` (keep)

## Part 4 — Done criteria

### Local (code-only, no runtime)

- `pnpm typecheck` clean
- `pnpm lint` clean (Biome)
- Grep: no `@react-three/` imports in `src/` or `app/`
- Grep: no `app/games/voxel-realms/` or `src/games/voxel-realms/`
  paths anywhere
- Grep: no `<Canvas>` JSX (the R3F one) anywhere
- Grep: no `useGLTF` calls anywhere
- Grep: `new Runtime(` appears exactly once, in
  `src/scene/runtime.ts`

### CI (remote)

- `ci.yml`: typecheck, lint, vitest, realm:validate, build, Android
  APK — all green
- `cd.yml`: release checks + Pages deploy + Android debug APK —
  all green on merge to main
- Live Pages (https://arcade-cabinet.github.io/voxel-realms/)
  renders JP scene on desktop + mobile portrait

## Part 5 — Order of operations (for the remote executor)

1. **C2 first** — scripts/ path updates, because `pnpm build` and
   `pnpm realm:validate` in CI fail until this is done. Nothing
   else validates without these.
2. **S1, S6** — keystore gitignore + dead config.xml delete. Small,
   independent, ship first.
3. **S2, S3, S4, S5** — persistence hardening. These files survive
   the R3F→JP port intact.
4. **P1, P2, P3, P4, P5, P6** — performance fixes for non-R3F files
   (circular-gallery, audio, use-auto-pause). These files survive.
5. **JP1** — add JP deps.
6. **JP2** — `src/world/voxel-bake.ts` + tests.
7. **JP3–JP9** — build out `src/scene/`.
8. **C1 + JP10–JP13** — rewire `app/main.tsx` and `index.html`.
9. **D1–D9** — delete R3F scaffolding and drop deps.
10. **JP14** — update Vite chunk splits.
11. **Local typecheck + lint.** No runtime.
12. **Push.** CI validates runtime.
13. **Address CI failures** — iterate purely by tsc + lint locally
    + CI logs remotely.
14. **Squash merge.**

## References

- Jolly Pixel: `/Users/jbogaty/src/reference-codebases/editor/packages/voxel-renderer`
- Working JP voxel demo:
  `packages/voxel-renderer/examples/scripts/demo-tiled.ts`
- Block shapes:
  `packages/voxel-renderer/src/blocks/shapes/` (Cube, Slab, Ramp,
  Stair, Pole, PoleY, RampCornerInner/Outer, StairCornerInner/Outer)
- Example `VoxelMap` component pattern:
  `packages/voxel-renderer/examples/scripts/components/VoxelMap.ts`
- Migration PRD: `docs/plans/jolly-pixel-migration.prq.md`
- Batch tracker: `docs/plans/batch-tracker.md`

## Constraints

- **No local runtime.** CI owns vitest, Playwright, build. Use
  `tsc --noEmit` + `biome check .` + grep only during local
  iteration. Past sessions leaked 7 GB of RSS when Vitest was run
  against the R3F build; don't reproduce that.
- **One PR.** Everything in Parts 2 + 3 lands together.
- **Squash merge.** Commits are for tracking local progress; main
  sees one atomic "feat: port scene layer to Jolly Pixel + fix
  security/performance audit findings" commit.
