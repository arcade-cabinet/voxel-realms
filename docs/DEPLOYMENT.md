---
title: Deployment
updated: 2026-04-23
status: current
domain: ops
---

# Deployment

This document owns CI/CD behavior, deployment targets, artifact outputs, and
operational expectations. Release tagging details live in [RELEASE.md](./RELEASE.md).

## Targets

- Web playtest harness: GitHub Pages
- Android continuous artifact: debug APK on every `main` push
- Release web artifact: tagged `dist` bundle
- Release Android artifact: tagged AAB
- Release iOS artifact: tagged unsigned archive

## Current Live Surface

GitHub Pages is enabled for workflow deployment and currently serves:

- [https://arcade-cabinet.github.io/voxel-realms/](https://arcade-cabinet.github.io/voxel-realms/)

## Workflow Map

### `ci.yml`

Runs on pull requests and guards:

- type safety
- lint
- deterministic realm validation
- build budget
- browser capture flow
- Android debug build

### `cd.yml`

Runs on `push` to `main` and on manual dispatch.

Jobs:

- `release-checks`
- `deploy-pages`
- `deploy-android-debug`

Important detail: the Pages artifact name now includes
`${{ github.run_id }}-${{ github.run_attempt }}`. That makes failed Pages jobs
rerunnable without colliding with a previous `github-pages` artifact in the same
workflow run.

### `release.yml`

Runs on `main` and `workflow_dispatch`. When release-please cuts a release, it
builds tagged web, Android, and iOS artifacts.

### `automerge.yml`

Handles dependabot and release-please PR approvals plus squash auto-merge.

## Secrets And Permissions

Current workflow requirements:

- `CI_GITHUB_TOKEN` for release-please
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Future iOS signing/distribution secrets are still open — see
[iOS_SIGNING.md](./iOS_SIGNING.md) for the required App Store Connect
setup, certificate and profile management, and the `release.yml`
changes needed to produce a signed IPA.

## Operator Notes

- Use `workflow_dispatch` on `cd.yml` when the deploy path itself needs a clean
  rerun without a new commit.
- Pages deploys should be treated as part of the product surface, not just a
  preview.
- Android debug APK upload is a playtest artifact, not a store-release build.

## Remaining Work In This Domain

- Add store-signed Android release configuration through repository secrets.
- Add iOS signing, notarization, and distribution behavior beyond unsigned
  archives.
- Decide whether Pages keeps the default GitHub URL or moves to a branded
  domain.
- Add crash reporting and runtime telemetry to deployed builds.
- Add a documented playtest distribution path for Android builds outside of the
  GitHub Actions artifacts tab.
