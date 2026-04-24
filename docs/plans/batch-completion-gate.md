---
title: Batch Completion Gate
updated: 2026-04-24
status: current
domain: plan
---

# Batch Completion Gate

This doc defines the exact conditions under which the autonomous 1.0
polish batch terminates — i.e. when `.claude/state/DONE` should be
created and the keep-going hook should release control.

The tracker at [`batch-tracker.md`](./batch-tracker.md) tracks **what
shipped**. This doc defines **what "done" means** so an agent can
self-check without spelunking the PRD.

## Hard gates — must all pass

The batch is **not done** while any of these are false.

### 1. Engine contract holds

```bash
pnpm lint
pnpm typecheck
pnpm test              # includes verify-visual
pnpm realm:validate -- --sequence-count 10
pnpm test:e2e:ci
pnpm build             # includes perf + asset-byte budget
```

All six commands exit zero on a clean `main` checkout. If any fails,
the batch is not done.

### 2. Release train is caught up

- `release-please` PR has merged at least once (first release tag
  cut, v0.3.0 or later).
- Every `feat:` / `fix:` commit merged in the current session is
  reflected in the latest tag or in the open release-please PR.
- `main` has no unmerged commits that aren't in a release PR.

### 3. Live Pages build works

- `gh run view` on the most recent `cd.yml` run shows success.
- The Pages URL (`https://arcade-cabinet.github.io/voxel-realms/`)
  resolves and renders the landing page without JS errors.
- Cold-player flow (land → Enter Realm → scan one signal → reach
  exit gate → extract → next realm) completes on the live build.

### 4. Tracker is truthful

- Every pillar in the tracker table reads either `DONE`, `MOSTLY DONE`,
  or `PARTIAL` with a specific reason given in the Notes column.
- Every subtask line either describes what shipped (with PR number)
  or states *why* it's deferred.
- The "Merged wave N" section in `In-flight PRs` lists every PR that
  merged during the current session.

### 5. No open regressions

- No in-flight PRs are blocked on failing CI that was caused by a
  recent merge (other than known-flaky browser timing issues).
- The open-PR list shows either: (a) release-please train PRs, (b)
  dependabot PRs that are non-majors awaiting auto-merge, or (c)
  nothing.

## Soft gates — tracked but may still be deferred

The batch **can** still be marked done with these outstanding, as
long as the tracker is honest about it and each deferred item has a
listed reason.

- **P4.1–P4.3 asset promotion** — needs design source. Not a
  code-solvable problem.
- **P5.1 touch-controls polish** — needs physical-device playtest.
  Scriptable CI cannot validate feel.
- **P7.4 visual manifest ≥12 captures** — requires widening
  `validateCaptureOrder` in the manifest validator plus a companion
  golden-path rewrite. Risk-to-reward is poor while the 3-capture
  contract is stable.
- **P8.3 app icon + splash generation** — needs a design-source SVG
  that does not currently exist in the repo.
- **Signing secrets provisioning** — needs a human with repo-secret
  write access. Runbooks exist ([ANDROID_SIGNING.md](../ANDROID_SIGNING.md),
  [iOS_SIGNING.md](../iOS_SIGNING.md), [CRASH_REPORTING.md](../CRASH_REPORTING.md)).
- **v1.0.0 promotion** — separate decision after the remaining
  store-asset work lands.

## Operator procedure to close the batch

```bash
# 1. Sync main and run every hard gate locally.
git checkout main
git pull --ff-only origin main
pnpm install
pnpm lint && pnpm typecheck && pnpm test && \
  pnpm realm:validate -- --sequence-count 10 && \
  pnpm test:e2e:ci && pnpm build

# 2. Verify the release train.
gh pr list --state open --json number,title,author \
  | jq '.[] | select(.author.login != "dependabot[bot]")'

# 3. Verify live Pages.
curl -sI https://arcade-cabinet.github.io/voxel-realms/ | head -1

# 4. Verify tracker is truthful (read `docs/plans/batch-tracker.md`).

# 5. Drop the marker.
mkdir -p .claude/state
touch .claude/state/DONE
```

The keep-going hook releases control on the next turn once `.claude/state/DONE` exists.

## What "done" does NOT mean

- It does **not** mean v1.0.0 is tagged.
- It does **not** mean the game is submitted to any store.
- It does **not** mean the asset pipeline has replaced marker
  anchors.

"Done" means: the autonomous polish surface is in a clean, stable
state, the tracker documents what remains, and the remaining work
needs human input (design source, physical devices, repo secrets).
The next batch picks up from here with clear eyes.

## Related docs

- [batch-tracker.md](./batch-tracker.md) — the live task list
- [voxel-realms-1.0.prq.md](./voxel-realms-1.0.prq.md) — the PRD
  with the Prime Directive text
- [../LAUNCH_READINESS.md](../LAUNCH_READINESS.md) — the manual
  checklist for public playtest / store submission (separate from
  this batch-completion gate)
