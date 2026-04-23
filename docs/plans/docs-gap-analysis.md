---
title: Docs Gap Analysis — voxel-realms vs mean-streets
updated: 2026-04-23
status: current
domain: plan
---

# Docs Gap Analysis

Reference: `~/src/arcade-cabinet/mean-streets` (gold standard).
Target: `~/src/arcade-cabinet/voxel-realms`.

This is the concrete finding set that drives Pillar 1 sub-tasks in
`docs/plans/voxel-realms-1.0.prq.md`.

## Root-level markdown

| File | mean-streets | voxel-realms | Status | Corrective task |
| --- | --- | --- | --- | --- |
| `CLAUDE.md` | present (12 KB, frontmatter, agent identity) | **missing** | GAP | P1.2 |
| `AGENTS.md` | present | present | OK | P1.2 (frontmatter already valid) |
| `README.md` | present (8.8 KB) | present (3.7 KB) | OK but terse | P1.2 (no change needed beyond brand polish in P4.5) |
| `CHANGELOG.md` | present, Keep-a-Changelog 1.1.0, 21 KB | present (808 B, minimal) | PARTIAL — owned by release-please | OK (release-please updates it) |
| `STANDARDS.md` | present (4.5 KB) | **missing** | GAP | P1.2 |
| `Gemini-Conversation.md` | present (historical) | n/a | skip | — |

## docs/ markdown

| File | mean-streets | voxel-realms | Status | Corrective task |
| --- | --- | --- | --- | --- |
| `docs/ARCHITECTURE.md` | present | present | OK | — |
| `docs/ASSETS.md` | n/a (has LORE.md instead) | present | OK (extra, appropriate for this game) | — |
| `docs/DEPLOYMENT.md` | present | present | OK | — |
| `docs/DESIGN.md` | present | present | OK | — |
| `docs/LAUNCH_READINESS.md` | present | present | OK | — |
| `docs/LORE.md` | present | **missing** | GAP | P1.4 |
| `docs/PRODUCTION.md` | present | present | OK | — |
| `docs/README.md` | present | present | OK | — |
| `docs/RELEASE.md` | present | present | OK | P8.1 / P8.2 will extend |
| `docs/RULES.md` | present | present | OK | — |
| `docs/STATE.md` | present | present | OK | updated each pillar |
| `docs/TESTING.md` | present | present | OK | P1.12 extends for new suites |
| `docs/VISUAL_REVIEW.md` | present | present | OK | — |
| `docs/store-listing.md` | present (but lowercase stub) | **missing** | GAP | P1.5 |
| `docs/plans/` | present (PR plans) | present (this file) | OK | — |
| `docs/superpowers/` | present (specs) | not needed yet | skip | — |

## Frontmatter check

| Scope | mean-streets rule | voxel-realms state | Corrective task |
| --- | --- | --- | --- |
| Root `.md` files | YAML `title/updated/status` | `AGENTS.md` has it, `README.md/CHANGELOG.md` do not | P1.2 |
| `docs/*.md` | YAML `title/updated/status/domain` | mostly compliant (verified by sampling DESIGN/STATE/ARCHITECTURE/ASSETS/RULES/LAUNCH_READINESS); confirm the rest | P1.3 |

## CI/CD workflows

| Workflow | mean-streets shape | voxel-realms shape | Gap | Corrective task |
| --- | --- | --- | --- | --- |
| `.github/workflows/ci.yml` | core + browser + e2e-smoke + autobalance jobs | core + browser + native-android jobs | missing e2e-smoke; missing artifact upload of test-screenshots on PR `always()`; autobalance job is mean-streets-specific, replace with realm drift job | P1.6 |
| `.github/workflows/cd.yml` | release-checks (typecheck+lint+e2e-smoke) + deploy-pages + deploy-android-debug + balance-smoke | release-checks (typecheck+lint+realm:validate+golden) + deploy-pages + deploy-android-debug | replace golden step with e2e-smoke; add realm drift smoke `continue-on-error: true` | P1.8 |
| `.github/workflows/release.yml` | release-please + android AAB + ios xcarchive | release-please + web-artifact + android AAB + ios xcarchive | voxel-realms already has web-artifact (superset); SHA pins current | P1.9 (minor: align artifact naming and signing wiring per P8.1) |
| `.github/workflows/automerge.yml` | present (dependabot + release-please) | **missing** | GAP | P1.10 |
| `.github/dependabot.yml` | present | **missing** | GAP | P1.11 |

## AI tool configs

| File | mean-streets | voxel-realms | Corrective task |
| --- | --- | --- | --- |
| `.github/copilot-instructions.md` | present | **missing** | P1.13 |
| `.cursor/rules` | present | **missing** | P1.13 |
| `.claude/settings.json` | present (minimal) | present (authored this batch) | OK |

## Testing surfaces

| Surface | mean-streets | voxel-realms | Gap | Corrective task |
| --- | --- | --- | --- | --- |
| `playwright.config.ts` | present (e2e/) | **missing** | GAP | P1.7 |
| `e2e/` directory | present | **missing** | GAP | P1.7 |
| `pnpm test:e2e` script | present | **missing** | GAP | P1.7 |
| `pnpm test:e2e:ci` script | present | **missing** | GAP | P1.7 |

## Findings summary

1. CLAUDE.md missing at root → P1.2
2. STANDARDS.md missing at root → P1.2
3. AGENTS.md needs frontmatter check; README.md needs `title/updated/status` → P1.2
4. `docs/LORE.md` missing → P1.4
5. `docs/store-listing.md` missing → P1.5
6. `docs/*.md` frontmatter sweep → P1.3
7. `ci.yml` lacks e2e-smoke job + test-screenshots artifact → P1.6
8. Playwright E2E harness absent (config + specs + scripts) → P1.7
9. `cd.yml` should swap the golden-only gate for e2e-smoke + realm drift → P1.8
10. `automerge.yml` missing → P1.10
11. `.github/dependabot.yml` missing → P1.11
12. `docs/TESTING.md` needs updates once new suites land → P1.12
13. `.github/copilot-instructions.md` + `.cursor/rules` missing → P1.13
14. `release.yml` artifact naming + signing wiring follow-up → P8.1

## Notes

- voxel-realms has **extra** surfaces beyond mean-streets (ASSETS.md, raw-assets/, curated chaos-slice pipeline) — these are appropriate for a voxel game and are kept.
- mean-streets ships scripted balance tests (`analysis:lock`, `analysis:benchmark`) — the direct analogue in voxel-realms is `realm:validate` + `realm:verify-visual` + `verify-build-budget`. The CI/CD mapping uses these as the drift-smoke equivalents.
- `docs/superpowers/` in mean-streets stores planning specs; voxel-realms can defer this unless a specific spec shape is needed.
