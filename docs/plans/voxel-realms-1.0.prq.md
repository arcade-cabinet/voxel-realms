---
title: Voxel Realms 1.0 PRD
updated: 2026-04-23
status: current
domain: plan
---

# Voxel Realms — Road to 1.0

**Created**: 2026-04-23
**Version**: 1.0.0 target (currently shipping 0.2.0)
**Execution mode**: autonomous `/task-batch`
**Reference project (gold standard)**: `~/src/arcade-cabinet/mean-streets`
**Stop on failure**: `false` (keep going; log blockers, surface in PR)
**Auto-commit**: `true` (conventional commits, one PR per pillar or logical slice)

## Prime Directive

Ship Voxel Realms 1.0: a **complete, polished, end-to-end verified mobile-first voxel realm
climber** where any first-time player can land, understand the goal within seconds, climb,
scan, extract, and roll into the next realm without ambiguity — across web, Android, and
iOS — with documentation, testing, CI/CD, release ops, and store submission aligned to the
**mean-streets gold standard**.

**You are NOT done when this PRD completes.** Completion of the last task is a breath point
to: merge open PRs, review Pages, assess gaps surfaced during execution, and queue the next
batch. Until a fresh player can fluently play start-to-collapse-to-next-realm with zero
confusion and the game *feels finished*, there is always more to do. Out of work = the PRD
was insufficient; go discover the next layer.

## Non-Negotiables

- **Always use PRs.** Work on branches, push before destructive changes, merge via GitHub
  with green CI. Address ALL review feedback. Never `--admin` force-merge.
