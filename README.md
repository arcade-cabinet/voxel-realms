# Voxel Realms

Standalone voxel exploration prototype extracted from the Arcade Cabinet.

Voxel Realms is no longer an active launch cartridge for the central cabinet. The code is preserved here so its voxel rendering, terrain streaming, spawn-camp onboarding, resource pickup feedback, biome discovery, and survey telemetry can be evaluated later, especially by Bok.

## Current Scope

- First-person voxel exploration from a designed shoreline spawn camp.
- Deterministic terrain generation shared by runtime, worker, and tests.
- Resource pickup and biome discovery events exposed as serializable game state.
- React Three Fiber scene with Rapier physics, chunk streaming, shoreline dressing, silhouettes, clouds, and beacon landmarks.
- Shared cartridge start screen and touch-anywhere floating joystick retained from the cabinet for continuity.

## Useful Follow-Up For Bok

Bok should evaluate these techniques later:

- Staged spawn-camp onboarding and first-30-second landmark readability.
- Pickup and biome discovery telemetry fields.
- CI-safe chunk/render startup staging.
- Environmental framing: ridges, fog, water plane, block clouds, and landmark silhouettes.

Do not import this repo wholesale into Bok. Bok should keep its own engine and port only proven rendering/state patterns.

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

## Docs

- [Game design](docs/game-design.md)
- [Changelog](CHANGELOG.md)
