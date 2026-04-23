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
- `native-android`: web build, `cap sync android`, and debug APK build.

### Main-Branch CD

`cd.yml` currently runs:

- `release-checks`: typecheck, lint, realm validation, and golden-path browser
  capture.
- `deploy-pages`: build and deploy the static harness to GitHub Pages.
- `deploy-android-debug`: build and upload the Android debug APK artifact.

### Release Workflow

`release.yml` currently runs on release-please tags and produces:

- web artifact
- Android AAB
- iOS unsigned archive

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
