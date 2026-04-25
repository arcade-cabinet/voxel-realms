---
title: Claude Code Instructions
updated: 2026-04-24
status: current
---

# Voxel Realms — Agent Instructions

## What This Is

A mobile-first voxel platforming expedition about climbing unstable,
stacked worlds before they collapse. Web is the development and playtest
harness; Android and iOS via Capacitor are the product targets.

The current slice generates deterministic 3D realm routes, validates a
golden path from spawn to exit gate, captures browser playthrough evidence,
and ships Android debug APKs + iOS archives via CD.

**Active restructure + port (2026-04-24 →, single PR)**: one branch
`feat/restructure-and-jp-port` flattens the module tree into domain
folders and ports the scene layer onto **Jolly Pixel**
(`@jolly-pixel/engine` + `@jolly-pixel/runtime` +
`@jolly-pixel/voxel.renderer`) in the same pass. See
`docs/plans/jolly-pixel-migration.prq.md` for the target layout,
hard dependency rules, and execution plan. Until that PR merges,
`main` runs the R3F scene and the old
`app/games/voxel-realms/` + `src/games/voxel-realms/` layout; after
it merges, the layout in the "Project Structure" section below is
authoritative. React stays for the DOM HUD overlay above the JP
canvas. Capacitor stays for mobile.

**Doc pillars** — each file owns exactly one area:
- `docs/DESIGN.md` — vision, product statement, creative pillars, non-goals
- `docs/RULES.md` — authoritative gameplay contract (realm lifecycle, objectives, core rules)
- `docs/ARCHITECTURE.md` — stack, directory layout, runtime flow, deterministic validation layers
- `docs/ASSETS.md` — renderer posture, raw assets, runtime promotion policy, budgets
- `docs/STATE.md` — current shipped slice + remaining work by pillar
- `docs/PRODUCTION.md` — production readiness notes
- `docs/LAUNCH_READINESS.md` — pre-public-playtest / pre-store-submit manual checklist
- `docs/RELEASE.md` — release-please / tag-and-publish runbook
- `docs/TESTING.md` — test matrix and how to run each suite
- `docs/DEPLOYMENT.md` — Pages + mobile deploy procedures
- `docs/VISUAL_REVIEW.md` — visual identity + readability checkpoints
- `docs/LORE.md` — narrative anchor for HUD copy and onboarding
- `docs/store-listing.md` — store copy + metadata draft
- `docs/ANDROID_SIGNING.md` — Android keystore + Play Console runbook
- `docs/iOS_SIGNING.md` — App Store Connect + signed IPA runbook
- `docs/CRASH_REPORTING.md` — crash-reporting SDK strategy (Sentry default)
- `docs/PRIVACY.md` — player-facing data handling posture
- `docs/SUPPORT.md` — player-facing support channels
- `docs/FEEDBACK.md` — feedback channel documentation
- `docs/QA.md` — physical-device QA rubric
- `docs/plans/` — active PRDs and gap analyses (e.g. `voxel-realms-1.0.prq.md`)

Superseded plans live in git history, not in the tree.

## Critical Rules

1. **Vertical climber, not open world.** `docs/DESIGN.md` is the
   source of truth. Do not reintroduce survival / crafting / block-placement
   mechanics unless Bok has explicitly reopened that design question.
2. **Determinism is sacred.** Realm generation, golden path, and validation
   must remain seedable and reproducible. Every gameplay change must fail
   deterministic validation before it fails visually.
3. **Mobile-first.** A feature is not done until it feels right in portrait
   on a real Android device. iOS parity follows.
4. **Docs → Tests → Code.** Document behavior, write the failing test, then
   implement. Visual manifest captures are part of the quality gate.
5. **pnpm only.** Do not create `package-lock.json` or `yarn.lock`.
6. **Biome, not ESLint.** `pnpm run lint` runs Biome.
7. **No stubs, TODOs, or `pass` bodies.** These are bugs — fix or delete.
8. **Root causes, not workarounds.** Suppressing errors is forbidden.

## Commands

