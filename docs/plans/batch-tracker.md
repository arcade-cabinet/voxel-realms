---
title: Voxel Realms 1.0 Batch Tracker
updated: 2026-04-23
status: current
domain: plan
---

# Voxel Realms 1.0 — Batch Tracker

Authoritative live tracker for the autonomous 1.0 batch. Committed to the
repo so it survives compactions, branch switches, and agent rehydration.

Source PRD: [voxel-realms-1.0.prq.md](./voxel-realms-1.0.prq.md).
Cold-player audit: [cold-player-audit.md](./cold-player-audit.md).

## Prime Directive (from PRD)

The batch is done when a first-time player can land on the live Pages
build, understand the goal in under 30 seconds, play fluently through
climb → scan → extract → collapse → next-realm, and the game *feels
authored* on web, Android, and iOS. Until that's true, the batch is
not done — even if every sub-task below is checked.

## Next action

Diagnose PR #16 `native-android` failure (likely rapier 2.x Android
compat after the automerged major bump) and get the rest of PR #16 green
and merged.

## Guardrails (do not violate)

- Always PR → squash-merge. Never `--force` push. Never `--admin` merge.
- Every state change ends with: commit + push + update this tracker.
- Never mark a pillar done until local full gate is green
  (`pnpm lint && pnpm typecheck && pnpm test && pnpm realm:validate -- --sequence-count 10 && pnpm test:e2e:ci && pnpm build`).
- Every merge: rebase the next branch onto main + rerun the gate.
- No stubs, TODOs, `pass` bodies, or error-suppressing `try/catch`.

## Pillar state

| # | Pillar | Status | PR | Notes |
|---|--------|--------|----|-------|
| — | Batch infrastructure | MERGED | #7 | PRD + hooks + permissions |
| 1 | Docs & CI/CD alignment | MERGED | #8 | All 13 subtasks done |
| — | Dependabot churn | MERGED | #11–#15 | Majors slipped through; rule hardened in #16 |
| 2 | Player journey & onboarding | IN REVIEW | #16 | Slice: P2.1/2.2/2.4/2.5 |
| 2b | Player journey follow-up | PENDING | — | P2.3 coach, P2.6 extract beat, P2.7 next-realm rollover, P2.8 route guidance |
| 3 | Core gameplay polish | PENDING | — | Progression, hazard vocab, archetype verbs, tuning |
| 4 | Visual identity & assets | PENDING | — | Marker→model, per-archetype lighting, perf budget |
| 5 | Mobile UX, controls, persistence | PENDING | — | Touch rework, resume flow, settings, a11y |
| 6 | Audio, haptics, splash | PENDING | — | SFX, haptics, splash polish |
| 7 | Testing breadth | PENDING | — | Perf budget, replay, manifest expansion, device matrix |
| 8 | Release ops | PENDING | — | Android signing, icons, store screenshots, v1.0 RC |
| 9 | Telemetry & playtest ops | PENDING | — | Error telemetry, crash reporting, feedback |

## In-flight queue

### PR #16 — feat(game): player journey clarity pass (pillar 2 slice)
- [x] core CI
- [x] e2e-smoke CI
- [x] CodeQL
- [ ] native-android — FAILING (diagnose; likely rapier 2.x Android compat)
- [ ] browser CI (pending at last check)
- [ ] merge once green
- [ ] rebase next branch onto main after merge

### Pillar 2b follow-up (new branch after #16 merges)
- [ ] P2.3 first-run coach
- [ ] P2.6 extraction celebration beat
- [ ] P2.7 next-realm rollover splash
- [ ] P2.8 route guidance rework (forward beacon, backtrack de-emphasis)

### Pillar 3 (can start in parallel after #16 merges)
- [ ] P3.1 progression beat — Expedition Score, persisted
- [ ] P3.2 failure recovery — retry realm w/ same seed
- [ ] P3.3 distinct archetype verbs (jungle branches, ocean bob, steampunk pulses, dinosaur broads, arctic thins)
- [ ] P3.4 hazard vocabulary (timed gap, pressure pulse, instability zone)
- [ ] P3.5 signal scan dwell + pulse feedback
- [ ] P3.6 gate arming visual 3-mode
- [ ] P3.7 movement envelope (coyote time, jump buffer, camera damping)

### Pillar 4
- [ ] P4.1 asset promotion per archetype
- [ ] P4.2 replace marker anchors with curated models
- [ ] P4.3 authored biome dressing (2–4 props/archetype)
- [ ] P4.4 per-archetype lighting + sky
- [ ] P4.5 brand polish pass (palette vars, typography)
- [ ] P4.6 perf budget per archetype (triangles, draw calls, MB)

### Pillar 5
- [ ] P5.1 touch controls rework (left-look, right-move, action thumb)
- [ ] P5.2 safe-area, orientation, status bar
- [ ] P5.3 resume flow (Resume CTA on landing)
- [ ] P5.4 settings surface (SFX, music, haptics, reduce-motion, tutorial-reset, debug-HUD)
- [ ] P5.5 pause overlay with hardware back
- [ ] P5.6 a11y sweep (aria, contrast, reduced motion)

### Pillar 6
- [ ] P6.1 SFX layer (jump/land/scan/gate/collapse/extract)
- [ ] P6.2 optional ambient music
- [ ] P6.3 haptics on native
- [ ] P6.4 splash→first-frame polish

### Pillar 7
- [ ] P7.1 perf budget test (draw calls, triangles, MB/archetype)
- [ ] P7.2 physical-device QA rubric (docs/QA.md)
- [ ] P7.3 runtime controller replay check
- [ ] P7.4 visual manifest expansion (≥12 tracked captures)
- [ ] P7.5 E2E on 3 device profiles (desktop/mobile/tablet)
- [ ] P7.6 coverage artifact

### Pillar 8
- [ ] P8.1 Android signing wiring (AAB)
- [ ] P8.2 iOS signing documentation
- [ ] P8.3 app icon + splash generation
- [ ] P8.4 store screenshots capture script
- [ ] P8.5 trailer GIF/mp4
- [ ] P8.6 privacy + support pages
- [ ] P8.7 cut v1.0.0 (or v1.0.0-rc.1)

### Pillar 9
- [ ] P9.1 opt-in error telemetry
- [ ] P9.2 native crash reporting
- [ ] P9.3 structured feedback channel
- [ ] P9.4 public playtest checklist

## Post-pillars breath-point (per PRD)

- [ ] All open PRs merged
- [ ] Full local gate green on main
- [ ] Incognito cold-player 60 s replay recorded
- [ ] Score against Prime Directive: if any no, queue next batch
- [ ] Only then: `touch .claude/state/DONE`

## Tracked incidents

- **2026-04-23**: dependabot auto-merged four major-version bumps
  (@react-three/rapier 1.5→2.2, lucide-react 0.479→1.9, @vitejs/plugin-react
  4.7→5.2, minor-and-patch group). Consequence: build budget failing on
  main, native-android failing on pillar-2 PR. Remediation: budget bumped,
  automerge rule gated on `update-type != semver-major`. Cleanup needed:
  verify or revert rapier 2.2 if native Android can't adopt it.

## Change log for this tracker

- 2026-04-23 · initial tracker created; captures pillar 1 merged,
  pillar 2 slice in flight (PR #16).
