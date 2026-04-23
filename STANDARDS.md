---
title: Standards
updated: 2026-04-23
status: current
domain: quality
---

# Voxel Realms — Standards

Code quality, brand rules, and non-negotiable constraints. Testing strategy
lives in [docs/TESTING.md](./docs/TESTING.md). Architecture conventions live
in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md). Product direction lives
in [docs/DESIGN.md](./docs/DESIGN.md).

## Code Quality

### File Length

**300 LOC is a soft signal, not a hard cap.** A 400-line generated schema,
a single-responsibility controller, or a config table is fine. A 250-line
file quietly owning three unrelated subsystems is not. When a file
approaches the signal, decompose by responsibility before adding more.

The PostToolUse guard hook warns at 500 LOC — treat warnings as a prompt
to judge, not an automatic split.

### TypeScript

- Strict mode enforced via `tsconfig.json` (`"strict": true`).
- No `any`. No untyped function parameters. Explicit return types on
  exported functions.
- Discriminated unions preferred over `type | null` where the distinction
  carries semantic weight.
- The deterministic engine (`src/games/voxel-realms/engine/`) must compile
  and run without React — no UI imports may leak into it. Visual/runtime
  code lives under `app/`.

### Linting and Formatting

- **Biome**, not ESLint. `pnpm lint` runs Biome checks.
- Biome config owns formatting rules. Do not add `.eslintrc` or Prettier
  config — they will conflict.
- CI fails on lint errors. Fix them before pushing.

### Dependencies

- **pnpm only.** Never create `package-lock.json` or `yarn.lock`. If one
  appears, delete it and add to `.gitignore`.
- Lockfile committed. Use `pnpm install --frozen-lockfile` in CI.
- Pin WASM-sensitive packages to exact versions (`sql.js` is pinned to
  `1.11.0` for `jeep-sqlite` ABI compatibility — verify before bumping).

## Git Conventions

### Commit Messages

Conventional Commits — always:

```
feat:      new user-facing feature
fix:       bug fix
refactor:  internal restructure (no behavior change)
test:      test additions or changes
chore:     tooling, config, housekeeping
docs:      documentation only
perf:      performance improvement
ci:        CI/CD workflow changes
build:     build system changes
```

Scope is optional but encouraged: `feat(hud):`, `fix(mobile):`,
`test(realm):`, `chore(ci):`.

### Branch Policy

- Feature branches off `main`. PR to `main`. Squash merge.
- Branch prefixes: `feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`,
  `perf/`, `ci/`, `build/`.
- No direct pushes to `main`.
- Never `--force` push. `--force-with-lease` only on branches you own.
- Never `gh pr merge --admin`. Let CI pass.

## Determinism Discipline

### No Ungated Randomness

Realms and validation are deterministic:

- Realm generation is seeded (`realmClimber.ts`).
- Anomaly placement is seeded.
- The golden-path playthrough is deterministic input → deterministic result.
- Visual manifest SHAs must be stable across runs.

Any PR introducing `Math.random()` in `src/games/voxel-realms/engine/` must
route through a seeded RNG (or explicitly be bound to a cosmetic-only scope
documented in the PR). Cosmetic randomness in `app/` must not affect
validation SHAs.

### Validation Before Render

- `realm:validate` must pass before a realm is rendered.
- `realm:verify-visual` must pass after any visual change — either by
  updating the manifest intentionally or by fixing the regression.
- New archetypes, hazards, or anomaly kinds ship with per-variant validation
  tests before the visual layer lands.

## Brand and Visual

### Typography

Three tracked fonts live under `public/assets/fonts/brand/`:

- **Outfit** (regular + bold) — UI default.
- **Boldonse** (regular) — display / wordmark.
- **Red Hat Mono** (regular + bold) — HUD telemetry, code-like readouts.

No additional fonts without a brand decision.

### Palette

A single palette source lives in `app/shared/styles/globals.css` (CSS custom
properties). Component styles consume the tokens — no ad-hoc hex strings in
component files unless deliberately scoped and commented.

### HUD Copy

- Every HUD element displays authored copy, not identifier strings.
- Objective text reads in plain language ("Find the next anomaly", not
  "anomaly=2/3").
- Collapse timer is visually distinct and readable in one glance.
- Gate state has three explicit modes: LOCKED, ARMED, OPEN.

## Testing Standards

See [docs/TESTING.md](./docs/TESTING.md) for the full matrix.

The short version:
- **Docs → Tests → Code.** Write the failing test before the implementation.
- Engine logic: pure Vitest node tests under `src/`.
- Components and app shell: Vitest + Testing Library under `app/`.
- Real-browser behavior: Vitest Browser (Playwright provider) for capture
  evidence and DOM-sensitive UI.
- Full user flows: Playwright E2E under `e2e/` (landing → scan → extract).
- Realm correctness: `pnpm realm:validate` and `pnpm realm:verify-visual`
  are first-class gates.
- Stale tests are worse than no tests — update them when behavior changes.
- Visual captures must be reviewed for correctness and polish, not only for
  "does it render."

## Mobile Discipline

- Touch targets ≥ 48 px (56 px preferred for thumb-reach controls).
- HUD respects `env(safe-area-inset-*)`.
- Orientation: portrait-first. Landscape only when explicitly authored.
- `prefers-reduced-motion` dampens camera damping, screen shake, and
  celebration beats.
- Haptics are opt-in via Settings and always gated on platform availability.

## Accessibility

- Interactive elements carry `aria-label` or accessible text.
- Color contrast meets WCAG AA for text.
- Controls reachable by tap-only (no drag-required flows for primary path).

## Anti-Patterns

- Catch-all `try { ... } catch { /* swallow */ }` — log + rethrow or handle
  meaningfully. Never suppress to quiet CI.
- Feature flags or compat shims for problems you can fix in one pass —
  change the code.
- Stubs / TODOs / `pass` bodies. The PostToolUse guard flags these; treat
  warnings as bugs.
- Comments that describe WHAT the code does. Leave a comment only when the
  WHY is non-obvious (hidden constraint, workaround, subtle invariant).
- Backwards-compatibility shims for internal-only APIs. Change the callers.
