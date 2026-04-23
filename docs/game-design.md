# Voxel Realms

A deterministic voxel realm-discovery game with streamed terrain roots, vertical traversal spaces, and first-person movement.

## Creative Pillars

- Procedural wonder: generated spaces should feel authored, not like a test grid.
- Safe spawn readability: the first seconds need orientation and stable footing.
- First-person traversal: the player reads platforms, landings, hazards, and routes from eye level.
- Survey progression: discovery should come from reaching and scanning strange realm pockets, not RPG quest chains.

## Presentation Direction

The world begins from a designed shoreline camp that proves scale and orientation while generated terrain and realm entrances stream around the player. Natural voxel greens, dirt, stone, sky, copper, water, and beacon cyan replace debug cubes with a playable starting point.

The first viewport should show a hand-scale survey tool, authored camp resources, beacon rings, and a walkable path into procedural traversal. This keeps the standalone version readable even before pointer lock or mobile movement starts.

## Emerging Direction

The stronger direction is a vertical realm climber rather than an open-world survival sandbox. Each realm should be PRNG-seeded, finite, and validated for a golden path from start to finish. That makes the procedural generation testable in 3D space and gives the asset chaos a purpose: each climb can be a compact puzzle around an unexpected creature, prop, character, or biome intrusion.

Do not assume quests, NPC dialog trees, or block building are required. Use them only if they become simpler than platform traversal and anomaly discovery.

Koota remains the right place for runtime ECS state: active realm archetype, seed, discovery state, extraction state, and eventually a test agent. The generator should remain pure and deterministic so jungle, ocean, steampunk, dinosaur, arctic, and other archetypes can be validated before rendering.

## Implemented Realm Climber Slice

`src/games/voxel-realms/engine/realmClimber.ts` now owns the first deterministic vertical-realm contract.

- `generateRealmClimb()` emits a finite seeded route with platforms, route links, hazards, anomalies, an exit gate, and a narrative objective.
- `validateGoldenPath()` verifies every golden-path link against the movement envelope: edge-to-edge jump distance, upward step height, safe drop, and landing size.
- The first archetypes are jungle, ocean, steampunk, dinosaur, and arctic.
- Chaos-slice model paths are bound to anomaly metadata through a role-aware asset planner. Primary and exit signals are guaranteed to have runtime-loadable GLB source or static-variant models, while reference-only assets are kept as optional branch flavor.
- `RealmTrait` stores active realm state in Koota beside the legacy voxel telemetry state.
- `RealmClimbRoute` renders the first generated route into R3F and uses fixed Rapier bodies when the world is interactive.
- `evaluateRealmProgress()` converts player position into route step, nearest anomaly, scan events, objective progress, and extraction readiness.
- Player runtime now advances `RealmTrait`, so anomaly signals can be discovered and the exit gate can mark extraction when at least one signal has been scanned.
- `realmSignals.ts` defines the distance curve for focused signal presentation. The R3F route uses it to draw a tether and scan-radius rings around the current nearest unresolved anomaly.
- `realmExitGate.ts` defines the lock/primed/open/collapsed gate state used by both HUD copy and the R3F exit-gate material treatment.
- `realmRouteGuidance.ts` summarizes the current golden-path link, movement verb, next landing, hazard lane, and distance detail for HUD copy plus active-link/next-platform/hazard highlighting.
- `src/games/voxel-realms/engine/realmInstability.ts` evaluates time pressure, hazard exposure, signal-scan relief, and stability level. HUD now surfaces realm stability and recent hazard pressure.
- `RealmTrait` now tracks base seed, realm index, completed realm summaries, and deterministic next-realm generation. After extraction or collapse, the HUD can roll to the next realm and dispatch a player reset back to camp.
- Collapse is a deterministic realm outcome, not a full game over. Completion history records extracted vs collapsed outcomes so failed routes still contribute to the discovery sequence.
- `summarizeRealmExpedition()` derives run stats from completed realm history and active realm state. HUD now shows run number, cycle position, extracted/collapsed counts, total scanned signals, and the last completed realm.
- `src/games/voxel-realms/engine/realmSequence.ts` guarantees archetype variety by shuffling a deterministic deck: every five-realm cycle visits jungle, ocean, steampunk, dinosaur, and arctic once before repeating.
- `src/games/voxel-realms/engine/realmAgent.ts` simulates a deterministic golden-path runner over the generated route. It emits waypoints, timed samples, scanned anomaly ids, extraction readiness, and structural issues.
- `RealmClimbRoute` renders that agent run as a small ghost breadcrumb path. This is intentionally not Yuka yet; it is the testable contract Yuka or another controller can be asked to satisfy later.
- `src/games/voxel-realms/engine/realmSpatialValidation.ts` audits the generated 3D space around the agent contract: clean start/exit goal posts, route-link coverage, stale metadata, visible walk gaps, hazard lane anchoring, and landing sample support.
- `src/games/voxel-realms/engine/realmFramingValidation.ts` audits checkpoint camera readability: start/signal/goal capture coverage, route-forward framing, signal anomaly framing, goal look-back framing, and minimum look distance.
- `src/games/voxel-realms/engine/realmValidation.ts` validates batches of archetype/seed permutations through both the generator and agent runner. Run independent batches with `pnpm realm:validate` or sequence coverage with `pnpm realm:validate -- --sequence-count 10`.
- Vitest Browser playthrough coverage starts the game, captures a start screenshot, teleports through every generated checkpoint under a test-only hook, verifies path index and scan state, then captures signal and goal-post screenshots. The generated visual manifest records screenshot fingerprints plus SHA-256 digests; `pnpm test`, `pnpm test:browser`, and `pnpm test:golden` verify the manifest and PNG files after browser runs.

The rule is simple: new realm generation features should fail in unit tests before they fail visually.

## Current Feature and Polish Pass

- Biome discovery and resource pickup events now persist as deterministic state for UI/R3F effects.
- The scene renders pickup pulses, resource sparks, biome silhouettes, and richer camp/world orientation without increasing startup cost.
- The HUD surfaces recent pickup and biome discovery milestones as survey progression.
- The landing page now uses local brand fonts, shader-styled realm atmosphere, and a production-facing ascent brief.

## Simulation and Test Boundaries

`src/engine/voxelSimulation.ts` owns the deterministic terrain generation, spawn camp layout, movement vectors, jump behavior, biome classification, objective progress, and survival telemetry. The worker imports the same generator, so browser screenshots, unit tests, and Android builds use one terrain contract.

Coverage is split between pure Vitest engine tests and Vitest Browser plugin flow/e2e screenshots. Browser automation remains routed through the Vitest browser provider rather than direct Playwright test commands.

## Responsive and Android Contract

- The root fills its parent with `GameViewport`.
- Pointer-lock exploration fills the parent viewport.
- Touch players get forward, left, right, and jump controls that dispatch the same runtime movement events used by keyboard input.
- The standalone app shell uses dynamic viewport units to keep the horizon stable under mobile browser chrome.
- Android packaging uses the standalone Capacitor app shell.

## Stack

React Three Fiber, Rapier, Web Workers
