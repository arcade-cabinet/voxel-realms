# GitHub Copilot Instructions

Voxel Realms — a mobile-first voxel platforming expedition (web + Android + iOS via Capacitor).

## Source of Truth

Copilot should treat the following as authoritative when suggesting code:

- `CLAUDE.md` at repo root — project identity, critical rules, commands, structure.
- `AGENTS.md` at repo root — extended agent protocols.
- `STANDARDS.md` at repo root — code quality, branding, non-negotiables.
- `docs/DESIGN.md` — game shape and non-goals.
- `docs/RULES.md` — gameplay contract.
- `docs/ARCHITECTURE.md` — stack, directory ownership, determinism layers.
- `docs/ASSETS.md` — runtime asset policy.
- `docs/TESTING.md` — test layers and how to run each.

Do not duplicate those files here. If guidance in those files conflicts with a Copilot suggestion, those files win.

## Quick Reminders

- pnpm only; Biome (not ESLint); Vitest (node + browser); Playwright for E2E.
- Deterministic engine under `src/games/voxel-realms/engine/` — no React imports.
- Mobile-first: portrait, safe-area aware, touch targets ≥ 48 px.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`, `build:`.
- No stubs, no `TODO`, no `pass` bodies — fix or delete.
- Docs → Tests → Code.
