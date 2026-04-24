---
title: State
updated: 2026-04-24
status: current
domain: context
---

# State

This document is the current snapshot for Voxel Realms: what is shipped, what
just landed, and what remains.

## Where The Project Stands

Voxel Realms is no longer a loose voxel POC. It is now a mobile-first vertical
realm climber with:

- deterministic seeded realm generation
- verified golden paths
- browser capture evidence for start, signal, and goal
- tracked Capacitor Android and iOS shells
- SQLite and Preferences infrastructure
- GitHub Pages deployment for public playtests
- release-please, CI, CD, and release workflows on `main`

Live playtest harness:

- [https://arcade-cabinet.github.io/voxel-realms/](https://arcade-cabinet.github.io/voxel-realms/)

## Recent Milestones

### Foundation slice

The first major product slice established:

- shoreline camp plus vertical realm climbs
- anomaly scanning and extraction gate flow
- finite multi-realm sequencing across five archetypes
- deterministic validation and browser screenshot evidence
- Capacitor Android/iOS shell setup
- brand landing page, fonts, and production wording

### Deployment fix slice

The follow-up deployment slice established:

- workflow-dispatch support for CD
- rerunnable Pages deployment artifacts
- confirmed GitHub Pages deployment on `main`

### Documentation alignment slice

This documentation pass establishes a full docs map aligned to the current game
shape, stack, release flow, and remaining work.

### 1.0 polish slice (v0.3.0)

The autonomous 1.0 polish batch landed these subsystems between 2026-04-23
and 2026-04-24 (tagged as v0.3.0):

- Onboarding: cold-player audit, landing hero polish, HUD copy pass,
  first-run coach, extraction beat, next-realm splash.
- Gameplay: expedition score + ranks, same-seed retry, distinct archetype
  verbs, hazard vocabulary, scan-dwell pulse feedback, coyote time + jump
  buffer.
- Mobile: settings surface, pause overlay with hardware-back + keyboard,
  Android portrait lock, auto-pause on background, safe-area insets.
- Presentation: procedural SFX, native + web-fallback haptics, inline-CSS
  boot splash.
- Release ops: iOS signing runbook, playtest digest workflow, opt-in error
  telemetry, per-archetype perf budget.

## What Is Done Today

- The design direction is locked to a vertical realm climber rather than an open
  world.
- The first archetype loop is implemented.
- Realm generation is deterministic and validated before render.
- Browser capture evidence is part of the quality gate.
- Android is part of both PR CI and `main` CD.
- Pages deploy is live and healthy.
- Release workflow can build tagged web, Android, and iOS artifacts.

## Remaining Work By Pillar

| Pillar | Status | Remaining Work |
| --- | --- | --- |
| Core gameplay | Done | archetype verbs, hazard vocabulary, scan pulse, progression, coach, failure-state all shipped in v0.3.0 |
| Asset curation | Partial | replace markers with curated runtime models, trim heavy characters, expand biome sets |
| Mobile UX | Mostly done | touch-controls polish on physical devices remaining; pause, settings, resume, a11y, portrait all shipped |
| Persistence | Done | Capacitor Preferences + SQLite wrappers wired through settings + onboarding + expedition records |
| Testing | Strong base | sequence replay shipped; device-matrix E2E, coverage artifact, ≥12-capture visual manifest remain |
| Deployment | Healthy | keep Pages and Android artifact path stable as product grows |
| Release ops | Partial | Android signing keystore supported; iOS signing runbook drafted; secrets provisioning + icon pipeline remain |
| Presentation | Mostly done | procedural SFX + haptics + boot splash shipped; ambient music bed remains |
| Playtest operations | Mostly done | opt-in error telemetry + feedback template + weekly digest workflow shipped; native crash SDK remains |

## Immediate Next Work

1. Wire iOS signing secrets and promote the runbook in `docs/iOS_SIGNING.md`
   into a working `release.yml` job.
2. Promote realm anomalies from marker mode to curated runtime models per
   archetype (P4.1–P4.4 in the batch tracker).
3. Run physical-device playtest passes against the QA rubric in
   `docs/QA.md`.
4. Capture mobile/desktop store screenshots + a 30-second trailer loop.

## Risks To Watch

- Deferred character assets can silently push runtime complexity if curation is
  not enforced.
- Mobile controls can still fail the product even if deterministic validation is
  green.
- Release infrastructure is ahead of store-signing and player-facing progression,
  so the repo can look more complete than the game actually feels.
