---
title: Design
updated: 2026-04-23
status: current
domain: product
---

# Design

This document owns the player-facing shape of Voxel Realms. Technical details
live in [ARCHITECTURE.md](./ARCHITECTURE.md). Asset and curation direction live
in [ASSETS.md](./ASSETS.md).

## Product Statement

Voxel Realms is a mobile-first voxel platforming expedition. The player starts
from a stable shoreline camp, enters a finite seeded realm, climbs a validated
route through anomaly signals, and extracts before instability collapses the
level.

Web is the fast development and playtest surface. Android and iOS are the
actual product targets.

## Hard Decisions

- This is a vertical climber, not an open-world survival sandbox.
- Realms are finite and deterministic, even if the long-run discovery loop can
  continue across many realms.
- The generator must prove a golden path before runtime render.
- The game can use strange asset collisions as intentional anomaly fiction.
- Quest-heavy RPG structure is out of scope unless it becomes simpler than the
  traversal loop.
- Block building is not a default feature. Add it only if it becomes necessary
  for the core climb.

## Creative Pillars

- Deterministic wonder: seeded realms should feel surprising without being
  structurally random noise.
- Readable movement: the player must be able to read jumps, drops, climb-ups,
  hazards, and exits from eye level.
- Signal pursuit: anomaly scans and exit-gate unlocks are the reason to climb.
- Controlled pressure: instability, hazards, and collapse create urgency
  without turning the game into a survival spreadsheet.
- Mobile-first clarity: controls, cadence, and presentation must make sense on a
  phone before extra PC-only complexity is added.

## Core Loop

1. Spawn at the shoreline camp and orient on the active beacon route.
2. Enter a seeded realm with a known biome archetype and route objective.
3. Follow the validated golden path through platforms, hazards, and branch
   anomalies.
4. Scan at least one anomaly signal.
5. Reach the exit gate before instability closes the run.
6. Record the result as extracted or collapsed, then roll into the next realm.

## Current Shipped Slice

The current main branch already ships the foundation below:

- First-person traversal with a shoreline spawn camp and realm-route overlays.
- Deterministic realm generation for jungle, ocean, steampunk, dinosaur, and
  arctic climbs.
- Golden-path validation, pathfinding validation, spatial validation, framing
  validation, runtime telemetry validation, and Yuka plan validation in pure
  engine code.
- HUD guidance for objective, stability, gate state, current route step, and
  active model budget.
- Signal scanning, extraction, collapse, and deterministic next-realm
  sequencing.
- Browser capture evidence for start, signal, and goal checkpoints.
- Capacitor Android and iOS shells with SQLite and Preferences bootstrapped.

## Realm Archetypes

- Jungle: dense foliage, branch routes, creature signals, layered vertical
  reads.
- Ocean: floating routes, cleaner silhouettes, tide-style hazard reads, animal
  anomalies.
- Steampunk: prop-heavy climbs, pressure hazards, industrial signal framing.
- Dinosaur: heavier creatures, bigger silhouettes, broader platforms, more
  threatening hazard identity.
- Arctic: sparse landing reads, exposure, wind and ice cadence, harsher route
  readability tests.

The design rule is not "more asset types." The rule is "a clear archetype with
controlled intrusions."

## Non-Goals

- One giant editable voxel map.
- A crafting and mining economy.
- Quest chains, towns, or RPG party management.
- Lore systems that require long dialogue trees to explain the game loop.
- Heavy UI chrome that competes with route readability.

## Remaining Work In This Domain

- Tighten mobile movement feel, camera damping, jump forgiveness, and touch
  affordances.
- Decide the long-term run meta: score, rank, loadout, relics, or expedition
  unlocks.
- Turn more realm archetypes from "theme buckets" into distinct movement verbs.
- Add onboarding that explains start, signal, gate, collapse, and next-realm
  rollover without a wall of text.
- Replace generic death/game-over framing with expedition-specific failure and
  retry language.
- Decide how much authored fiction the camp, beacon, and anomaly system needs.
