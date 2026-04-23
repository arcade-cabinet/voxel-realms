# Voxel Realms Asset Direction

Updated: 2026-04-22
Status: working direction

## Renderer Decision

Stay on the current React Three Fiber, drei, and Rapier stack for now.

JollyPixel's voxel renderer is real and interesting, but it is primarily a chunked block/tile renderer with its own ECS assumptions. That is useful if Voxel Realms becomes a true editable block-world project. It does not directly solve the current asset problem because the purchased packs are mostly GLTF, GLB, OBJ, DAE, and VOX character/prop/creature models.

The current stack already handles the game's needs:

- Deterministic terrain and chunk streaming are already implemented.
- R3F can load the promoted GLTF/GLB chaos slice directly.
- Rapier is already wired into the first-person movement and terrain collision.
- The current code has CI-safe fallbacks and browser-test coverage.

Use JollyPixel later only if the game direction becomes "editable block terrain is the product." Do not pivot just to render these model packs.

## Chaos Slice Rule

The first public model slice intentionally follows a chaos-goblin rule:

- Start from every top-level zip in `raw-assets/archives`.
- Pick exactly one usable model per zip.
- Prefer GLB/GLTF where available, then OBJ, then VOX.
- Copy only that selected model and required sidecar files into `public/assets/models/chaos-slice/<pack-slug>/`.
- Keep the complete raw vendor dumps local-only under `raw-assets/`.

The selected public files are tracked in `public/assets/models/manifest.json`.

Regenerate the slice with:

```bash
pnpm assets:chaos-slice -- --seed chaos-goblin-first-slice-2026-04-22
```

Use a different seed to reroll the first public cast.

## What The Random Slice Suggests

The random slice does not point at a pure Minecraft clone. It points at a stranger extraction-survey game.

Working premise: Voxel Realms is a field-survey camp at the base of broken voxel realms. The player is not trying to conquer one coherent fantasy world. They are stabilizing a beacon that stitches mismatched vertical challenge spaces into the same expedition route.

That premise explains the asset chaos instead of fighting it:

- A bull, giraffe, seal, squirrel, osprey, python, octopus, ankylosaurus, griffin, mermaid, dwarf, Viking, samurai, steampunk character, clown, goblin, trap, plant, tree, honeycomb, house piece, cabinet, and sword can all coexist as survey anomalies.
- Progress can be about cataloging, extracting, and surviving weird biome incursions rather than building an enormous survival crafting matrix.
- The spawn camp remains the anchor. Each climb gets weirder farther from the beacon.

## Platforming Direction

The stronger game shape is a deterministic vertical realm climber, not an open-world voxel sandbox.

This should be tested as generated 3D traversal space:

- Each realm is PRNG-seeded and finite.
- The generator must emit a golden path from start to finish.
- The validator must prove each jump, gap, climb, drop, and landing is reachable under the movement model.
- The e2e harness can later drive a Yuka-style agent through the generated golden path with an actual character model.
- Failure should be structural, not subjective: if the path is broken, the seed fails.

This uses the asset chaos better than open world. Every level can be a compact vertical puzzle with one dominant anomaly theme and a few random intrusions, rather than a huge terrain field full of unrelated props.

First implementation landed in `src/games/voxel-realms/engine/realmClimber.ts`:

