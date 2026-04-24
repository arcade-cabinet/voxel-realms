---
title: Voxel Realms — Migration to Jolly Pixel engine
updated: 2026-04-24
status: current
domain: plan
---

# Voxel Realms — Pivot from R3F + React + Vite+Capacitor to Jolly Pixel

## Why this PRD exists

The 1.0 batch repeatedly shipped "green CI, broken live Pages" because the
shell stack (React + React-Three-Fiber + Vite + Capacitor + DOM/CSS
layout) is a UI framework pretending to be a game engine. Every
divergence between production and test surfaced as a one-off bug:

| Symptom | Root cause (stack artefact) |
|---|---|
| #80 Pages black, GLB 404s | `useGLTF("/assets/...")` fetches don't route through Vite `base`. |
| #80 R3F crash on `<group data-pulse-label>` | R3F reconciler rejects DOM `data-*` on three.js Group. |
| #81 canvas collapses to thin strip | `#root { min-height: 100dvh }` without explicit `height` lets GameViewport collapse. |
| #81 mobile-portrait CI still fails | `dvh` resolves to 0 in headless mobile emulation mid-paint. |
| #78 golden-path flake | R3F `useFrame` deltaMs unclamped; WebGL context-lost between tests. |
| #77 golden-path divergence | Unrelated, engine-side — survived the stack; this is the shape of bug we want to keep. |

The deterministic engine under `src/games/voxel-realms/engine/` is
healthy. The shell under `app/` is where time goes to die.

**Jolly Pixel** (`/Users/jbogaty/src/reference-codebases/editor`,
published as `@jolly-pixel/engine`, `@jolly-pixel/runtime`,
`@jolly-pixel/voxel.renderer` on npm) solves this by being an actual
engine: ECS actors + components + signals, a voxel renderer that takes
`{position, blockId}` (a native match for our already-procedural
realms), engine-owned asset loading, a `Runtime` that owns the main
loop, and a unified `Input` system. Three.js stays as the graphics
backend — we just stop fighting React about who owns it.

**Capacitor stays.** JP is a pure web engine; we wrap its bundle in
the existing Android/iOS shells exactly as we do now.

## Prime Directive (supersedes the 1.0 PRD until this migration lands)

A first-time player on the JP build can land on live Pages, understand
the goal in under 30 seconds, and play fluently through climb → scan →
extract → collapse → next-realm. The Game.test.tsx-style flakes, the
BASE_URL hand-wringing, and the CSS-height cascade are not just fixed
— they are structurally gone because the engine owns the viewport.

## What stays, what moves, what dies

### Stays verbatim (zero changes)

- `src/games/voxel-realms/engine/**/*` — deterministic generators,
  validators, pathfinding, yuka playthrough, visual manifest, asset
  budget, etc. Pure TypeScript, no React, no three.js directly.
- `src/games/voxel-realms/store/world.ts` — Koota world definition.
- `android/`, `ios/` — Capacitor shells. The web payload they load
  changes; the shells themselves don't.
- Vite. JP is a Vite-friendly library. We keep Vite; we change what
  it builds.
- release-please, dependabot, biome, tsc, the engine test suite.

### Replaced

| Old (R3F / React) | New (Jolly Pixel) |
|---|---|
| `app/main.tsx` + `createRoot(<Game />)` | `new Runtime(canvas)` + `loadRuntime(runtime)` |
| `<Canvas>` + `useFrame` | `runtime.world.beginFrame → update → render → endFrame` |
| `app/games/voxel-realms/r3f/World.tsx` | `World` actor + terrain actor with `VoxelRenderer` component |
| `r3f/Player.tsx` | `PlayerBehavior extends Behavior` on a Player actor; polls `world.input` |
| `r3f/TerrainManager.tsx` + `SpawnCamp.tsx` | Terrain actor with `VoxelRenderer`; `setVoxel()` per platform voxel |
| `r3f/RealmClimbRoute.tsx` | Route actor with layered `VoxelRenderer` for beacons/hazards + GLTF anomaly meshes via engine loader |
| `r3f/Player` camera + Drei controls | `Camera3DControls` component from JP |
| HUD as React DOM overlay | Keep a thin React DOM overlay **above** the canvas (JP is unopinionated about HTML overlays). Only the 3D scene moves to JP. |
| `useGLTF("/assets/...")` + `resolveAssetUrl` helper | JP's asset registry + `Loaders.model(...)` — relative paths, engine-resolved |
| `globals.css` `#root`/`#body`/`html` height cascade | JP owns the canvas; no `100dvh` dance |
| Drei + `@react-three/rapier` | Drop. Physics optional via JP's Rapier integration if needed. |

