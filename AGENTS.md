---
title: AGENTS.md - Voxel Realms
updated: 2026-04-22
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
- `src/` contains deterministic voxel simulation, terrain generation, Koota traits/world, and shared pure utilities.
- `android/` and `ios/` contain first-class Capacitor native shells and should stay buildable.
- `public/` contains static assets, curated models, brand fonts, and web SQLite wasm.

## Merge Guidance For Future Agents

The valuable pieces to preserve and reference are:

- `src/games/voxel-realms/engine/voxelSimulation.ts` for deterministic telemetry, objective text, resource pickup, biome discovery, and terrain generation.
- `app/games/voxel-realms/r3f/TerrainManager.tsx` for chunk streaming and CI-safe instancing fallback.
- `app/games/voxel-realms/r3f/World.tsx` for fog, shoreline, sky, ridges, clouds, and silhouette framing.
- `app/games/voxel-realms/r3f/SpawnCamp.tsx` for the authored spawn-camp onboarding pattern.
- `app/games/voxel-realms/ui/HUD.tsx` for survey/pickup/biome readability and touch-anywhere joystick integration.

If ideas move into Bok later, port them surgically. Do not import the app shell, route model, or a second voxel engine wholesale.

## Verification

Use Vitest Browser for browser/component/gameplay verification. Direct Playwright can be used for local diagnosis only if Vitest Browser cannot expose the visual issue.

Expected checks before publishing changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm run cap:sync
```
