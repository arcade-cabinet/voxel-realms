---
title: Voxel Realms — Restructure + Jolly Pixel port
updated: 2026-04-24
status: current
domain: plan
---

# Voxel Realms — Restructure + Port to Jolly Pixel (single PR)

## Why this PRD exists

Two problems, one rewrite.

### Problem 1: the shell stack is the wrong shape

The R3F + React + Vite + DOM/CSS shell produced a sequence of
CI-green / live-broken bugs — #80 (`useGLTF` bypasses `base`, R3F
rejects DOM `data-*`), #81 (`#root` height cascade + headless mobile
`dvh = 0`), #78 (context-loss flakes), plus every assertion I had to
hand-roll before I could even see them. That's an engine-shape
problem, not a test-coverage problem. React-Three-Fiber is a UI
framework pretending to be a game engine; every platform divergence
becomes a bespoke patch.

Jolly Pixel is an actual game engine: ECS actors + behaviors +
signals, a voxel renderer that takes `{position, blockId}` (a native
match for our already-procedural realms), engine-owned asset
resolution, a `Runtime` that owns the main loop and the canvas, a
unified `Input` system. Three.js stays as the graphics backend —
we just stop fighting React about who owns the viewport.

### Problem 2: the module layout is a junk drawer

Today's tree is shaped as if this repo hosts many games:

- `app/games/voxel-realms/…` — there is only one game
- `src/games/voxel-realms/engine/…` — 40+ files in one directory
  mixing generation, validation, pathfinding, yuka playthrough,
  asset budget, visual manifest, and runtime telemetry
- `app/shared/…`, `src/shared/…` — duplicate "shared" namespaces
- `app/games/voxel-realms/r3f/…` — R3F-coupled scene mixed with
  product-level phase switching in `Game.tsx`

Nothing has a barrel export. Every file reaches into every other
file's private surface. Splitting the R3F→JP port from the
restructure would mean rewriting imports in two separate passes.
Doing both in one PR means each file gets rewritten exactly once.

## Prime Directive (supersedes the 1.0 PRD until this PR lands)

One branch, one PR. After this PR merges:

- The live Pages build runs the Jolly Pixel scene.
- The module layout is decomposed by domain: `src/` holds
  runtime + deterministic engine, `app/` holds React DOM overlay
  only. No `games/voxel-realms/`. No `shared/` junk drawer.
- Every domain exports through an `index.ts` barrel. Cross-domain
  imports only touch barrels.
- A first-time player on live Pages can climb → scan → extract →
  collapse → next-realm fluently on desktop and mobile portrait.

## Target layout

```
src/                        # game runtime (non-UI)
  world/                    # realm generation, voxel bake, sequence
    index.ts                (barrel)
    climber.ts              (was realmClimber.ts)
    voxel-bake.ts           (NEW: RealmClimb → {position, blockId} commands)
    sequence.ts             (was realmSequence.ts)
    exit-gate.ts            (was realmExitGate.ts)
    signals.ts              (was realmSignals.ts)
    signal-pulse.ts         (was realmSignalPulse.ts)
    route-guidance.ts       (was realmRouteGuidance.ts)
    instability.ts          (was realmInstability.ts)
    hazard-vocabulary.ts    (was realmHazardVocabulary.ts)
    progression.ts
    playthrough-plan.ts     (was realmPlaythroughPlan.ts)
    types.ts
  engine/                   # deterministic simulation + validation
    index.ts
    voxel-simulation.ts     (was voxelSimulation.ts)
    validation.ts           (was realmValidation.ts)
    pathfinding.ts          (was realmPathfinding.ts)
    spatial-validation.ts   (was realmSpatialValidation.ts)
    framing-validation.ts   (was realmFramingValidation.ts)
    runtime-telemetry.ts    (was realmRuntimeTelemetry.ts)
    archetype-lighting.ts   (was realmArchetypeLighting.ts)
  ai/                       # yuka playthrough agent + realm agent
    index.ts
    yuka-agent.ts           (was realmYukaPlaythroughAgent.ts)
    realm-agent.ts          (was realmAgent.ts)
  assets/                   # budget, manifest, render override
    index.ts
    budget.ts               (was realmAssetBudget.ts)
    visual-manifest.ts      (was realmVisualManifest.ts)
  scene/                    # JP scene layer — replaces R3F directory
    index.ts
    runtime.ts              (boots JP Runtime, creates World)
    terrain-actor.ts        (VoxelRenderer + tileset — consumes voxel-bake output)
    player-actor.ts
    route-actor.ts          (beacons, hazards, anomaly GLTFs via JP asset registry)
    camera-behavior.ts      (Camera3DControls wrapper)
    player-behavior.ts      (input → movement → Koota trait write-back)
    tileset.ts              (tileset catalog + loader)
  audio/                    # ambient music + SFX
    index.ts
    ambient-music.ts        (was ambientMusic.ts)
    sfx.ts
  store/                    # Koota world + traits (bridge between scene and UI)
    index.ts
    world.ts
    traits.ts
  platform/                 # Capacitor + persistence
    index.ts
    bootstrap.ts
    haptics.ts
    native-shell.ts         (was nativeShell.ts)
    preferences.ts          (from persistence/preferences.ts)
    sqlite.ts               (from persistence/database.ts)
    storage.ts              (from persistence/storage.ts)
  shared/                   # event bus, cross-domain types
    index.ts
    event-bus.ts            (was eventBus.ts)
    types.ts

app/                        # React DOM overlay only
  main.tsx                  (boots platform + JP runtime + HUD overlay)
  views/                    # full-screen React views
    index.ts
    landing.tsx             (was RealmLanding.tsx)
    game-over.tsx           (was GameOverScreen.tsx)
    realm-collapsed.tsx     (was RealmCollapsedScreen.tsx)
    pause.tsx               (was PauseOverlay.tsx)
  components/               # HUD widgets + small React pieces
    index.ts
    hud.tsx                 (was HUD.tsx)
    first-run-coach.tsx     (was FirstRunCoach.tsx)
    extraction-beat.tsx     (was ExtractionBeat.tsx)
    next-realm-splash.tsx   (was NextRealmSplash.tsx)
    expedition-summary.tsx  (was ExpeditionSummaryCard.tsx)
    settings.tsx            (was SettingsScreen.tsx)
  atoms/                    # buttons, labels, cartridge, joystick
    index.ts
    atoms.tsx
    cartridge.tsx           (was Cartridge.tsx)
    circular-gallery.tsx    (was CircularGallery.tsx)
    floating-joystick.tsx   (was FloatingJoystick.tsx — only the real component; test gets a spec file below)
  hooks/                    # React hooks
    index.ts
    use-device.ts           (was useDevice.ts)
    use-responsive.ts       (was useResponsive.ts)
    use-container-size.ts   (was useContainerSize.ts)
    use-auto-pause.ts       (was useAutoPauseOnBackground.ts)
  styles/
    globals.css
  test/
    setup.ts
```