- The generator emits deterministic finite vertical routes from a seed and archetype.
- The validator proves golden-path reachability before runtime render.
- The R3F layer renders simple collidable platforms and anomaly markers, not full model loading yet.
- Chaos-slice asset paths are cataloged in generator metadata so promotion can happen by gameplay role.
- Runtime progress now scans anomaly markers by proximity and records discovered chaos-slice signals in Koota state.
- Hazard markers now feed deterministic instability pressure, giving trap/creature/environment assets a non-RPG gameplay role.
- Anomaly asset selection is role-aware instead of purely random: the primary and exit signals must be runtime-loadable, duplicate asset picks are rejected when the archetype has enough assets, and reference-only assets are reserved for optional branch flavor.
- The current nearest unresolved anomaly gets an in-world signal tether and scan-radius rings. This keeps the random asset cast readable as a traversal objective instead of background decoration.
- The exit gate now advertises its deterministic state in-world and in the HUD: locked before scans, primed after a signal, open after extraction, and collapsed after instability failure.
- The active golden-path link, next landing, and current-link hazard lane now get deterministic guidance highlights. This keeps the platforming contract readable before adding more expensive controller or Yuka e2e work.
- Extraction and collapse now feed deterministic realm sequencing, so later asset promotion can target multi-realm variety instead of a single authored route. Each five-realm cycle covers jungle, ocean, steampunk, dinosaur, and arctic once.
- Expedition survey stats expose which archetypes are being extracted, collapsing, and generating signal value, giving asset curation a measurable loop instead of a vibe-only pass.
- A deterministic golden-path agent now runs the route in pure engine code and scans reachable anomalies. This becomes the acceptance contract before loading heavy animated character assets or adding Yuka.
- `pnpm realm:validate` stress-tests generated realm batches before assets or controller complexity are promoted. Use `pnpm realm:validate -- --sequence-count 10` to test deterministic multi-realm discovery order.

## Realm Archetypes

Koota should remain useful as the ECS layer for runtime realm state and archetype selection. The pure generator should stay separate and deterministic.

Recommended split:

- Koota traits: active realm, seed, archetype, instability, discovered anomalies, extraction state, agent state.
- Pure generator: platform layout, hazards, route gates, anomaly placements, and golden path.
- Tests: validate generated traversal before runtime ever renders it.

Each archetypal biome should own a curated collection and rule set:

- Jungle: dense vertical vegetation, animal silhouettes, vine-like routes, ambush gaps.
- Ocean: floating ruins, sea-life anomalies, tide platforms, buoyant route timing.
- Steampunk: moving lifts, pipes, pressure gates, brass/industrial silhouettes.
- Dinosaur: heavy moving hazards, large platforms, stampede timing, fossil gates.
- Arctic: ice slides, wind gaps, low-visibility landing reads.
- Samurai/Viking/Dwarf/Mermaid/Goblin packs: character-realm modifiers or rare intrusion factions, not RPG quest systems by default.

The key is permutation inside a readable archetype. A realm should feel authored by rules, not like a random pile of every asset.

## Prototype Loop Candidate

Short loop:

1. Leave camp with a survey objective.
2. Enter a seeded vertical realm.
3. Climb, jump, and route through platform puzzles around anomaly assets.
4. Scan or recover one anomaly signal.
5. Exit through the top gate or return beacon before instability escalates.

This uses the current deterministic telemetry system without requiring a full crafting game. It also lets us promote assets opportunistically as the random slice reveals combinations that feel alive.

## Size Findings

The large files are not mainly a polygon-count problem. The worst GLTF files are VoxEdit exports that embed buffers and textures as base64 and include very large animation libraries.

Observed examples from the chaos slice:

- `Clown_Character_glt.gltf`: 42 MB, 157 animations, 44 embedded images.
- `Samurai GLTF.gltf`: 77 MB, 158 animations, 142 embedded images.
- `Male_D1.gltf`: 71 MB, 199 animations, 78 embedded images.
- `Goblin 3.gltf`: 48 MB, 180 animations, 32 embedded images.

Lossless GLTF to GLB conversion reduced the public chaos slice from 555 MB to 354 MB. That is worth doing by default, but the next real optimization is producing gameplay-specific variants:

- Static prop GLBs for scenery.
- Idle-only or locomotion-only character GLBs.
- Separate animation banks only when a character actually needs them.
- Optional decoder-backed compression only after the R3F loader path is wired and tested.

## Asset Promotion Guidance

Promote assets by role, not by pack ownership:

- `public/assets/models/chaos-slice/` is the first random cast.
- Future hand-picked assets should go into purpose folders only after they have a gameplay role.
- Large humanoid assets should not be loaded by default until animation, scale, and performance are tested.
- VOX-only assets can stay in public as references, but runtime use needs a loader or conversion step.

`src/games/voxel-realms/engine/realmAssetBudget.ts` is now the runtime gate for chaos-slice model promotion:

