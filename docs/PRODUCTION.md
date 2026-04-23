---
title: Production
updated: 2026-04-23
status: current
domain: release
---

# Production

This document owns launch targets, what is already shipped, what is partial, and
what still blocks broader public playtesting or store submission. Current
snapshot lives in [STATE.md](./STATE.md). Manual sign-off lives in
[LAUNCH_READINESS.md](./LAUNCH_READINESS.md).

## Product Targets

| Target | Requirement |
| --- | --- |
| Web | Public playtest harness on GitHub Pages |
| Android | Buildable Capacitor shell plus debug artifact on `main` |
| iOS | Buildable Capacitor shell plus release archive path |
| Persistence | Shared SQLite plus Preferences behavior across web and native |
| Validation | Deterministic realm validation and browser capture evidence |
| Visual identity | Branded landing, type system, and in-game readability |

## Shipped On Main

- GitHub Pages playtest harness is live.
- PR CI covers core validation, browser capture, and Android build.
- `main` CD covers release checks, Pages deploy, and Android debug artifact.
- Release workflow covers release-please, tagged web build, Android AAB, and
  iOS unsigned archive.
- Capacitor Android and iOS shells are tracked in repo.
- SQLite and Preferences wrappers are implemented.
- Deterministic realm generation and golden-path validation are implemented.

## Partial Systems

| System | Current State |
| --- | --- |
| Mobile UX | Touch controls exist, but physical-device tuning is still open |
| Persistence UX | Storage wrappers exist, but player-facing resume/settings UX is thin |
| Runtime model usage | Budgeted anomaly rendering exists, but heavy marker replacement is incomplete |
| Playtest loop | Browser harness is live, but broader feedback and telemetry loops are not wired |
| Release delivery | Tagged artifacts build, but store-signing and distribution are still partial |

## Remaining Work By Domain

### Gameplay

- Add deeper realm differentiation beyond route geometry and current hazard mix.
- Decide long-run progression, unlocks, or expedition meta.
- Add onboarding and failure-state clarity.

### Assets And Visuals

- Replace more markers with curated runtime models.
- Produce lighter gameplay variants for deferred character assets.
- Expand biome-specific dressing beyond the first chaos slice.
- Create mobile/store art assets from the same visual language.

### Mobile Product

- Tune touch movement and camera behavior on physical devices.
- Add player-facing settings for audio, motion reduction, and haptics.
- Decide resume/start flow for native playtests.

### Quality

- Add physical-device Android and iOS QA.
- Add runtime-controller replay verification, not just pure-engine Yuka checks.
- Add performance budgets and regression tracking.

### Release And Ops

- Add Android signing secrets for store-ready builds.
- Add iOS signing and submission flow.
- Decide external playtest distribution path for Android artifacts.
- Add crash and telemetry tooling.

## Near-Term Priority Order

1. Physical-device mobile feel and persistence UX.
2. More curated runtime model replacement inside the existing budgets.
3. Stronger playtest instrumentation and feedback collection.
4. Store-signing and submission pipeline.

## Not A Production Goal

- A giant open-world voxel sandbox.
- A quest RPG with heavy authored NPC content.
- Shipping every purchased voxel pack.