## Hard dependency rules

Enforced by barrel discipline + biome import checks where possible:

- `src/shared/` imports nothing from the repo (leaf module).
- `src/store/` imports `src/shared/` only.
- `src/world/`, `src/engine/`, `src/ai/`, `src/assets/` import
  `src/shared/` and each other's `index.ts` barrels. No direct
  path into another domain's private files.
- `src/scene/` imports `src/world/`, `src/engine/`, `src/assets/`,
  `src/store/`, `@jolly-pixel/*`, `three`. Not React.
- `src/audio/`, `src/platform/` are leaf domains, depend on
  `src/shared/` only.
- `app/` imports from any `src/*/index.ts` barrel. No three, no JP,
  no R3F in `app/`. React reads scene state through Koota traits.
- `app/main.tsx` is the only place that wires scene + UI + platform.

## What gets deleted

- `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`.
- `app/games/voxel-realms/r3f/**/*` — every file.
- `app/games/voxel-realms/Game.tsx` — phase switching moves to
  `app/main.tsx` driven by a single Koota `PhaseTrait`.
- `app/games/voxel-realms/AudioBindings.tsx` — replaced by a
  tiny hook that subscribes Koota trait changes to `src/audio`.
- `app/games/voxel-realms/index.ts`, `index.d.ts`, `vite-env.d.ts`
  — replaced by `src/vite-env.d.ts` + root exports.
- `useGameLoop` — JP owns the frame loop.
- Every `Game.test.tsx` / `Game.golden-path.test.tsx` /
  `Game.test-helpers.ts` — replaced by a scene-level Playwright
  spec that drives the JP runtime headlessly, plus the existing
  engine unit tests which are untouched except for the rename.
