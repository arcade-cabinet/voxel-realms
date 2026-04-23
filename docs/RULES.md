---
title: Rules
updated: 2026-04-23
status: current
domain: gameplay
---

# Rules

This document owns the current gameplay contract. High-level direction lives in
[DESIGN.md](./DESIGN.md). Test enforcement lives in [TESTING.md](./TESTING.md).

## Realm Lifecycle

1. Start at the shoreline camp.
2. Enter an active seeded realm.
3. Follow the golden path upward through platforms and hazards.
4. Scan anomaly signals along the route.
5. Prime and reach the exit gate.
6. Extract or collapse.
7. Roll into the next realm in the deterministic sequence.

## Player Objectives

- Reach at least one anomaly signal.
- Survive hazard pressure and instability.
- Reach the exit gate before collapse.
- Continue the expedition across repeated realms.

## Core Runtime Rules

- Every realm must have a validated golden path.
- Every adjacent golden-path step must satisfy the movement envelope.
- The exit gate remains locked until signal-scan progress is sufficient.
- Instability can escalate the realm into collapse.
- Collapse ends the current realm, not the whole expedition sequence.
- Extraction and collapse both feed deterministic expedition history.

## Current System Rules

- Five archetypes currently define the realm deck: jungle, ocean, steampunk,
  dinosaur, arctic.
- The sequence should cover each archetype once before repeating the cycle.
- Anomalies can be runtime models, deferred markers, or reference-only catalog
  entries, but objective-critical anomalies must remain readable.
- Route guidance, gate state, and stability must remain visible in the HUD.

## Non-Rules

These are intentionally not required right now:

- crafting
- mining
- block placement
- quests
- NPC dialogue trees
- class builds
- inventory-heavy RPG systems

## Remaining Work In This Domain

- Define scoring, ranking, or expedition reward rules.
- Decide how many signals are required in later realms or harder biome sets.
- Add more hazard verbs without breaking deterministic validation.
- Add rules for relics, modifiers, or loadout if progression becomes necessary.
