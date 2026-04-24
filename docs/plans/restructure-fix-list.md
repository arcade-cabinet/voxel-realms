---
title: Restructure + JP Port — Fix List
updated: 2026-04-24
status: current
domain: plan
---

# Restructure + JP Port — Exhaustive Fix List

Every finding from the security + performance audits that must be resolved
in this PR. No local test execution; CI validates via xvfb-run.

## Auto-resolved by deleting the R3F directory

These files die in this PR — the findings disappear with them:

- **R3F-A**: `RealmClimbRoute.tsx:657-680` per-frame `setTick(...)` full-tree re-render
- **R3F-B**: `Player.tsx` / `RealmClimbRoute.tsx` per-frame `new THREE.Vector3/Quaternion/Box3` allocation
- **R3F-C**: `TerrainManager.tsx:196-202` cleanup leaves `streamQueue`/`queuedChunks` live
- **R3F-D**: `TerrainManager.initialChunkRing` synchronous generation
- **R3F-E**: `useGLTF.preload` Set eviction
- **R3F-F**: Per-frame Koota `trait.set(...)` → React reconcile storm
- **R3F-G**: Invalid `data-*` attrs on `<group>` (already fixed in #80)

No separate commit; they vanish with `rm -rf app/games/voxel-realms/r3f`.

## Must fix in code (not solved by port)

### Performance / memory

- **P1** `app/atoms/circular-gallery.tsx` rAF + setState-per-frame — replace with CSS transform or `useRef`/direct-DOM update loop.
- **P2** `src/audio/ambient-music.ts` non-reentrant `playAmbientForArchetype` — leaks Web Audio nodes on StrictMode double-invoke. Must add reentrancy guard + full node teardown.
- **P3** `src/audio/ambient-music.ts` missing `onended` cleanup on `stopAmbient()` failures.
- **P4** `src/audio/ambient-music.ts` dispose helper must clear every owned node (oscillators, filters, gains, LFOs, envelopes) and null the module-level `ambientBus`.
- **P5** `src/audio/sfx.ts` same category — audit for similar leaks.
- **P6** `app/hooks/use-auto-pause.ts` listener churn on re-renders. Use ref for callback.

### Correctness

- **C1** `app/main.tsx` bootstrap order — `createRoot().render()` fires before `bootstrapPlatform()` resolves; AudioBindings and settings read preferences before init. Await platform before render.
- **C2** Scripts in `scripts/*` still import from old `../src/games/voxel-realms/engine/...` paths — `pnpm realm:validate`, `pnpm realm:verify-visual`, `pnpm realm:assets`, `pnpm build:verify-budget`, `pnpm test:visual-verifier`, `pnpm assets:verify-runtime` all broken until paths updated.

### Security

- **S1** `android/.gitignore` — `*.jks`, `*.keystore`, `key.properties` commented out. Uncomment + add `ios/` equivalents.
- **S2** `src/platform/preferences.ts` — `normalizeRealmPreferences` shallow spreads unknown keys. Replace with field-by-field typed coercion; cap string lengths; reject oversized payloads.
- **S3** `src/platform/storage.ts` — `value TEXT` column has no length cap. Add `CHECK(length(value) < N)` in schema + JS-side size guard in `setItem`.
- **S4** `src/platform/storage.ts` — `getItem` rethrows on database init failure; should fail-soft to `null` + log once.
- **S5** `src/platform/database.ts` — `closeDatabase()` doesn't remove injected `jeep-sqlite` element. Clean up.
- **S6** Dead `android/app/src/main/res/xml/config.xml` with `<access origin="*"/>` — delete.

## New code (JP port)

- **JP1** Add `@jolly-pixel/engine`, `@jolly-pixel/runtime`, `@jolly-pixel/voxel.renderer` to `package.json`.
- **JP2** Write `src/scene/runtime.ts` — boots `new Runtime(canvas)`, creates actors, calls `loadRuntime(runtime)`.
- **JP3** Write `src/scene/terrain-actor.ts` — `ActorComponent` that consumes `src/world/voxel-bake.ts` output and drives `VoxelRenderer.load(voxelWorldJson)`.
- **JP4** Write `src/scene/player-actor.ts` + `src/scene/player-behavior.ts` — kinematic controller, reads `Input`, writes `RealmTrait` position.
- **JP5** Write `src/scene/camera-behavior.ts` — `Camera3DControls` wrapper using framing rules.
- **JP6** Write `src/scene/route-actor.ts` — anomaly GLTFs via JP asset manager, beacons/hazards via voxel layer.
- **JP7** Write `src/scene/tileset.ts` — catalog + loader.
- **JP8** Write `src/world/voxel-bake.ts` — pure `bakeRealmVoxels(realm) → VoxelWorldJSON`.
- **JP9** Rewire `app/main.tsx`:
  - await `bootstrapPlatform()` before `createRoot`
  - phase switching via Koota `PhaseTrait` trait instead of `Game.tsx` state
  - single canvas mount point (`<canvas id="scene-canvas" />`) hosted by the HTML shell, not React
  - React renders only the HUD overlay at `z-index` above the canvas

## Delete

- **D1** `app/games/voxel-realms/r3f/**/*`
- **D2** `app/games/voxel-realms/Game.tsx` (phase switching moves to `app/main.tsx` + `PhaseTrait`)
- **D3** `app/games/voxel-realms/Game.test.tsx`, `Game.golden-path.test.tsx`, `Game.test-helpers.ts` — replaced by scene-level tests (future work; removed here because they can't compile after R3F is gone)
- **D4** `app/games/voxel-realms/AudioBindings.tsx` — replaced by a thin hook subscribing Koota trait changes to `@audio`
- **D5** `app/games/voxel-realms/index.ts`, `index.d.ts`, `vite-env.d.ts` — replaced by `src/vite-env.d.ts`
- **D6** `app/hooks/use-game-loop.ts` — JP owns the frame loop
- **D7** `app/test/browserGameHarness.tsx` — R3F-specific; new scene harness lives at `src/scene/test-harness.ts` (future work)
- **D8** `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier` from `package.json`
- **D9** `globals.css` `height: 100dvh` cascade — JP owns the canvas

## Done-criteria (verified locally)

- `tsc --noEmit` clean
- `biome check .` clean
- Grep: no `@react-three/` imports anywhere in src/ or app/
- Grep: no `app/games/voxel-realms/` or `src/games/voxel-realms/` paths anywhere
- Grep: every `useGLTF` and `<Canvas>` gone
- Grep: every `createRoot(...render(<Game />))` gone; main.tsx mounts HUD overlay only

## Done-criteria (CI)

- ci.yml workflow green across: typecheck, lint, unit tests, realm:validate, build, Android APK
- cd.yml green on merge to main
- Live Pages renders JP scene on desktop + mobile portrait

## Order of operations (local, all code-only)

1. Commit the pending `app/` flatten as a separate checkpoint.
2. Fix S1, S6 (`.gitignore`, delete `config.xml`) — trivial, independent.
3. Fix C2 (scripts/) — needed for `realm:validate` in CI.
4. Fix C1 (`app/main.tsx` bootstrap await).
5. Fix P1 (`circular-gallery` rAF).
6. Fix P2, P3, P4, P5 (audio leaks).
7. Fix P6 (`use-auto-pause`).
8. Fix S2, S3, S4, S5 (persistence hardening).
9. Build `src/scene/` (JP1–JP8) + `src/world/voxel-bake.ts`.
10. Rewire `app/main.tsx` (JP9).
11. Delete R3F (D1–D9).
12. `tsc --noEmit` + `biome check .` locally.
13. Commit, push, squash-merge via PR. CI handles all runtime validation.
14. **Stop.**