- **Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`,
  `test:`, `ci:`, `build:`. release-please owns versioning.
- **Docs → Tests → Code.** Document behavior first, write the failing test, then implement.
- **Visual verification is mandatory.** Every gameplay change captures a browser screenshot
  and a reviewer (agent or human) validates it — not just "does it render."
- **Mobile-first.** Features are not done until they feel right in portrait on a real
  Android device. iOS parity follows.
- **Determinism is sacred.** Realm generation, golden path, and validation must remain
  deterministic. Every new feature fails validation before it fails visually.
- **No stubs, TODOs, or `pass` bodies.** These are bugs. Fix or delete.
- **Root causes, not workarounds.** Suppressing errors is forbidden.

## Pillar Overview (9 pillars, priority-ordered)

| # | Pillar | Why now | Gate |
|---|--------|---------|------|
| 1 | Documentation & CI/CD alignment to mean-streets | Foundation — everything else builds on a healthy harness | `docs/` parity checklist green, `ci.yml`/`cd.yml`/`release.yml` structured like mean-streets |
| 2 | Player journey & onboarding clarity | A stranger must understand the game in <30 s from landing | Recorded cold-run browser playthrough, narrated HUD prompts, onboarding coach |
| 3 | Core gameplay polish & failure-state language | Game loop must feel authored, not procedural debug output | Extraction/collapse language, next-realm rollover, progression beat |
| 4 | Visual identity & asset curation | Replace markers; one dominant biome identity per realm with controlled intrusions | `pnpm realm:assets` report within published budget, zero marker-only objectives |
| 5 | Mobile UX, controls & persistence | Touch controls that feel right in a real thumb-reach, resume flow, settings | Physical-device golden path; resume works; settings persist |
| 6 | Audio, haptics & presentation | Game must *feel* alive; silence = prototype | SFX layer, optional music, haptic feedback on mobile, splash→first-frame authored |
| 7 | Testing: breadth & depth | Unit + integration + visual + E2E + perf thresholds | All new gates green; performance budget published; physical-device QA rubric shipped |
| 8 | Release ops: signing, store-readiness, artifacts | Must be able to cut a real v1.0 tag and have it build store-ready artifacts | Android signing wired; iOS signing doc'd; store listing draft; screenshots + trailer |
| 9 | Telemetry, crash reporting & playtest operations | Cannot run a public playtest blind | Opt-in anonymous error telemetry; crash reporting on native; feedback channel |

## Execution Order

Pillars are **roughly sequential** but many tasks within pillars run in parallel. Execution
proceeds pillar-by-pillar; tasks within a pillar can be dispatched in parallel when
dependencies permit. Each pillar ends with a **checkpoint** that produces one PR (or a few
tightly-scoped PRs) and awaits green CI before the next pillar begins.

```
Pillar 1 → 2 → 3 → (4 ‖ 5) → 6 → 7 → 8 → 9 → [breath] → re-assess → next batch
```

---

## Pillar 1 — Documentation & CI/CD Alignment (gold standard)

### 1.1 Audit mean-streets documentation structure and score voxel-realms gaps
- **Dependencies**: none
- **Files**:
  - `~/src/arcade-cabinet/mean-streets/docs/` (read-only reference)
  - `docs/` (voxel-realms)
- **Acceptance criteria**:
  - Produce `docs/plans/docs-gap-analysis.md` listing every doc file in mean-streets,
    whether voxel-realms has an equivalent, and whether the frontmatter/shape matches the
    gold standard.
  - All findings have a corrective sub-task referenced by id below.
- **Verification**: `ls docs/plans/docs-gap-analysis.md && grep -c "^- " docs/plans/docs-gap-analysis.md` returns ≥ 10 findings.

### 1.2 Align root-level markdown frontmatter
- **Dependencies**: 1.1
- **Files**: `CLAUDE.md` (create), `AGENTS.md`, `README.md`, `CHANGELOG.md`, `STANDARDS.md` (create)
- **Acceptance criteria**:
  - All five root files exist with `title`, `updated`, `status` frontmatter.
  - `CLAUDE.md` exists at repo root with project identity, critical rules, commands, structure (mirrors mean-streets shape).
  - `STANDARDS.md` exists with code quality, brand/design rules, non-negotiables.
  - `CHANGELOG.md` uses Keep a Changelog 1.1.0 format.
- **Verification**: each file's frontmatter parses; `grep -l '^title:' CLAUDE.md AGENTS.md README.md STANDARDS.md` lists all four.

### 1.3 Ensure all docs/ markdown has unified frontmatter
- **Dependencies**: 1.1
- **Files**: every `docs/*.md`
- **Acceptance criteria**:
  - Every `.md` in `docs/` has `title`, `updated`, `status`, `domain` frontmatter.
  - Stale docs are marked `status: stale` or updated.
- **Verification**: `for f in docs/*.md; do head -7 "$f" | grep -q "^title:" || echo "MISSING: $f"; done` prints nothing.

### 1.4 Create `docs/LORE.md` (creative anchor)
- **Dependencies**: none
- **Files**: `docs/LORE.md` (new)
- **Acceptance criteria**:
  - Short world statement: what the realms *are*, who the player is, what collapse *means* in-fiction. Not a RPG bible — a one-pager that anchors HUD copy and onboarding.
  - References the archetype lineup (jungle, ocean, steampunk, dinosaur, arctic) with one in-fiction sentence each.
- **Verification**: file exists, ≤ 200 lines, frontmatter valid.

### 1.5 Add `docs/store-listing.md`
- **Dependencies**: 1.4
- **Files**: `docs/store-listing.md` (new)
- **Acceptance criteria**:
  - Copy draft for Google Play + App Store: short description (≤ 80 chars), full description, feature bullets, category, content rating approach, keywords.
  - Open-questions section listing anything still pending (signing, privacy URL, etc).
- **Verification**: grep for required section headers: `Short`, `Full`, `Keywords`, `Open Questions`.

### 1.6 Rework `.github/workflows/ci.yml` to mean-streets shape
- **Dependencies**: none
- **Files**: `.github/workflows/ci.yml`
- **Acceptance criteria**:
  - `core` job: install → typecheck → lint → unit tests → realm:validate → build.
  - `browser` job: Playwright install → browser tests → upload `test-screenshots` artifact on always.
  - `e2e-smoke` job added: runs a minimal Playwright smoke spec that boots the built site and confirms landing → start → in-realm frame.
  - `native-android` job keeps APK debug build; uploads artifact to PR.
  - All action SHAs pinned to current versions.
- **Verification**: `pnpm exec -- actionlint .github/workflows/ci.yml` (install actionlint via `brew install actionlint`); CI runs green on the PR that introduces it.

### 1.7 Add Playwright smoke E2E harness
- **Dependencies**: 1.6
- **Files**:
  - `playwright.config.ts` (new)
  - `e2e/smoke.spec.ts` (new)
  - `e2e/journey.spec.ts` (new — cold player journey)
  - `package.json` (add `test:e2e`, `test:e2e:ci` scripts)
- **Acceptance criteria**:
  - `pnpm test:e2e:ci` runs a headless Playwright suite against `pnpm preview` or a built `dist`.
  - Smoke spec asserts landing loads, start button works, realm canvas mounts, HUD renders.
  - Journey spec asserts an onboarding flow leads the player from first paint → scan → extract without relying on a prior mouse-look click.
- **Verification**: `pnpm test:e2e:ci` exits 0 locally.

### 1.8 Rework `.github/workflows/cd.yml` to mean-streets shape
- **Dependencies**: 1.6, 1.7
- **Files**: `.github/workflows/cd.yml`
- **Acceptance criteria**:
  - `release-checks` job: typecheck → lint → E2E smoke (not just golden).
  - `deploy-pages` job keeps current Pages deploy with basepath fix.
  - `deploy-android-debug` unchanged.
  - Balance-style smoke job added as `continue-on-error: true` that runs `pnpm realm:validate -- --sequence-count 25` for drift detection.
- **Verification**: CD green on main.

### 1.9 Rework `.github/workflows/release.yml` to mean-streets shape
- **Dependencies**: 1.6
- **Files**: `.github/workflows/release.yml`
- **Acceptance criteria**:
  - `release-please` job unchanged.
  - `web-artifact`, `android` (AAB), `ios` (unsigned xcarchive) jobs mirror mean-streets structure with SHA-pinned actions.
  - Artifact names follow `voxel-realms-<platform>-<tag>` pattern.
- **Verification**: `gh workflow view release.yml` completes; dry-run via workflow_dispatch to main succeeds (artifact paths resolve even without signing).

### 1.10 Add `.github/workflows/automerge.yml`
- **Dependencies**: 1.6
- **Files**: `.github/workflows/automerge.yml` (new)
- **Acceptance criteria**:
  - Automerges dependabot minor/patch PRs after CI green.
  - Automerges release-please PRs after CI green.
- **Verification**: workflow validates; dependabot PRs merge without human intervention.

### 1.11 Add `.github/dependabot.yml`
- **Dependencies**: none
- **Files**: `.github/dependabot.yml`
- **Acceptance criteria**:
  - Weekly npm + github-actions + gradle ecosystems.
  - Minor/patch grouped; major separate.
- **Verification**: `gh api /repos/:owner/:repo/dependabot/alerts` reachable; config validates.

### 1.12 Add `docs/TESTING.md` updates for new suites
- **Dependencies**: 1.7
- **Files**: `docs/TESTING.md`
- **Acceptance criteria**:
  - Documents unit (vitest node), component/browser (vitest browser), E2E (Playwright), realm validation, golden capture, visual manifest, asset budget layers.
  - Each layer has a "how to run" and a "when it fails what to do" block.
- **Verification**: grep for all layer names present.

### 1.13 Add `.github/copilot-instructions.md` and refresh `.cursor/rules`
- **Dependencies**: 1.2
- **Files**: `.github/copilot-instructions.md` (new), `.cursor/rules` (new)
- **Acceptance criteria**: both reference CLAUDE.md / AGENTS.md; no content duplication.
- **Verification**: `grep -c "CLAUDE.md\|AGENTS.md" .github/copilot-instructions.md` ≥ 1.

### **Pillar 1 Checkpoint**
- Open PR **"chore(docs+ci): align to mean-streets gold standard"**.
- Green CI; Pages still deploys; release.yml still produces artifacts on next release.
- Docs gap analysis closed or referenced as follow-up tasks.

---

## Pillar 2 — Player Journey & Onboarding Clarity

### 2.1 Cold-player UX audit
- **Dependencies**: Pillar 1
- **Files**: `docs/plans/cold-player-audit.md` (new)
- **Acceptance criteria**:
  - Run the live Pages site in an incognito window, screenshot every 2 seconds for the first 60 s.
  - Annotate: *what does the player see? what do they think they should do? what do they actually do?*
  - Identify every moment of ambiguity (unclear goal, HUD noise, missing affordance, unclear input, unclear next realm trigger).
  - Attach screenshots to `test-screenshots/cold-audit/`.
- **Verification**: audit file lists ≥ 8 ambiguity moments, each with a corrective task id referenced below.

### 2.2 Landing page as a product
- **Dependencies**: 2.1
- **Files**:
  - `app/games/voxel-realms/ui/RealmLanding.tsx`
  - `app/shared/styles/globals.css`
- **Acceptance criteria**:
  - Hero line (one sentence: what you *do*), a 3-beat explainer ("Climb. Scan. Extract."), a Start primary CTA, and an "How to play" secondary expandable.
  - Looks authored on mobile portrait (safe-area aware, no horizontal scroll, touch-target ≥ 48px).
  - Shows the current realm archetype preview (optional: first archetype in sequence).
- **Verification**: Playwright E2E asserts hero, CTA, explainer present; visual capture shows no debug chrome.

### 2.3 First-run coach / tutorial layer
- **Dependencies**: 2.2
- **Files**:
  - `app/games/voxel-realms/ui/FirstRunCoach.tsx` (new)
  - `app/shared/platform/persistence/` (read/write "has-played" flag)
- **Acceptance criteria**:
  - On first real run, a 3-step coach fires in-scene: (1) "Move toward the glowing beacon" (2) "Scan the anomaly" (3) "Reach the exit gate before the timer collapses".
  - Dismissible; persists `hasPlayed=true`; does not fire again unless reset.
  - Uses authored copy from `docs/LORE.md`, not programmer text.
- **Verification**: E2E "first-run" spec asserts coach appears; "second-run" spec asserts it does not.

### 2.4 HUD copy & readability pass
- **Dependencies**: 2.1
- **Files**: `app/games/voxel-realms/ui/HUD.tsx`
- **Acceptance criteria**:
  - Every HUD element has authored copy (no identifiers like "agentPathIndex" showing).
  - Objective line explains the *current* step in plain language ("Find the next anomaly" not "anomaly=2/3").
  - Collapse timer is visually distinct and reads in under 1 glance.
  - Gate state has 3 readable modes: LOCKED, ARMED (hint), OPEN.
- **Verification**: browser capture diff shows no debug text; Playwright asserts readable strings.

### 2.5 Failure-state language — "collapse" not "YOU DIED"
- **Dependencies**: 2.4
- **Files**:
  - `app/games/voxel-realms/Game.tsx` (replace GameOverScreen text)
  - `app/shared/ui/GameOverScreen.tsx` or equivalent
- **Acceptance criteria**:
  - Game-over is called "REALM COLLAPSED" (or LORE-approved phrase).
  - Shows: realm archetype, signals scanned, next realm preview, "Continue Expedition" CTA.
  - Does *not* read like a generic death screen.
- **Verification**: E2E forces a collapse and asserts expected copy.

### 2.6 Extraction celebration beat
- **Dependencies**: 2.4
- **Files**:
  - `app/games/voxel-realms/ui/ExtractionBeat.tsx` (new)
- **Acceptance criteria**:
  - On successful extraction, a short 1–2 s beat plays: sigil/sfx/brief dim, then reveals expedition survey + next realm CTA.
  - Deterministic (no randomness that breaks golden captures).
- **Verification**: golden capture updated to include the beat; Playwright asserts beat renders.

### 2.7 Next-realm rollover polish
- **Dependencies**: 2.6
- **Files**: `app/games/voxel-realms/Game.tsx`, `src/games/voxel-realms/engine/realmSequence.ts`
- **Acceptance criteria**:
  - Between realms, the player sees the upcoming archetype title + one-line teaser ("Arctic: thin ledges, hard wind").
  - Tapping "Continue" mounts the new realm; state clean; no prior-realm scene artifacts.
- **Verification**: `realmSequence.test.ts` extended; E2E asserts full rollover.

### 2.8 Route guidance rework
- **Dependencies**: 2.4
- **Files**:
  - `src/games/voxel-realms/engine/realmRouteGuidance.ts`
  - `app/games/voxel-realms/r3f/RealmClimbRoute.tsx`
- **Acceptance criteria**:
  - A *readable* forward beacon always visible (not overwhelming).
  - Backtracking is permitted but de-emphasized.
  - Next-step indicator updates smoothly with player position, not on step boundaries.
- **Verification**: unit tests for guidance transitions; browser capture of mid-climb frame shows one dominant beacon.

### **Pillar 2 Checkpoint**
- PR **"feat(game): player journey and onboarding clarity"**.
- Recorded 60-second cold-player replay shared as a Pages preview or artifact.
- A non-playing human reviewer (or stand-in agent) can describe the loop after the replay.

---

## Pillar 3 — Core Gameplay Polish & Failure-State Language

### 3.1 Progression beat: first real reward
- **Dependencies**: Pillar 2
- **Files**:
  - `src/games/voxel-realms/engine/progression.ts` (new)
  - `src/games/voxel-realms/engine/progression.test.ts` (new)
  - `app/games/voxel-realms/ui/ExpeditionSurvey.tsx` (new or extend existing summary)
- **Acceptance criteria**:
  - A simple meta layer: "Expedition Score" = signals × multiplier + realm-complete bonuses − collapse penalty.
  - Per-run persisted to SQLite; shown on landing as "best expedition" + "last expedition".
  - Deterministic given the same seed + player inputs.
- **Verification**: unit tests; E2E asserts survey card updates after a run.

### 3.2 Failure recovery loop
- **Dependencies**: 3.1
- **Files**: `app/games/voxel-realms/Game.tsx`, `app/games/voxel-realms/ui/RealmCollapsed.tsx` (new)
- **Acceptance criteria**:
  - After collapse: "Retry this realm (same seed)" OR "Next realm".
  - Retry preserves determinism: same seed → identical realm.
  - Abandoning a realm counts as collapsed in expedition history.
- **Verification**: unit test for seed stability across retry; E2E flow.

### 3.3 Deepen archetype rules — distinct movement verbs
- **Dependencies**: 2.8
- **Files**: `src/games/voxel-realms/engine/realmClimber.ts` and archetype-specific sub-generators
- **Acceptance criteria**:
  - Jungle: branch routes (two-path choices, merge at signal).
  - Ocean: floating platforms with mild bob (cosmetic, not stochastic for validation).
  - Steampunk: moving pressure hazards on a deterministic tick.
  - Dinosaur: wider platforms, longer jump envelope.
  - Arctic: thinner ledges, reduced landing margin.
  - Each variant passes `realm:validate --sequence-count 25` for its archetype.
- **Verification**: per-archetype unit tests; `pnpm realm:validate -- --sequence-count 25 --archetype=<name>` green.

### 3.4 Hazard vocabulary expansion
- **Dependencies**: 3.3
- **Files**: `src/games/voxel-realms/engine/realmClimber.ts`, `src/games/voxel-realms/engine/hazards.ts` (new)
- **Acceptance criteria**:
  - At least 3 hazard verbs: timed gap, pressure pulse, instability zone.
  - Each hazard has a deterministic visual tell ≥ 0.5 s before danger.
  - All hazards pass pathfinding + framing validation.
- **Verification**: unit tests per hazard; golden capture includes each.

### 3.5 Signal scan feedback
- **Dependencies**: 2.4
- **Files**:
  - `app/games/voxel-realms/r3f/AnomalySignal.tsx` (new or extend)
  - `src/games/voxel-realms/engine/realmSignals.ts`
- **Acceptance criteria**:
  - Visible scan progress while near an anomaly (radial fill).
  - Completed scan triggers a short pulse + log entry.
  - Scan progress does not trigger on casual pass-by: requires ≥ 0.8 s dwell or explicit interaction.
- **Verification**: unit test for dwell threshold; browser capture shows pulse.

### 3.6 Gate arming communication
- **Dependencies**: 3.5
- **Files**: `src/games/voxel-realms/engine/realmExitGate.ts`, `app/games/voxel-realms/r3f/ExitGate.tsx`
- **Acceptance criteria**:
  - Gate visibly transitions LOCKED → ARMED → OPEN tied to scan count.
  - HUD mirrors the gate state.
  - Arming does not happen silently.
- **Verification**: unit test for transitions; visual capture per state.

### 3.7 Movement envelope tuning
- **Dependencies**: Pillar 2
- **Files**: `app/games/voxel-realms/r3f/Player.tsx`
- **Acceptance criteria**:
  - Coyote time (~100 ms) on ledges.
  - Jump buffer (~120 ms) before ground contact.
  - Camera damping that doesn't lag player on fast turns.
  - Configurable per-platform so mobile doesn't lose responsiveness to PC idle-smoothing.
- **Verification**: unit tests for timings (or deterministic sim tests); manual verification reported in PR.

### **Pillar 3 Checkpoint**
- PR **"feat(game): progression, hazard vocabulary, archetype verbs, tuning"**.
- `realm:validate --sequence-count 50` green.
- Golden captures refreshed.

---

## Pillar 4 — Visual Identity & Asset Curation

### 4.1 Asset promotion pass per archetype
- **Dependencies**: Pillar 1
- **Files**:
  - `public/assets/models/manifest.json`
  - `scripts/report-realm-assets.ts`
  - `src/games/voxel-realms/engine/realmAssetBudget.ts`
- **Acceptance criteria**:
  - Every archetype promotes at least 3 runtime models from its safe/deferred tier.
  - Deferred character anchors get static variants.
  - `pnpm realm:assets` reports 0 reference-only anchors on objective-critical anomalies.
- **Verification**: `pnpm realm:assets` output committed to `docs/plans/asset-report.md`.

### 4.2 Replace all marker-only anchor anomalies with curated models
- **Dependencies**: 4.1
- **Files**: `app/games/voxel-realms/r3f/RealmClimbRoute.tsx`, per-archetype anchor config
- **Acceptance criteria**:
  - No objective-critical anomaly renders as a placeholder cube.
  - Every biome has a distinct anchor asset.
- **Verification**: browser capture per archetype; unit test asserts anchor kind=model, not marker.

### 4.3 Biome set authored dressing
- **Dependencies**: 4.1
- **Files**:
  - `app/games/voxel-realms/r3f/SpawnCamp.tsx`
  - `app/games/voxel-realms/r3f/World.tsx`
  - New archetype-specific dressing components
- **Acceptance criteria**:
  - Each archetype has a small authored dressing set (2–4 non-gameplay props) that sells biome identity.
  - All dressing respects the active-model budget.
- **Verification**: captures per archetype; budget report unchanged.

### 4.4 Lighting + sky per archetype
- **Dependencies**: 4.3
- **Files**: `app/games/voxel-realms/r3f/World.tsx`, `app/games/voxel-realms/r3f/SkyBackdrop.tsx` (new)
- **Acceptance criteria**:
  - Jungle = warm/golden; Ocean = cool/blue; Steampunk = sodium/amber; Dinosaur = dusky/green; Arctic = high-key white/blue.
  - Lighting is deterministic (no per-frame jitter).
- **Verification**: captures diffed across archetypes show clearly distinct palettes.

### 4.5 Brand polish pass on landing + HUD
- **Dependencies**: 2.2
- **Files**: `app/shared/styles/globals.css`, `app/games/voxel-realms/ui/*`
- **Acceptance criteria**:
  - Brand fonts (Outfit, Boldonse, Red Hat Mono) used consistently.
  - Logo/wordmark present on landing and game-over screens.
  - No raw `#ffffff` debug contrast; a coherent palette lives in one CSS var block.
- **Verification**: captures + manual; `rg '#[0-9a-fA-F]{3,6}' app/shared/styles app/games/voxel-realms/ui | wc -l` ≤ authored palette size × 2.

### 4.6 Performance budget per archetype
- **Dependencies**: 4.3, 4.4
- **Files**: `scripts/verify-build-budget.ts`
- **Acceptance criteria**:
  - Budget enforces a max triangle count, max draw calls, and max runtime MB per archetype.
  - Build fails if exceeded.
- **Verification**: `pnpm build:verify-budget` exits 0 under budget; fails on synthetic over-budget.

### **Pillar 4 Checkpoint**
- PR **"feat(assets): per-archetype visual identity and curated runtime models"**.
- `docs/ASSETS.md` updated with new catalog snapshot.

---

## Pillar 5 — Mobile UX, Controls & Persistence

### 5.1 Touch controls rework
- **Dependencies**: Pillar 2
- **Files**:
  - `app/shared/ui/FloatingJoystick.tsx` / tests
  - `app/games/voxel-realms/r3f/Player.tsx`
- **Acceptance criteria**:
  - Left-half drag = look. Right-half thumb = move. Action button (jump/interact) in thumb reach.
  - Touch targets ≥ 56 px.
  - No accidental look-jerk on scroll/refresh gestures.
  - Works in portrait on a 390×844 CSS-px device (iPhone 14).
- **Verification**: `FloatingJoystick.test.tsx` extended; Playwright mobile emulation E2E passes.

### 5.2 Safe-area, orientation, status bar
- **Dependencies**: 5.1
- **Files**: `capacitor.config.ts`, `app/shared/platform/nativeShell.ts`, `app/shared/styles/globals.css`
- **Acceptance criteria**:
  - HUD respects `env(safe-area-inset-*)`.
  - App locks to portrait (or explicitly supports landscape if authored).
  - Status bar color matches brand; no content under notch.
- **Verification**: iOS + Android debug APK screenshots; visual manifest entry.

### 5.3 Resume flow
- **Dependencies**: Pillar 3.1 (progression)
- **Files**:
  - `app/shared/platform/persistence/activeRun.ts` (new)
  - `app/games/voxel-realms/Game.tsx`
- **Acceptance criteria**:
  - Kill → reopen preserves current realm + scan progress + score.
  - "Resume" button appears on landing when an active run exists.
  - "Abandon" clears state with confirmation.
- **Verification**: E2E kill-relaunch flow (web: reload; native: manual QA + unit tests on wrapper).

### 5.4 Settings surface
- **Dependencies**: 5.2
- **Files**: `app/games/voxel-realms/ui/SettingsScreen.tsx` (new)
- **Acceptance criteria**:
  - Toggles: SFX, music, haptics (mobile), reduce-motion, tutorial-reset, debug-HUD.
  - Persisted via `@capacitor/preferences`.
  - Accessible from landing and pause overlay.
- **Verification**: unit tests; E2E toggle survives reload.

### 5.5 Pause overlay
- **Dependencies**: 5.4
- **Files**: `app/games/voxel-realms/ui/PauseOverlay.tsx` (new)
- **Acceptance criteria**:
  - Mobile back button / hardware button triggers pause (via Capacitor app plugin).
  - Pause offers: Resume, Restart realm, Settings, Abandon expedition.
- **Verification**: unit test; Android back-button test reported in PR.

### 5.6 Accessibility sweep
- **Dependencies**: 5.4
- **Files**: HUD, landing, settings, game-over components
- **Acceptance criteria**:
  - Aria labels on all interactive elements.
  - Color contrast ≥ WCAG AA for text.
  - `prefers-reduced-motion` dampens celebration beats, camera damping, screen shake.
- **Verification**: `pnpm exec pa11y` or axe integration; Playwright a11y spec green.

### **Pillar 5 Checkpoint**
- PR **"feat(mobile): controls, persistence, resume, settings, accessibility"**.
- Android debug APK tested on one physical device (documented in PR).

---

## Pillar 6 — Audio, Haptics & Presentation

### 6.1 SFX layer (Tone.js or howler)
- **Dependencies**: Pillar 5.4
- **Files**: `app/shared/audio/sfx.ts` (new), `app/shared/audio/sfx.test.ts` (new)
- **Acceptance criteria**:
  - Procedural or sampled sfx for: jump, land, scan-start, scan-complete, gate-arm, gate-open, collapse, extract.
  - Respects settings toggle.
  - No autoplay before user gesture.
- **Verification**: unit tests assert triggers; E2E asserts no "autoplay blocked" console error on landing.

### 6.2 Optional ambient music
- **Dependencies**: 6.1
- **Files**: `app/shared/audio/music.ts` (new); any licensed or procedural ambient track
- **Acceptance criteria**:
  - Looping ambient per archetype (or one shared).
  - Volume control, respects settings.
  - No uncompressed WAVs in repo; use OGG.
- **Verification**: budget not broken; settings toggle works.

### 6.3 Haptics on native
- **Dependencies**: 6.1
- **Files**: `app/shared/platform/haptics.ts` (new)
- **Acceptance criteria**:
  - Light haptic on jump-land, medium on scan-complete, heavy on collapse.
  - Gated by setting and platform availability.
- **Verification**: unit tests; native QA confirmation in PR.

### 6.4 Splash → first-frame polish
- **Dependencies**: Pillar 5.2
- **Files**: `capacitor.config.ts`, brand splash image generation
- **Acceptance criteria**:
  - Splash uses brand palette; transitions to landing without a flash of white.
  - First interactive frame ≤ 2 s on a mid-tier Android.
- **Verification**: recorded boot clip in PR.

### **Pillar 6 Checkpoint**
- PR **"feat(presentation): audio, haptics, splash polish"**.

---

## Pillar 7 — Testing: Breadth & Depth

### 7.1 Performance budget test
- **Dependencies**: Pillar 4.6
- **Files**: `src/games/voxel-realms/engine/performance.test.ts` (new)
- **Acceptance criteria**:
  - Deterministic sim harness counts draw calls, triangle count, and active model bytes per archetype.
  - Fails CI on regression > 10 % from baseline.
- **Verification**: test runs in <5 s; baselines committed.

### 7.2 Physical-device QA rubric
- **Dependencies**: Pillar 5
- **Files**: `docs/QA.md` (new) or extend `docs/LAUNCH_READINESS.md`
- **Acceptance criteria**:
  - A 30–45 minute scripted QA pass for Android + iOS covering cold-open, golden path, collapse, retry, resume, settings, orientation, notch.
- **Verification**: file exists; ≥ 20 check items.

### 7.3 Runtime controller replay check
- **Dependencies**: 3.7
- **Files**: `src/games/voxel-realms/engine/replay.ts` (new), `replay.test.ts`
- **Acceptance criteria**:
  - Record input stream; replay produces identical HUD state.
  - Covers golden path per archetype.
- **Verification**: tests green.

### 7.4 Visual-manifest expansion
- **Dependencies**: Pillar 4
- **Files**: `scripts/verify-visual-manifest.ts`, `app/games/voxel-realms/Game.test.tsx`
- **Acceptance criteria**:
  - Manifest covers: landing, first-run coach step 1–3, per-archetype mid-climb, scan-pulse, gate-open, extraction-beat, collapse, next-realm splash.
  - ≥ 12 tracked captures.
- **Verification**: manifest entries + SHA stable; `pnpm realm:verify-visual` green.

### 7.5 E2E on 3 device profiles
- **Dependencies**: Pillar 1.7
- **Files**: `playwright.config.ts`
- **Acceptance criteria**:
  - Playwright projects: desktop (1280×800), mobile-portrait (390×844), tablet-portrait (820×1180).
  - Core smoke + journey spec runs on each.
- **Verification**: `pnpm test:e2e:ci` runs all projects; CD runs all.

### 7.6 Coverage reporting (not as a gate, as a signal)
- **Dependencies**: Pillar 1.6
- **Files**: `vitest.config.ts`
- **Acceptance criteria**:
  - Coverage output committed in CI as an artifact.
  - Engine modules ≥ 80 % line coverage.
- **Verification**: coverage artifact uploaded on CI.

### **Pillar 7 Checkpoint**
- PR **"test: performance budget, replay, visual manifest breadth, device matrix"**.

---

## Pillar 8 — Release Ops: Signing, Store-Readiness, Artifacts

### 8.1 Android signing wiring
- **Dependencies**: Pillar 1.9
- **Files**: `android/app/build.gradle*`, `docs/RELEASE.md`
- **Acceptance criteria**:
  - `release.yml` decodes `ANDROID_KEYSTORE_BASE64` when present and signs AAB.
  - Debug remains keystore-free.
  - `docs/RELEASE.md` documents how to rotate the keystore + where secrets live.
- **Verification**: workflow dry-run produces a signed AAB when secrets are set (tested in staging secret or on a throwaway keystore).

### 8.2 iOS signing documentation
- **Dependencies**: 8.1
- **Files**: `docs/RELEASE.md`
- **Acceptance criteria**:
  - Stepwise doc: App Store Connect, provisioning profiles, fastlane match or manual certs, archive path.
  - Flags the current unsigned-archive behavior and what changes when secrets land.
- **Verification**: doc present; checklist runnable.

### 8.3 App icon + splash icon generation
- **Dependencies**: Pillar 4.5
- **Files**: `scripts/generate-mobile-icons.sh` (new, adapt from mean-streets), `resources/` or `public/brand/`
- **Acceptance criteria**:
  - Single command generates every Android density + every iOS size.
  - Icons committed under Capacitor's expected paths.
- **Verification**: `ls android/app/src/main/res/mipmap-*/ic_launcher*.png` shows all densities; `ls ios/App/App/Assets.xcassets/AppIcon.appiconset` complete.

### 8.4 Store screenshots capture script
- **Dependencies**: Pillar 4, Pillar 5
- **Files**: `scripts/capture-store-screenshots.mjs` (new), `docs/store-listing.md`
- **Acceptance criteria**:
  - Automated capture of canonical screens in store-required sizes.
  - Output committed under `store-assets/` or uploaded as workflow artifact.
- **Verification**: command produces expected count of PNGs.

### 8.5 Trailer/GIF asset
- **Dependencies**: 8.4
- **Files**: `store-assets/trailer.gif` or `.mp4`
- **Acceptance criteria**:
  - A 15–30 s recorded golden-path sequence that communicates the game in one watch.
- **Verification**: file exists, size ≤ store max, plays.

### 8.6 Privacy policy & support URL
- **Dependencies**: 8.4
- **Files**: `docs/PRIVACY.md` (new), `docs/SUPPORT.md` (new)
- **Acceptance criteria**:
  - Privacy policy covers telemetry (pillar 9), crash reporting, any 3rd-party SDKs.
  - Support URL + contact live on a reachable page (GitHub pages or issue tracker link).
- **Verification**: both URLs 200.

### 8.7 Cut v1.0.0 release candidate
- **Dependencies**: All prior pillars
- **Files**: `.release-please-manifest.json`, `CHANGELOG.md` (via release-please)
- **Acceptance criteria**:
  - Release-please PR bumps to 1.0.0 (or 1.0.0-rc.1 if any gate is yellow).
  - Android AAB + iOS unsigned archive + web bundle produced.
  - All docs reference the real v1.0.0 tag.
- **Verification**: `gh release view v1.0.0` shows artifacts.

### **Pillar 8 Checkpoint**
- PR **"release: store-readiness, signing, 1.0 RC"**.

---

## Pillar 9 — Telemetry, Crash Reporting & Playtest Operations

### 9.1 Opt-in anonymous error telemetry
- **Dependencies**: Pillar 5.4
- **Files**: `app/shared/telemetry/errors.ts` (new), tests
- **Acceptance criteria**:
  - Catches uncaught errors + rejections; reports to a minimal endpoint (or local-only ring buffer if no endpoint).
  - Off by default; opt-in via settings.
  - Privacy policy mentions it.
- **Verification**: unit tests for redaction + opt-out.

### 9.2 Native crash reporting
- **Dependencies**: 9.1
- **Files**: Capacitor plugin config or `@capacitor-community/firebase-crashlytics` (if adopted)
- **Acceptance criteria**:
  - Native crashes captured on Android (iOS if signing lets us ship).
  - Opt-in + documented.
- **Verification**: forced crash reaches dashboard or local log.

### 9.3 Structured feedback channel
- **Dependencies**: Pillar 8.6
- **Files**: `docs/FEEDBACK.md` (new), in-app link
- **Acceptance criteria**:
  - "Report feedback" link on pause overlay.
  - Goes to GitHub issues (templated) or a survey.
- **Verification**: link resolves.

### 9.4 Public playtest checklist
- **Dependencies**: 9.1, 9.2
- **Files**: `docs/LAUNCH_READINESS.md` updates
- **Acceptance criteria**:
  - Playtest section lists: telemetry on (test), Pages deployed, Android debug APK artifact fresh, iOS archive fresh, store listing draft reviewed.
- **Verification**: checklist complete.

### **Pillar 9 Checkpoint**
- PR **"feat(ops): telemetry, crash reporting, playtest operations"**.

---

## Breath Point — Assessment Protocol

When all pillars complete, **do not declare done**. Instead:

1. **Merge open PRs** — address every review comment first.
2. **Run the full local gate**:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm test:browser && \
     pnpm test:golden && pnpm test:e2e:ci && \
     pnpm realm:validate -- --sequence-count 50 && \
     pnpm build && pnpm run cap:sync
   ```
