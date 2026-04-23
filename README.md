---
title: README
updated: 2026-04-23
status: current
---

# Voxel Realms

Voxel Realms is a mobile-first voxel platforming expedition about climbing unstable, stacked worlds before they collapse.

The current game slice generates deterministic 3D realm routes, validates a golden path from start to goal, captures browser playthrough evidence, and ships through a Capacitor shell for Android and iOS. Web remains the fast development and playtest harness; mobile is the product target.

## Current Scope

- First-person voxel traversal from a designed shoreline spawn camp into vertical realm climbs.
- Deterministic terrain and realm generation shared by runtime, workers, browser tests, and native builds.
- Golden-path validation for every generated climb, including platform links, hazards, clean start posts, and goal posts.
- Yuka-backed playthrough simulation and Vitest Browser visual captures for start, signal, and goal checkpoints.
- Runtime anomaly scanning, extraction progress, and realm instability stored in Koota state.
- Collapsed realms reroll into the deterministic discovery sequence without ending the run.
- Expedition survey stats summarize extracted/collapsed realms and scanned signals.
- React Three Fiber scene with Rapier physics, chunk streaming, shoreline dressing, silhouettes, clouds, beacon landmarks, and generated climb platforms.
- Capacitor Android/iOS shell with SQLite persistence, Preferences, splash/status bar configuration, and native build workflows.

## Product Direction

Voxel Realms is not an open-world survival sandbox. The stronger shape is a vertical, replayable climber where each realm is a compact 3D platform puzzle around a biome and curated voxel asset set. Jungle, ocean, steampunk, dinosaur, arctic, and future realms should stay finite, seedable, and testable.

New generation features should fail in deterministic validation before they fail visually. New player-facing surfaces should read like a game, not an implementation report.

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:browser
pnpm test:golden
pnpm test:visual-verifier
pnpm typecheck
pnpm realm:validate
pnpm realm:validate -- --sequence-count 10
pnpm realm:verify-visual
pnpm build
pnpm run cap:sync
pnpm run cap:open:android
pnpm run cap:open:ios
pnpm run cap:run:android
pnpm run cap:run:ios
```

`pnpm test:browser` runs the app tests through the Vitest Browser Playwright provider and writes start/signal/goal gameplay captures to `test-screenshots/voxel-realms-desktop.png`, `test-screenshots/voxel-realms-signal-desktop.png`, and `test-screenshots/voxel-realms-goal-desktop.png`. `pnpm test:golden` runs only the deterministic golden-path browser playthrough. Both commands verify the visual manifest after screenshots are written.

`pnpm realm:verify-visual` validates the generated visual manifest and verifies the PNG files on disk match their recorded SHA-256 digests. `pnpm test`, `pnpm test:browser`, and `pnpm test:golden` run it automatically.

`pnpm test:visual-verifier` runs the manifest verifier against temporary fixtures for matching files, missing files, stale digests, and malformed JSON. `pnpm test` runs it before the browser suite.

`pnpm run cap:sync` builds the web bundle, copies `sql-wasm.wasm`, verifies runtime assets, and syncs the result into the native Capacitor projects.

## Docs

- [Docs index](docs/README.md)
- [Design](docs/DESIGN.md)
- [Rules](docs/RULES.md)
- [Assets](docs/ASSETS.md)
- [Visual review](docs/VISUAL_REVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Release](docs/RELEASE.md)
- [Production](docs/PRODUCTION.md)
- [Launch readiness](docs/LAUNCH_READINESS.md)
- [State and remaining work](docs/STATE.md)
- [Changelog](CHANGELOG.md)
