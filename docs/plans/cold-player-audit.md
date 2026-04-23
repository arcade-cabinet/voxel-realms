---
title: Cold-Player UX Audit
updated: 2026-04-23
status: current
domain: plan
---

# Cold-Player UX Audit

Goal: surface every moment a first-time player looks at the current voxel-realms
build and cannot answer "what am I supposed to do?" in under three seconds.

Method: direct read of the shipped `RealmLanding.tsx`, `HUD.tsx`, and `Game.tsx`
against the cold-player criterion from the PRD. Each finding is mapped to a
corrective task id in `docs/plans/voxel-realms-1.0.prq.md`.

## Findings

### 1. Landing hero copy is poetic, not operational
**Where**: `app/games/voxel-realms/ui/RealmLanding.tsx:54` — "Climb worlds that
should not touch." / lead paragraph.

**Problem**: A player lands, sees a beautiful hero line, and cannot predict
what the verbs of play are. LORE.md anchors operational voice (*"Climb the
spire. Scan the signals. Extract before it falls."*). The landing should echo
that.

**Corrective task**: P2.2 (Landing page as a product).

---

### 2. Landing eyebrow text is marketing debris
**Where**: `RealmLanding.tsx:50-52` — "Season One / Signal Ascent".

**Problem**: Season-One copy implies ongoing live-ops that do not exist. A cold
player reads it as "I missed the last one". Remove or replace with a single
brand eyebrow.

**Corrective task**: P2.2.

---

### 3. "Enter Realm / Start ascent" CTA is dual-labeled
**Where**: `RealmLanding.tsx:61-64` — the button shows two stacked labels.

**Problem**: Touch affordance is ambiguous. One primary CTA, one label.
"Start expedition" or "Begin climb" — one line, thumb-reach on mobile.

**Corrective task**: P2.2.

---

### 4. No first-run coach overlay
**Where**: `Game.tsx:24-98` — transitions from `menu → playing` have no tutorial
layer at all.

**Problem**: A first-time player hits the realm, sees a HUD full of stats, a
crosshair, and a world to move through — with no hint that the beacon column
is the forward path. The LORE.md authored coach strings exist; nothing fires
them.

**Corrective task**: P2.3 (First-run coach), P2.8 (Route guidance rework).

---

### 5. HUD exposes engineering identifiers
**Where**: `HUD.tsx:147-173` — "XYZ 0,0,0", "Step 3/12", "Models 2/4 · 1.1MB/4.0MB",
"GLB 2/5 inline 1 / safe 1 marker 2 · deferred 1 · ref 0".

**Problem**: This reads as a debug overlay. Fine for internal playtest; the
player sees it as noise. Gate behind a debug-HUD setting toggle.

**Corrective task**: P2.4 (HUD copy & readability), P5.4 (Settings — debug-HUD
toggle).

---

### 6. Objective string is raw, not plain language
**Where**: `HUD.tsx:176` — `{realm.objective}` rendered directly.

**Problem**: The engine-owned objective text is functional but lacks the
"current step" framing ("Find the next anomaly" vs. the raw objective). HUD
needs to compose the objective with LORE-approved copy.

**Corrective task**: P2.4.

---

### 7. Game-over title is "YOU DIED"
**Where**: `Game.tsx:91-95` — `<GameOverScreen title="YOU DIED" …>`.

**Problem**: LORE.md explicitly says surveyors do not die — realms collapse.
This one string undoes the whole fiction in one word.

**Corrective task**: P2.5 (Failure-state language).

---

### 8. "Final Score" on game-over is misleading
**Where**: `Game.tsx:93` — `subtitle={\`Final Score: ${state.score}\`}`.

**Problem**: Score is shown on a collapse as if the expedition ended. The
expedition continues past any one collapse. The screen needs: realm archetype,
signals scanned, next-realm preview, and a Continue CTA — not a finality.

**Corrective task**: P2.5, P2.7 (Next-realm rollover).

---

### 9. "Respawn" button mixes metaphors
**Where**: `Game.tsx:94` — `<OverlayButton>Respawn</OverlayButton>`.

**Problem**: Respawn is FPS vocabulary. Voxel Realms collapses and advances.
The authored CTA per LORE.md is "Continue Expedition".

**Corrective task**: P2.5.

---

### 10. Gate state is reported as plain text with no visual mode change
**Where**: `HUD.tsx:167` — `{exitGate.label}` in the same color-from-accent row.

**Problem**: LOCKED / ARMED / OPEN should be three visually distinct modes
(color + icon + possibly a dedicated card). Plain text in the telemetry row
is easy to miss mid-climb.

**Corrective task**: P2.4, P3.6 (Gate arming communication).

---

### 11. Instability is displayed as "%" with no readable urgency
**Where**: `HUD.tsx:111` — `Stability ${stabilityPercent}%`.

**Problem**: A value ticking downward with no visual drama does not
communicate collapse pressure. Needs either a timer bar, pulsing urgency at
<25 %, or both. LORE.md anchors "collapse" — the HUD should match.

**Corrective task**: P2.4, P3.6.

---

### 12. Next-realm trigger is hidden in the HUD action cluster
**Where**: `HUD.tsx:260-266` — `canAdvanceRealm` button shows "Next" or "Reroll"
next to a "Jump" button.

**Problem**: After an extraction or collapse, the player is in a transition
moment that deserves its own authored screen (P2.6 extraction beat, P2.5
collapse screen). Surfacing it as a small sibling of the Jump button loses
the moment and confuses gameplay input.

**Corrective task**: P2.6 (Extraction beat), P2.5, P2.7.

---

### 13. Crosshair is static and not gated by input mode
**Where**: `Game.tsx:56-86` — the ring + dot crosshair.

**Problem**: On mobile there is no cursor — the crosshair is implied. The
same fixed-position white ring competes with HUD copy and feels like a
desktop artifact on phone.

**Corrective task**: P5.1 (Touch controls rework).

---

### 14. Model / GLB / asset telemetry leaks to players
**Where**: `HUD.tsx:169-173`, `HUD.tsx:282-307` (`ModelBudgetReadout`).

**Problem**: "GLB 2/5 inline 1 / safe 1 marker 2" is tool-maker text. Either
hide behind debug-HUD or remove from player-facing HUD entirely.

**Corrective task**: P2.4, P5.4.

---

## Summary

| # | Finding | Corrective task(s) |
| --- | --- | --- |
| 1 | Landing hero is poetic, not operational | P2.2 |
| 2 | Landing eyebrow is marketing debris | P2.2 |
| 3 | CTA is dual-labeled | P2.2 |
| 4 | No first-run coach | P2.3, P2.8 |
| 5 | HUD exposes engineering identifiers | P2.4, P5.4 |
| 6 | Objective string is raw | P2.4 |
| 7 | Game-over title is "YOU DIED" | P2.5 |
| 8 | Game-over shows final score | P2.5, P2.7 |
| 9 | "Respawn" button mixes metaphors | P2.5 |
| 10 | Gate state has no visual mode change | P2.4, P3.6 |
| 11 | Instability % has no urgency | P2.4, P3.6 |
| 12 | Next-realm button in action cluster | P2.5, P2.6, P2.7 |
| 13 | Fixed desktop crosshair on mobile | P5.1 |
| 14 | Asset/budget telemetry visible to players | P2.4, P5.4 |

14 ambiguity moments identified (≥ 8 required). All mapped to PRD tasks.
