---
title: Testing
updated: 2026-04-23
status: current
domain: quality
---

# Testing

This document owns the validation strategy for Voxel Realms. Architecture
context lives in [ARCHITECTURE.md](./ARCHITECTURE.md). Launch gates live in
[LAUNCH_READINESS.md](./LAUNCH_READINESS.md).

## Core Quality Rule

Every new realm-generation feature should fail deterministically before it fails
visually or on a phone.

## Local Commands

### Lint and Typecheck

```bash
pnpm lint
pnpm typecheck
```

### Core Test Suite

```bash
pnpm test
```

Runs:

- visual-manifest verifier self-tests
- app and engine Vitest suites
- visual manifest verification against the latest captures

### Browser Capture Suite

```bash
pnpm test:browser
pnpm test:golden
pnpm realm:verify-visual
```

- `test:browser` runs the app suite in the Vitest Browser Playwright provider.
- `test:golden` runs the deterministic golden-path browser slice only.
- both produce and verify start, signal, and goal screenshots.
- `realm:verify-visual` verifies the manifest and PNG digests on disk.

### Deterministic Realm Validation

```bash
pnpm realm:validate
pnpm realm:validate -- --sequence-count 10
```

This validates seeded realm batches through generator, pathfinding, spatial,
framing, runtime telemetry, and Yuka plan checks.

### Asset and Build Validation

```bash
pnpm realm:assets
pnpm build
```

`pnpm build` also runs:

- filtered public asset copy
- runtime asset verification
- build budget verification

### End-to-End (Playwright)

```bash
pnpm test:e2e          # run full E2E matrix (desktop + mobile-portrait + tablet-portrait)
pnpm test:e2e:ci       # CI-facing subset (desktop-chromium project only, headless)
```

The E2E harness lives in `e2e/` and uses the Vite dev server via
`playwright.config.ts`. Specs:

- `e2e/smoke.spec.ts` — landing renders, game canvas attaches, no first-paint
  console errors.
- `e2e/journey.spec.ts` — cold-player affordances and realm-start transition.

Artifacts on failure:

- `test-results/` — per-spec screenshots, videos, and traces.
- `playwright-report/` — HTML report (uploaded from CI as an artifact).

**If a spec fails locally**: `pnpm exec playwright show-trace
test-results/.../trace.zip` — the trace viewer shows the DOM timeline,
network, and console output at the moment of failure.

### Native Validation

```bash
pnpm run cap:sync
cd android && ./gradlew testDebugUnitTest
cd android && ./gradlew assembleDebug
```

The iOS archive path is validated in CI/release on macOS via `xcodebuild`.

## Capture Artifacts

The browser test flow writes:

- `test-screenshots/voxel-realms-desktop.png`
- `test-screenshots/voxel-realms-signal-desktop.png`
- `test-screenshots/voxel-realms-goal-desktop.png`
- `test-screenshots/voxel-realms-manifest.json`

The manifest records digests, path indices, and capture metadata so browser
visual evidence remains deterministic.

## CI Matrix

### Pull Request CI

`ci.yml` currently runs:

- `core`: install, typecheck, lint, visual-verifier self-test, realm batch
  validation, and production build.
- `browser`: Chromium install, Vitest Browser run, visual capture upload.
- `e2e-smoke`: Chromium install, Playwright smoke + journey specs, Playwright
  report upload.
- `native-android`: web build, `cap sync android`, and debug APK build.

### Main-Branch CD

`cd.yml` currently runs:

- `release-checks`: typecheck, lint, realm validation, Playwright smoke E2E,
  and Playwright report upload.
- `realm-drift-smoke`: deep realm validation (`--sequence-count 25`) with
  `continue-on-error: true` as a drift signal.
- `deploy-pages`: build and deploy the static harness to GitHub Pages.
- `deploy-android-debug`: build and upload the Android debug APK artifact.

### Release Workflow

`release.yml` currently runs on release-please tags and produces:

- web artifact
- Android AAB
- iOS unsigned archive

## Test Layers At A Glance

| Layer | Runner | Entry point | When it fails → what to do |
| --- | --- | --- | --- |
| Lint | Biome | `pnpm lint` | `pnpm lint:fix`; if not auto-fixable, read the reported rule. |
| Typecheck | tsc | `pnpm typecheck` | Fix types. Never `@ts-ignore` to move on — that is an anti-pattern. |
| Unit (engine) | Vitest (node) | `pnpm test` (inc. `src/`) | Regression in deterministic engine; read the seed + failing assertion first. |
| Component (app) | Vitest + Testing Library | `pnpm test` (inc. `app/`) | Check rendered DOM + aria labels before changing tests. |
| Visual manifest | jiti script | `pnpm realm:verify-visual` | Either re-capture intentionally or fix the visual regression — do not blindly update digests. |
| Visual verifier self-test | jiti script | `pnpm test:visual-verifier` | Fixture-level sanity; a failure here means the verifier itself regressed. |
| Browser captures | Vitest Browser (Playwright) | `pnpm test:browser` | Inspect `test-screenshots/`; for golden-path issues see `app/games/voxel-realms/Game.test.tsx`. |
| Golden path | Vitest Browser (filtered) | `pnpm test:golden` | Deterministic replay failed — check realm seed, playthrough inputs. |
| Realm validation | jiti script | `pnpm realm:validate -- --sequence-count N` | Engine regression; read `realmValidation.ts` error categories. |
| Asset budget | jiti script | `pnpm build:verify-budget` | Budget exceeded — re-curate or trim (see `docs/ASSETS.md`). |
| E2E smoke | Playwright | `pnpm test:e2e:ci` | Inspect `playwright-report/`; use `playwright show-trace`. |
| Android debug build | Gradle | `cd android && ./gradlew assembleDebug` | Usually a Capacitor sync drift; run `pnpm cap:sync` locally first. |

## Current Strengths

- Deterministic engine validation is already much stronger than the average
  voxel-platformer prototype.
- Browser screenshots are wired into the acceptance path, not left as manual QA.
- Android is part of both PR CI and main-branch CD.
- The live GitHub Pages playtest harness is exercised from the same build path
  used for PR builds.

## Remaining Work In This Domain

- Add physical-device golden-path validation on Android and iOS.
- Add runtime-driven replay or agent verification against the actual rendered
  character, not only the pure-engine Yuka plan.
- Add explicit performance budgets for mobile frame time, memory, and asset load
  spikes.
- Add broader touch-control regression coverage and viewport-specific visual
  capture coverage.
- Add signed iOS/Android release validation once store credentials exist.
