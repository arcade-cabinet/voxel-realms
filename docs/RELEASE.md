---
title: Release
updated: 2026-04-23
status: current
domain: release
---

# Release

This document owns how Voxel Realms turns merged `main` changes into tagged
artifacts.

## Release Flow

1. Merge work into `main` using squash merges.
2. `release.yml` runs on `main`.
3. `release-please` watches conventional commits and opens or updates a release
   PR.
4. When the release PR is merged, release-please creates the Git tag and release
   metadata.
5. The tagged workflow builds the release artifacts.

## Conventional Commit Effect

`release-please-config.json` currently maps these visible changelog sections:

- `feat` -> Features
- `fix` -> Bug Fixes
- `perf` -> Performance
- `refactor` -> Refactoring
- `docs` -> Documentation

That means documentation-only merges are still intentionally visible in the
changelog.

## Release Artifacts

When a release is cut, the workflow produces:

- `voxel-realms-web-<tag>`
- `voxel-realms-android-<tag>`
- `voxel-realms-ios-<tag>`

Current behavior:

- web artifact: fully built static harness
- Android artifact: signed AAB if signing secrets exist, otherwise debug AAB
- iOS artifact: unsigned archive built via `xcodebuild`

## Manual Dispatch

`release.yml` supports `workflow_dispatch` with an optional `ref`. Use that for
manual artifact builds when you need to validate a specific branch or tag.

## What "Done" Means For A Release

A release is not complete when a tag exists. It is complete when:

- the release-please PR is merged
- the tag workflow is green
- the web artifact exists
- the Android artifact exists
- the iOS archive exists
- any store-facing follow-up for that build is recorded in
  [PRODUCTION.md](./PRODUCTION.md)

## Remaining Work In This Domain

- Decide whether documentation-only changes should always cut release-please
  activity or be grouped into later product releases.
- Add a stronger operator runbook for validating tagged artifacts before external
  distribution.
- Add signed iOS delivery once App Store credentials and code-signing policy are
  in place.