### Deleted

- `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`
- `app/games/voxel-realms/r3f/**/*`
- `app/games/voxel-realms/Game.tsx` (replaced by a thin mount module)
- React-component tests for R3F pieces (engine tests stay; Playwright
  prod-surface spec updates to target the JP scene)
- All `globals.css` that exists solely to fight the DOM height chain
  for the Canvas

### Built new (not covered by JP today)

- **Realm→voxel baker**: a pure function that takes a `RealmClimb`
  (our existing deterministic output) and emits the voxel-set commands
  for the terrain actor. Lives under `src/games/voxel-realms/engine/`
  so it stays testable without the runtime.
- **React overlay for menu/HUD**: keep a minimal React app mounted
  *above* the JP canvas for the landing screen, first-run coach, HUD
  readouts, settings/pause modals. React does what it's good at (text,
  forms, accessibility). JP owns the scene. They communicate via
  Koota traits — same way the scene talks to Koota today.
- **Asset path manifest**: JP resolves assets relative to the HTML
  root, which already avoids the BASE_URL bug. We commit an
  `assets.manifest.json` that the JP scene iterates for preloads.

## HUD overlay: why we keep React for that

The audit pointed out JP has a `UIRenderer` / `UISprite` system. We do
not need it. DOM is the right tool for our HUD: text readouts, pause
menu, first-run coach, settings screen. The bug we're fixing isn't
"React is bad" — it's "React is bad as a game-scene renderer." A
React overlay sitting above a JP-owned `<canvas>` has none of the
chained-height problems because React isn't trying to host the canvas.

The R3F coupling is what fought us. Flat DOM over a fixed-size canvas
doesn't.

## Phase plan — each phase is one PR, mergeable on its own

### Phase 0 — Foundations (this PR)

- Write this PRD.
- Update `docs/plans/batch-tracker.md` to record the pivot as
  Pillar 10 and mark it the only active pillar.
- Add a `docs/ARCHITECTURE.md` update noting the split:
  **engine (TS deterministic)** ⟂ **scene (JP)** ⟂ **UI (React DOM
  overlay)** ⟂ **shell (Capacitor)**.
- Do **not** yet add JP deps. Do not touch runtime code. This PR is
  paperwork so reviewers see the plan.

### Phase 1 — Hello JP

- Add `@jolly-pixel/engine`, `@jolly-pixel/runtime`,
  `@jolly-pixel/voxel.renderer` to `package.json`.
- Create `app/jp/` with `main.ts` that boots a JP `Runtime`, places a
  4×4 voxel platform, and wires one `Camera3DControls`. Mounted on a
  second Vite entry `jp.html` so it lives alongside the current build
  without colliding.
- New `pnpm dev:jp` and `pnpm build:jp` scripts.
- Prod-surface spec runs against `/voxel-realms/jp.html` in a new
  `@prod-surface-jp` tag. Asserts landing, canvas fills viewport, no
  404s, no pageerrors.
- **Exit criteria**: `pnpm build:jp` produces a dist; local preview
  shows a voxel platform with working camera; Playwright green on
  desktop + mobile-portrait.

### Phase 2 — Realm→Voxel baker

- New module `src/games/voxel-realms/engine/realmVoxelBake.ts`: takes
  a `RealmClimb` and returns `Array<{layer, position, blockId}>`.
  Pure function, snapshot-tested against every seeded archetype.
- Terrain actor in `app/jp/` consumes the bake output and calls
  `setVoxel()` in order. Any one realm is fully rendered from its
  seed through the baker through the terrain actor.
- **Exit criteria**: given any seed, the JP terrain visually matches
  the R3F terrain (side-by-side screenshots). Snapshot tests on
  `realmVoxelBake` cover all 5 archetypes × 25 seeds.

### Phase 3 — Player + camera

- `PlayerBehavior` polls `world.input` for WASD + jump.
- Writes position back to the Koota `RealmTrait` so the engine sees
  scan/extract progress exactly as today.
- Camera is a `Camera3DControls` with the same FOV/positioning as the
  R3F camera so golden-path framing continues to match.
- **Exit criteria**: the existing deterministic yuka playthrough,
  when teleported through the JP scene, reaches extraction. Engine
  tests unaffected.

### Phase 4 — React DOM HUD overlay (no JP UI)