3. **Visit the live Pages build** as an incognito user. Record a 60 s cold replay. Does it
   read fluently? If not, log every moment of confusion as new tasks.
4. **Check the open-issues list**: `gh issue list`. Any high-priority?
5. **Re-score the game against the Prime Directive**:
   - Can a first-time player understand the goal in <30 s?
   - Does the game feel authored, not procedural?
   - Does it run well on a real phone?
   - Is there a retention reason to play again?
6. If any answer is "no", the next batch is **whatever makes that "yes"**. Queue it with
   `/create-task-batch` and execute with `/task-batch`.

## Risks & Watchpoints

- **Asset budget drift**: every pillar 3–4 change must re-run `pnpm realm:assets` and update the snapshot doc.
- **Determinism regressions**: any visual or gameplay change must re-capture golden frames and pass visual manifest verification.
- **Mobile-first slippage**: it is very easy to design on desktop and call it done; flag every pillar-5 task that was only verified on desktop.
- **Scope creep on progression**: keep the meta layer thin. The core loop is the climb, not a metagame.
- **Magic MCP credits**: out — use only for *inspiration*, not generation. Fall back to hand-built components.

## Commit & PR Hygiene

- Every task → one or more conventional commits.
- Every pillar → one PR (or a small fan of tightly-scoped PRs).
- PR body uses the mean-streets format: Summary (bullets), Test plan (checklist).
- Wait for CI green. Address all review feedback. Squash-merge via release-please path.

## Final Definition of Done (for the batch, not for the game)

- All 9 pillar checkpoints merged.
- `v1.0.0` (or `v1.0.0-rc.1`) cut by release-please.
- Pages deploying v1.0 bundle.
- Android AAB + iOS xcarchive + web bundle artifacts present on the release.
- `docs/LAUNCH_READINESS.md` completed (or pending items have owner + ticket).
- Cold-player replay recorded and reviewed; outstanding confusions logged as the next batch.
