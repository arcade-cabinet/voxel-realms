---
title: AGENTS.md - Voxel Realms
updated: 2026-04-22
status: current
domain: technical
---

# Voxel Realms Agent Instructions

Voxel Realms is a standalone extraction from the Arcade Cabinet. It is preserved as a referenceable voxel exploration prototype, not as an active cabinet launch cartridge.

## Product Boundary

- Keep this repo standalone.
- Do not re-add Voxel Realms to the central cabinet without an explicit owner decision.
- Do not grow this into a broad survival sandbox unless Bok has already evaluated and rejected the relevant techniques.
- Treat Bok as the likely destination for reusable ideas, not as a code-dump target.

## Architecture

- `app/` contains React/R3F presentation, HUD, shared cartridge UI, and browser tests.
- `src/` contains deterministic voxel simulation, terrain generation, Koota traits/world, and shared pure utilities.
- `public/` contains static assets and wasm copied from the cabinet.

## Merge Guidance For Future Agents

The valuable pieces to preserve and reference are:

- `src/games/voxel-realms/engine/voxelSimulation.ts` for deterministic telemetry, objective text, resource pickup, biome discovery, and terrain generation.
- `app/games/voxel-realms/r3f/TerrainManager.tsx` for chunk streaming and CI-safe instancing fallback.
- `app/games/voxel-realms/r3f/World.tsx` for fog, shoreline, sky, ridges, clouds, and silhouette framing.
- `app/games/voxel-realms/r3f/SpawnCamp.tsx` for the authored spawn-camp onboarding pattern.
- `app/games/voxel-realms/ui/HUD.tsx` for survey/pickup/biome readability and touch-anywhere joystick integration.

Port ideas into Bok surgically. Do not import the app shell, route model, or a second voxel engine.

## Verification

Use Vitest Browser for browser/component/gameplay verification. Direct Playwright can be used for local diagnosis only if Vitest Browser cannot expose the visual issue.

Expected checks before publishing changes:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