- Keep existing HUD, FirstRunCoach, RealmLanding, PauseOverlay,
  SettingsScreen components. Mount them **above** the JP canvas via
  `createRoot` on a dedicated `#hud-root` div.
- `hud-root` sits in a flex/grid shell around the canvas; HTML layout
  no longer has to compete with R3F for the viewport.
- Koota traits stay the bridge. React subscribes with `useTrait` as
  it already does. JP writes traits from its Behaviors.
- **Exit criteria**: HUD text, pause, settings, first-run coach all
  work exactly as before, **without** the height-cascade problem —
  because React is sitting in flex boxes, not trying to fill a canvas
  parent.

### Phase 5 — GLTF anomalies via JP loader

- Route the existing `realmAssetBudget` + render-override tables
  through JP's `Loaders.model()`.
- Delete the `resolveAssetUrl` helper — JP handles path resolution.
- Static-variant and render-override GLBs load via the engine, not
  via hand-rolled `useGLTF`.
- **Exit criteria**: every anomaly still renders. P4.2's
  house-piece/vox-house overrides still show. No console 404s on live
  Pages.

### Phase 6 — Cutover

- Delete `app/games/voxel-realms/r3f/**/*`, `@react-three/*` deps,
  `globals.css` height-cascade cruft.
- `app/main.tsx` becomes a thin bootstrap that mounts HUD overlay +
  starts the JP runtime.
- Single Vite entry again (`index.html`), pointing at the JP app.
- Capacitor `cap sync` picks up the new dist.
- **Exit criteria**: live Pages + local prod-surface + Android debug
  APK all show the game; engine test suite still 100%; CI green
  across every job; `.claude/state/DONE` **only** then.

Each phase is its own PR with its own CI gate. Phase 6 is the first
time we delete R3F; everything before that runs in parallel.

## Non-goals

- Porting `@jolly-pixel/pixel-draw.renderer` or `@jolly-pixel/fs-tree`
  into our shell. Those are editor-authoring tools; our game is
  procedural.
- Building a realm-authoring UI. The deterministic generator is the
  authoring surface. The voxel renderer is read-only for now.
- Replacing Capacitor. Mobile still ships via Capacitor wrapping the
  same web bundle.
- Replacing React in the HUD. React DOM for text-and-forms UI is
  fine; we only purge the in-canvas React.
- Replacing the deterministic engine. It stays pure TS.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| JP's voxel renderer doesn't visually match the current chaos-slice style. | The baker is pure data. We iterate tilesets separately from port. A tileset that renders blocks as flat-shaded cubes in archetype palette reproduces the current look quickly. |
| Phase 2's baker snapshot tests explode in diff size. | Bake output is deterministic; snapshot files go in `src/games/voxel-realms/engine/__snapshots__/` and review is one-time. |
| HUD overlay React app still fights layout. | The HUD overlay's root is `position: fixed; inset: 0; pointer-events: none` with children opting back in. No height cascade because it doesn't contain the canvas. |
| Golden-path screenshots invalidate on visual change. | Rebaseline once when phase 2 lands. All engine-level golden-path assertions (pathfinding, yuka, spatial) stay untouched. |
| Physics. Rapier was a dependency; if player physics matters, JP's Rapier integration covers it; otherwise the current kinematic teleport-controller model keeps working. | Defer: phase 3 uses the same kinematic controller. Rapier can come back in a later phase if needed. |

## References

- Jolly Pixel audit: delivered by Explore agent on 2026-04-24.
- Repo: `/Users/jbogaty/src/reference-codebases/editor`
- Docs bundle: `/Users/jbogaty/src/reference-codebases/editor/docs/llms/*.md`
- Hello-JP reference example:
  `/Users/jbogaty/src/reference-codebases/editor/packages/voxel-renderer/examples/scripts/demo-physics.ts`
- Engine published: `@jolly-pixel/engine@2.5.0`,
  `@jolly-pixel/runtime@3.3.0`,
  `@jolly-pixel/voxel.renderer@1.4.0` — all confirmed on npm.

## Supersedes

- `docs/plans/voxel-realms-1.0.prq.md` — was the R3F-era 1.0 batch PRD. Its
  Prime Directive (fluent play, authored feel, web+Android+iOS) still
  holds; the path to it now routes through this migration.
- `docs/plans/batch-completion-gate.md` — hard gates stay identical;
  what changes is which shell they apply to.

Follow-up: once phase 6 lands, replace this PRD's "current" status
with "archived" and write a short `docs/plans/jolly-pixel-migration-postmortem.md`
covering what each phase actually took vs estimates.
