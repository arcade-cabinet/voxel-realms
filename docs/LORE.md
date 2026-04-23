---
title: Lore
updated: 2026-04-23
status: current
domain: creative
---

# Lore

A one-page narrative anchor for HUD copy, onboarding text, and failure-state
language. Not a worldbuilding bible — just enough shared fiction that the
copy in-game reads as intentional instead of placeholder.

Design direction lives in [DESIGN.md](./DESIGN.md). Copy patterns and HUD
readability rules live in [VISUAL_REVIEW.md](./VISUAL_REVIEW.md).

## Premise

The world fractured into **realms** — small stacked worlds that rise on
their own and fall apart under their own weight. Each realm is finite:
it has a shoreline where survey teams anchor, a spire the survey team
climbs, and a collapse timer that begins the moment a surveyor sets foot
on the first platform.

The player is a **surveyor**. The survey team's job is not to settle a
realm. It is to climb, scan anomaly signals along the route, reach the
extraction gate before instability takes the spire down, and move on to
the next realm in the deterministic expedition sequence.

## Voice

- **Terse, operational.** HUD copy reads like a field log, not a sermon.
- **No glamor, no gore.** A collapsing realm is a structural event, not a
  death. Surveyors extract or collapse *with* the realm — they do not die.
- **Specific verbs.** `climb`, `scan`, `arm`, `extract`, `collapse`.
  Avoid generic words like *defeat* or *victory*.
- **Fiction explains mechanics.** The gate is locked because the signal
  mesh hasn't stabilized, not because the game gatekeeps the player.

## Key terms

| Term | In-game meaning |
| --- | --- |
| **Surveyor** | The player character. Anonymous by default. |
| **Realm** | A seeded, finite, vertical expedition zone. |
| **Shoreline camp** | The authored spawn point at the base of a realm. |
| **Spire** | The vertical route from camp to exit gate. |
| **Anomaly signal** | A scannable point along the route. Scanning contributes to gate arming. |
| **Exit gate** | The extraction portal at the top of the spire. LOCKED → ARMED → OPEN. |
| **Instability** | The realm's slow collapse pressure. Visible as the timer/meter. |
| **Collapse** | The realm ending before extraction. The surveyor is re-anchored to the expedition ledger. Not death. |
| **Extraction** | Reaching the gate in time and leaving the realm. |
| **Expedition** | The sequence of realms a run covers. Extraction and collapse both advance it. |
| **Expedition survey** | The persistent ledger showing realms extracted / collapsed / signals scanned. |

## Archetype sentences

One grounding sentence per archetype. These feed onboarding coach text,
next-realm splash, and store copy — keep them short and specific.

- **Jungle.** Layered canopy routes where branches split and merge around
  creature anomalies.
- **Ocean.** Floating platforms over open water where tide cadence sets the
  beat of the climb.
- **Steampunk.** Brass and pressure — industrial platforms punctuated by
  timed hazard pulses.
- **Dinosaur.** Broad primitive ledges; bigger silhouettes; longer jump
  envelopes and heavier consequence.
- **Arctic.** Thin ice and low-key lighting — sparse landings, narrow
  margin, harsher readability tests.

## Status lines (HUD and transitions)

Sample authored strings for the cold player:

- Landing hero: *"Climb the spire. Scan the signals. Extract before it falls."*
- First-run coach step 1: *"Follow the beacon. Each realm is a climb, not a wander."*
- First-run coach step 2: *"Anomalies stabilize the gate. Scan at least one."*
- First-run coach step 3: *"The gate opens when the signal mesh holds. Reach it."*
- Gate LOCKED: *"Gate locked — signal mesh incomplete."*
- Gate ARMED: *"Gate armed — proceed."*
- Gate OPEN: *"Gate open — extract."*
- Extraction: *"EXTRACTED."* + survey card + "Continue expedition".
- Collapse: *"REALM COLLAPSED."* + realm archetype + "Next realm" CTA.
- Next-realm splash: *"Next: {Archetype}. {Archetype sentence}."*

## What the lore is NOT

- It is not a faction system.
- There are no named NPCs.
- There is no dialogue.
- There is no combat narrative.
- Surveyors do not have backstories.

The fiction exists only to make the interface and the transitions read as
authored. Any expansion beyond this document should be owned by design and
recorded here.