- `inline`: GLB, runtime-ready, and at or below 750 KB. These are suitable for the first marker-replacement pass.
- `safe`: GLB, runtime-ready, and at or below 3 MB. These can be loaded deliberately behind Suspense and route-level culling.
- `deferred`: runtime-ready GLB above 3 MB. This currently catches the large VoxEdit character exports and keeps them as anomaly metadata until trimmed variants exist.
- `reference`: non-GLB or not runtime-ready. These stay as design/reference picks until converted or given a loader.

Run the current budget report with:

```bash
pnpm realm:assets
```

Generate static GLB variants for deferred character assets with:

```bash
pnpm assets:static-variants
```

The static variant pass converts the 8 deferred character-source GLBs from 278.0 MB to 2.7 MB of static GLBs. The original source assets still classify as `deferred`; runtime rendering uses `getRealmAssetRuntimeModel()` to prefer the generated static variant when one exists.

The current archetype set has 17 safe-policy promotable source assets, 8 deferred heavy character assets with static variants, and 2 reference assets. `RealmClimbRoute` uses `selectRenderableRealmAnomalies()` against the live player position, then loads only selected runtime-model GLBs as normalized anomaly previews. The default render gate allows at most 4 active models, 4 MB of active model budget, a 42 m inline radius, and an 18 m safe radius. `selectPreloadRealmModelPaths()` uses the same count and byte budget with a larger 64 m inline / 32 m safe radius, so upcoming models can be fetched before they become visible without expanding the active render budget. The HUD reads the render selector through `summarizeRenderableRealmAnomalies()` so active GLB count, byte budget, safe/inline split, and marker-only anomalies are visible during traversal. Deferred/reference anomalies keep distinct marker treatment so curation risk is visible without paying source-model load cost.

Production builds use `scripts/copy-public-assets.mjs` instead of Vite's default `public/` copy. It copies runtime-safe source GLBs, static variants, manifests, and reference files, but prunes chaos-slice source GLBs above 3 MB from `dist`. The source catalog remains in `public/`; the shipped build gets `dist/assets/models/pruned-assets.json` documenting every skipped source file.

`scripts/verify-runtime-assets.ts` checks that every runtime model path exists in `public/`, every generated static variant matches its recorded byte size, and every deferred source GLB with a static variant is absent from `dist`. `pnpm build` runs this verifier with `--dist` after the filtered copy step.

## Build Payload Budget

The Vite build uses manual chunks to keep payload ownership readable:

- `vendor-physics`: Rapier and `@react-three/rapier`.
- `vendor-three`: Three core.
- `vendor-r3f`: React Three Fiber, drei, and three-stdlib.
- `vendor-react`: React and scheduler.
- `vendor-misc`: remaining small node_modules code.
- `realm-engine`: deterministic realm generation, validation, sequencing, agent, and asset-budget code.

The large physics chunk is expected. `@dimforge/rapier3d-compat` currently publishes `rapier.es.js` as one approximately 2 MB ESM module plus its wasm sidecar, so Rollup cannot meaningfully split it further through `manualChunks`. `vite.config.ts` sets `chunkSizeWarningLimit` to the current physics ceiling. If this warning returns, treat it as a real vendor-growth signal rather than an asset-copy issue.

The current production build separates code and model budgets:

- `dist/` is about 34 MB after filtered public asset copy.
- `public/assets/models/` remains about 340 MB because it keeps source chaos-slice assets for curation.
- `copy-public-assets.mjs` prunes about 317 MB of oversized source GLBs from `dist`.
- Runtime renderable model budget remains 4 active GLBs and 4 MB around the player.

`scripts/verify-build-budget.ts` runs after the production asset verifier in `pnpm build`. It fails the build if dist payload, total JS payload, named vendor chunks, copied public bytes, or pruned source bytes drift past the current explicit budgets.

Do not try to solve GLB payload size by changing code chunking. Code chunking keeps startup ownership readable; `copy-public-assets.mjs`, static variants, and `realmAssetBudget.ts` own model payload control.