```bash
pnpm install                      # Install deps
pnpm dev                          # Vite dev server (mobile-friendly, 0.0.0.0)
pnpm build                        # Production build + asset copy + runtime/budget verify
pnpm lint                         # Biome
pnpm typecheck                    # tsc --noEmit
pnpm test                         # Visual-verifier self-test + vitest (app + src) + verify-visual
pnpm test:browser                 # Vitest Browser (real Chromium via Playwright provider)
pnpm test:golden                  # Deterministic golden-path browser playthrough only
pnpm test:visual-verifier         # Verifier self-test on temp fixtures
pnpm test:coverage                # Engine coverage via v8 (runs src/ in Node, emits coverage/)
pnpm test:e2e                     # Full Playwright E2E matrix (excludes @store captures)
pnpm test:e2e:ci                  # Desktop-chromium only, CI-facing subset
pnpm test:e2e:matrix              # Desktop + iPhone 14 + iPad — nightly in CI
pnpm test:store-screenshots       # Capture landing + HUD for store listings
pnpm realm:validate               # Engine-only realm validation (default sequence count)
pnpm realm:validate -- --sequence-count 25   # Deeper drift check
pnpm realm:verify-visual          # Visual manifest SHA check
pnpm realm:assets                 # Catalog / budget snapshot
pnpm build:verify-budget          # Perf + asset-byte budget gate
pnpm cap:sync                     # Build + copy web assets to Capacitor
pnpm cap:open:android             # Open Android project
pnpm cap:open:ios                 # Open iOS project
```

## Project Structure (target — post restructure + JP port)

Every domain exports through an `index.ts` barrel. Cross-domain imports
only go through barrels — never reach into another domain's internals.

```
src/                        # game runtime (non-UI)
  world/                    # realm generation, voxel bake, sequence, signals
  engine/                   # deterministic simulation + validation
  ai/                       # yuka playthrough agent, realm agent
  assets/                   # render budget, visual manifest
  scene/                    # JP scene (runtime, actors, behaviors, tilesets)
  audio/                    # ambient music, SFX
  store/                    # Koota world + traits (bridge between scene and UI)
  platform/                 # Capacitor bootstrap, persistence, native shell
  shared/                   # event bus, cross-domain types

app/                        # React DOM overlay only (no three, no JP, no R3F)
  main.tsx                  # bootstrap: platform → JP runtime → HUD overlay
  views/                    # full-screen React views (landing, pause, game-over, realm-collapsed)
  components/               # HUD widgets (hud, first-run-coach, extraction-beat, settings, ...)
  atoms/                    # buttons, cartridge, circular-gallery, floating-joystick
  hooks/                    # use-device, use-responsive, use-container-size, use-auto-pause
  styles/                   # globals.css
  test/                     # vitest setup

public/
  assets/models/            # curated runtime catalog + static variants + manifest
  assets/fonts/brand/       # Outfit, Boldonse, Red Hat Mono
  assets/sql-wasm.wasm      # web SQLite wasm

android/, ios/              # first-class Capacitor shells (must stay buildable)
scripts/                    # asset, budget, validation, manifest tooling
e2e/                        # Playwright E2E specs
raw-assets/                 # local-only vendor dumps (gitignored)
docs/                       # doc pillars (see above)
```

Hard dependency rules:

- `src/shared/` is a leaf (imports nothing from the repo).
- `src/store/` imports `src/shared/` only.
- `src/world|engine|ai|assets/` import `src/shared/` and each other's
  barrels — never another domain's private files.
- `src/scene/` is the only place `@jolly-pixel/*` and `three` appear.
  Not React.
- `src/audio/`, `src/platform/` import `src/shared/` only.
- `app/` imports from `src/*/index.ts` barrels only — no three, no JP,
  no R3F. React reads live scene state via Koota traits in `src/store`.
- `app/main.tsx` is the only module that wires scene + UI + platform.

## Git Conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
  `perf:`, `test:`, `ci:`, `build:`. Scope is optional: `feat(hud):`,
  `fix(mobile):`, `test(realm):`.
- Feature branches off `main`. PR to `main`. Squash merge via release-please
  path. Wait for green CI. Address all review feedback.
- No direct pushes to `main`.
- No `--admin` force-merge. No `git push --force`; use `--force-with-lease`
  only on branches you own.

## Release Flow

- `ci.yml` gates PRs (typecheck / lint / unit / browser / realm:validate /
  build / android debug APK).
- `cd.yml` runs on push to `main` (release checks + Pages deploy + Android
  debug APK).
- `release.yml` runs release-please on `main`; on a release PR merge it
  produces web bundle + Android AAB + iOS xcarchive artifacts for the tag.
- release-please owns versioning via `.release-please-manifest.json`.
  **Do not hand-tag or hand-bump `package.json`.**

## Autonomy and Batch Execution

This repo is driven by `/task-batch docs/plans/voxel-realms-1.0.prq.md`
for the 1.0 push. The PRD is the source of truth for remaining pillars.
After the batch reaches its final checkpoint, re-assess the game against
the Prime Directive in the PRD — do not declare done until a first-time
player can fluently play start-to-collapse-to-next-realm.