- The `globals.css` height cascade (`height: 100vh; height: 100dvh`
  chain on html/body/#root). JP owns the canvas; no cascade needed.
- `browserGameHarness.tsx` — replaced by a tiny scene harness that
  mounts a JP runtime in jsdom-skip mode for unit tests.

## What gets built

- `src/scene/runtime.ts` — boots `new Runtime(canvas)`, creates
  actors, wires `loadRuntime(runtime)`. Exported as `startScene()`.
- `src/scene/terrain-actor.ts` — `VoxelBehavior` that consumes the
  output of `src/world/voxel-bake.ts` and calls `VoxelRenderer.load`
  with a constructed `VoxelWorldJSON`.
- `src/scene/player-actor.ts` + `player-behavior.ts` — input +
  kinematic controller, writes position to `RealmTrait`.
- `src/scene/camera-behavior.ts` — `Camera3DControls` with our
  framing rules from `src/engine/framing-validation.ts`.
- `src/scene/route-actor.ts` — loads anomaly GLTFs via JP's
  `assetManager`, places beacons and hazard markers via the voxel
  layer for procedural signals and via GLTF for curated overrides.
- `src/world/voxel-bake.ts` — pure function
  `bakeRealmVoxels(realm: RealmClimb): BakedVoxelWorld` — snapshot
  tested per archetype × seed.
- `app/main.tsx` — new bootstrap: platform init → Koota world →
  JP runtime → React HUD overlay. No `<Canvas>` element in React.

## Test strategy

- **Engine unit tests** (every `*.test.ts` in `src/world`,
  `src/engine`, `src/ai`, `src/assets`): renamed only, behavior
  unchanged. These are the durable contract.
- **Scene tests**: `src/scene/runtime.test.ts` boots the runtime
  against a canvas stub and asserts actor composition. The render
  path is verified by Playwright, not jsdom.
- **UI tests** (`app/components/*.test.tsx`,
  `app/views/*.test.tsx`): existing RTL tests, updated imports,
  no R3F dependency.
- **Playwright prod-surface** (`e2e/prod-surface.spec.ts`): builds
  dist, serves on subpath, asserts landing → click start → canvas
  filled → HUD "RUN 1" visible → no 404s → no pageerrors. Runs on
  desktop-chromium + mobile-portrait + tablet-portrait.
- **Realm validation** (`pnpm realm:validate`): unchanged
  engine-only entrypoint, updated paths only.
- **Visual manifest** (`pnpm realm:verify-visual`): the captured
  frames are net-new because JP renders differently; rebaseline
  is part of this PR.

## Execution plan

One branch `feat/restructure-and-jp-port`, one PR:

1. **Paperwork** (this file + tracker + CLAUDE.md + ARCHITECTURE.md
   reflect the new layout).
2. **Scaffold domains**: create every `src/<domain>/index.ts`
   barrel as an empty export; create every `app/<domain>/index.ts`
   barrel as an empty export. tsconfig paths updated.
3. **Move engine/world/ai/assets/audio/platform files** (`git mv`
   where possible, or rewrite if rename also changes casing). Fix
   every import at the call site to go through the new barrel.
4. **Move UI files** to `app/views`, `app/components`, `app/atoms`,
   `app/hooks`. Rewrite imports.
5. **Write `src/scene/`**: runtime, terrain-actor, player-actor,
   player-behavior, camera-behavior, route-actor, tileset. Add
   `src/world/voxel-bake.ts` + snapshot tests.
6. **Rewire `app/main.tsx`**: delete `Game.tsx`, phase switching
   becomes a Koota trait + React subscribes.
7. **Delete R3F**: remove files, remove deps, strip globals.css
   cascade, update Capacitor sync.
8. **Green gate**:
   `pnpm lint && pnpm typecheck && pnpm test && pnpm realm:validate -- --sequence-count 10 && pnpm test:e2e:ci && pnpm build`.
9. **Rebaseline visual manifest** once.
10. **PR, green CI, merge**, then `.claude/state/DONE`.

## Non-goals

- Porting `@jolly-pixel/pixel-draw.renderer` or `/fs-tree` — those
  are editor tools; our game is procedural.
- Building an authoring UI.
- Dropping Capacitor. Mobile still ships via Capacitor.
- Rewriting the deterministic engine. It's the one part that works
  today; renames and relocations only.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Snapshot-baking 125 realms produces giant diffs. | Snapshots live in `src/world/__snapshots__/` and are reviewed once. Failures after that fail CI. |
| JP voxel style doesn't match the chaos-slice look. | Tileset is data — swap tilesets later without touching scene code. |
| HUD overlay still fights layout. | Overlay root is `position: fixed; inset: 0; pointer-events: none`; children opt back in. No height cascade because overlay doesn't host the canvas. |
| Rebaselining visual manifest hides regressions. | All engine-level validations (pathfinding, yuka, spatial, framing) stay in force, and they don't depend on pixels. |
| Player physics. | Phase-equivalent kinematic controller; JP's Rapier integration can come back later if needed. |

## References

- Jolly Pixel packages: `@jolly-pixel/engine@2.5`,
  `@jolly-pixel/runtime@3.3`, `@jolly-pixel/voxel.renderer@1.4`.
- Reference repo: `/Users/jbogaty/src/reference-codebases/editor`.
- Voxel demo we build from:
  `packages/voxel-renderer/examples/scripts/demo-tiled.ts`
  and `components/VoxelMap.ts`.

## Supersedes

- The phased migration plan previously in this file (PR #82). That
  plan called for `app/jp/` parallel tree and a 6-phase port —
  both were wrong-shape. This PR replaces it.
- `docs/plans/voxel-realms-1.0.prq.md` — the Prime Directive
  (fluent play on web + Android + iOS) still holds; the path to
  it now routes through this single restructure PR.

Follow-up: once this lands, archive this PRD and write
`docs/plans/restructure-jp-port-postmortem.md` with actuals vs
estimates.
