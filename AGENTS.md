---
title: AGENTS.md - Voxel Realms
updated: 2026-04-23
status: current
domain: technical
---

# Voxel Realms Agent Instructions

Voxel Realms is a standalone, mobile-first voxel platforming game. Web is the development and playtest harness; Android and iOS via Capacitor are product targets.

## Product Boundary

- Keep this repo standalone.
- Do not re-add Voxel Realms to the central cabinet without an explicit owner decision.
- Do not grow this into a broad survival sandbox unless Bok has already evaluated and rejected the relevant techniques.
- Keep realm generation finite, deterministic, and golden-path testable.

## Architecture

- `app/` contains React/R3F presentation, HUD, platform bootstrap, persistence wrappers, and browser tests.
- `src/` contains deterministic voxel simulation, realm generation and validation, Koota traits/world, and shared pure utilities.
- `android/` and `ios/` contain first-class Capacitor native shells and should stay buildable.
- `public/` contains static assets, curated models, brand fonts, and web SQLite wasm.

## Documentation Source Of Truth

- `docs/DESIGN.md` owns the game shape and non-goals.
- `docs/RULES.md` owns the current gameplay contract.
- `docs/ASSETS.md` owns asset curation and runtime promotion policy.
- `docs/VISUAL_REVIEW.md` owns visual identity and readability checkpoints.
- `docs/ARCHITECTURE.md` owns stack and system boundaries.
- `docs/TESTING.md` owns validation and browser/native quality gates.
- `docs/DEPLOYMENT.md`, `docs/RELEASE.md`, and `docs/PRODUCTION.md` own workflow, release, and launch-readiness behavior.
- `docs/STATE.md` is the canonical remaining-work tracker.

## Merge Guidance For Future Agents

The valuable pieces to preserve and reference are:

- `src/games/voxel-realms/engine/voxelSimulation.ts` for deterministic telemetry, objective text, resource pickup, biome discovery, and terrain generation.
- `src/games/voxel-realms/engine/realmClimber.ts` for realm generation, anomaly placement, and golden-path validation.
- `src/games/voxel-realms/engine/realmValidation.ts` for batch validation across generator, pathfinding, framing, runtime telemetry, and Yuka plan checks.
- `src/games/voxel-realms/engine/realmAssetBudget.ts` for runtime model policy, static variants, and build-budget enforcement.
- `src/games/voxel-realms/engine/realmYukaPlaythroughAgent.ts` for deterministic agent-path verification.
- `app/games/voxel-realms/r3f/TerrainManager.tsx` for chunk streaming and CI-safe instancing fallback.
- `app/games/voxel-realms/r3f/World.tsx` for fog, shoreline, sky, ridges, clouds, and silhouette framing.
- `app/games/voxel-realms/r3f/SpawnCamp.tsx` for the authored spawn-camp onboarding pattern.
- `app/games/voxel-realms/r3f/RealmClimbRoute.tsx` for the rendered realm route, anomaly loading, and guidance highlights.
- `app/games/voxel-realms/ui/HUD.tsx` for survey/pickup/biome readability, route guidance, render-budget reporting, and touch-anywhere joystick integration.
- `app/shared/platform/persistence/` for the Capacitor SQLite and Preferences wrappers that have to stay portable across web and native.

If ideas move into Bok later, port them surgically. Do not import the app shell, route model, or a second voxel engine wholesale.

## Verification

Use Vitest Browser for browser/component/gameplay verification. Direct Playwright can be used for local diagnosis only if Vitest Browser cannot expose the visual issue.

Expected checks before publishing changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:browser
pnpm realm:validate -- --sequence-count 10
pnpm build
pnpm run cap:sync
cd android && ./gradlew assembleDebug
```
