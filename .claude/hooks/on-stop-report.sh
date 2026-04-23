#!/usr/bin/env bash
# Runs when the agent signals Stop. Emits a brief status report so the autonomous
# loop has something to re-orient on. Never blocks the stop — report-only.

set -u

log_dir=".claude/reports"
mkdir -p "${log_dir}"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="${log_dir}/stop-${ts}.md"

{
  echo "# Stop report — ${ts}"
  echo
  echo "## git status"
  git status --short 2>/dev/null || true
  echo
  echo "## recent commits"
  git log --oneline -5 2>/dev/null || true
  echo
  echo "## open PRs"
  gh pr list --limit 10 --json number,title,state,isDraft 2>/dev/null || echo "gh not available"
  echo
  echo "## latest CI run on current branch"
  branch="$(git branch --show-current 2>/dev/null || echo '')"
  if [[ -n "${branch}" ]]; then
    gh run list --branch "${branch}" --limit 3 --json status,conclusion,name,url 2>/dev/null || true
  fi
} > "${out}" 2>/dev/null || true

echo "voxel-realms stop report written: ${out}" >&2
exit 0
