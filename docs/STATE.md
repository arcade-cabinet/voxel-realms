---
title: State
updated: 2026-04-23
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
| Core gameplay | Partial | deepen archetype rules, progression, onboarding, and failure-state language |
| Asset curation | Partial | replace markers with curated runtime models, trim heavy characters, expand biome sets |
| Mobile UX | Partial | physical-device tuning, settings surfaces, resume flow |
| Persistence | Early | connect wrappers to full player-facing save/load and preference UX |
| Testing | Strong base | add physical-device QA, runtime-controller replay checks, performance thresholds |
| Deployment | Healthy | keep Pages and Android artifact path stable as product grows |
| Release ops | Partial | add Android signing and iOS signing/submission pipeline |
| Presentation | Partial | add richer audio, haptics, and more authored visual set pieces |
| Playtest operations | Early | telemetry, crash reporting, and structured feedback loop |

## Immediate Next Work

1. Improve the actual mobile play experience on real hardware.
2. Promote more realm anomalies from marker mode to real runtime models.
3. Build the first real progression layer around repeated realm runs.
4. Add production telemetry and store-ready signing.

## Risks To Watch

- Deferred character assets can silently push runtime complexity if curation is
  not enforced.
- Mobile controls can still fail the product even if deterministic validation is
  green.
- Release infrastructure is ahead of store-signing and player-facing progression,
  so the repo can look more complete than the game actually feels.
