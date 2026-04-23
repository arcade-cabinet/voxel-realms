---
title: Docs Index
updated: 2026-04-23
status: current
domain: documentation
---

# Docs Index

This folder is the source of truth for Voxel Realms product direction, asset
strategy, technical architecture, test strategy, deployment flow, and remaining
work.

## Reading Order

1. [DESIGN.md](./DESIGN.md) for the game shape and player promise.
2. [RULES.md](./RULES.md) for the current gameplay contract.
3. [ASSETS.md](./ASSETS.md) for the chaos-slice asset strategy and runtime
   promotion rules.
4. [VISUAL_REVIEW.md](./VISUAL_REVIEW.md) for visual identity and readability
   checkpoints.
5. [ARCHITECTURE.md](./ARCHITECTURE.md) for stack, runtime boundaries, and code
   ownership.
6. [TESTING.md](./TESTING.md) for validation, browser capture, and native build
   expectations.
7. [DEPLOYMENT.md](./DEPLOYMENT.md) for CI, CD, Pages, and mobile artifact flow.
8. [RELEASE.md](./RELEASE.md) for release-please and tagged artifact publishing.
9. [PRODUCTION.md](./PRODUCTION.md) for launch targets, blockers, and readiness.
10. [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) for the manual pre-playtest and
   pre-store checklist.
11. [STATE.md](./STATE.md) for the current shipped slice and remaining work by
   domain.

## Document Map

- [DESIGN.md](./DESIGN.md): creative pillars, non-goals, loop, biome rules, and
  gameplay open work.
- [RULES.md](./RULES.md): current realm lifecycle, objective contract, and
  explicit non-rules.
- [ASSETS.md](./ASSETS.md): raw asset posture, promotion tiers, static variants,
  and curation backlog.
- [VISUAL_REVIEW.md](./VISUAL_REVIEW.md): current visual language, validated
  screenshots, and art/readability open work.
- [ARCHITECTURE.md](./ARCHITECTURE.md): directory layout, deterministic engine,
  native shell, and runtime data flow.
- [TESTING.md](./TESTING.md): local commands, CI lanes, browser evidence, and
  remaining quality gaps.
- [DEPLOYMENT.md](./DEPLOYMENT.md): GitHub Pages, Android debug APK, workflow
  behavior, and required secrets.
- [RELEASE.md](./RELEASE.md): release-please behavior, artifacts, and release
  operator steps.
- [PRODUCTION.md](./PRODUCTION.md): target platforms, shipped versus partial
  systems, and launch blockers.
- [LAUNCH_READINESS.md](./LAUNCH_READINESS.md): human sign-off checklist for
  mobile playtests and store submission.
- [STATE.md](./STATE.md): current main-branch snapshot, merged milestones, and
  the remaining work tracker.

## Root Docs

- [../README.md](../README.md): quick repo overview and operator commands.
- [../AGENTS.md](../AGENTS.md): agent instructions and merge guidance.
- [../CHANGELOG.md](../CHANGELOG.md): release-please changelog output.

## Maintenance Rule

- When gameplay rules change, update [DESIGN.md](./DESIGN.md) and
  [RULES.md](./RULES.md) and [STATE.md](./STATE.md).
- When presentation shifts materially, update
  [VISUAL_REVIEW.md](./VISUAL_REVIEW.md).
- When renderer, mobile shell, persistence, or engine boundaries change, update
  [ARCHITECTURE.md](./ARCHITECTURE.md) and [TESTING.md](./TESTING.md).
- When workflows or release behavior change, update
  [DEPLOYMENT.md](./DEPLOYMENT.md), [RELEASE.md](./RELEASE.md), and
  [PRODUCTION.md](./PRODUCTION.md).
