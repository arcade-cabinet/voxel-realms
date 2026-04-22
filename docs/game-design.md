# Voxel Realms

An infinite voxel survival experience with streamed terrain chunks and first-person movement.

## Creative Pillars

- Procedural wonder: terrain generation should feel like a world, not a test grid.
- Safe spawn readability: the first seconds need orientation and stable footing.
- First-person survival: the player reads the horizon, ground, and resources from eye level.
- Survey progression: the HUD should make exploration, biome shifts, landmarks, and coordinates legible without turning the world into a spreadsheet.

## Presentation Direction

The world begins from a designed shoreline camp that proves scale and orientation while generated terrain streams around the player. Natural voxel greens, dirt, stone, sky, copper, water, and beacon cyan replace debug cubes with a playable starting point.

The first viewport should show a hand-scale survey tool, authored camp resources, beacon rings, and a walkable path into procedural terrain. This keeps the arcade cabinet version readable even before pointer lock or mobile movement starts.

## Current Feature and Polish Pass

- Biome discovery and resource pickup events now persist as deterministic state for UI/R3F effects.
- The scene renders pickup pulses, resource sparks, biome silhouettes, and richer camp/world orientation without increasing startup cost.
- The HUD surfaces recent pickup and biome discovery milestones as survey progression.
- The cabinet landing uses the shared cartridge frame with a voxel label, play control, and rules drawer.

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
