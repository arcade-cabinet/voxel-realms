#!/usr/bin/env bash
# Runs before context compaction. Persists task state so /task-batch can resume
# after compaction without losing the PRD thread.

set -u

state_dir=".claude/state"
mkdir -p "${state_dir}"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="${state_dir}/pre-compact-${ts}.md"

{
  echo "# Pre-compact snapshot — ${ts}"
  echo
  echo "## Current PRD"
  echo "docs/plans/voxel-realms-1.0.prq.md"
  echo
  echo "## git status"
  git status --short 2>/dev/null || true
  echo
  echo "## branch"
  git branch --show-current 2>/dev/null || true
  echo
  echo "## last commits"
  git log --oneline -10 2>/dev/null || true
  echo
  echo "## open PRs"
  gh pr list --limit 5 --json number,title,state 2>/dev/null || true
} > "${out}" 2>/dev/null || true

echo "voxel-realms pre-compact snapshot: ${out}" >&2
exit 0
