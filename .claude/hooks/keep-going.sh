#!/usr/bin/env bash
# Stop hook — prevents the agent from stopping until Voxel Realms 1.0 is shipped.
#
# The agent exits its turn by attempting to Stop. This hook reads the state
# sentinel; if work is still pending, it returns exit 2 with a reason that
# Claude Code injects as a new user message, forcing another turn with
# fresh orientation. If the sentinel says DONE, the hook exits 0 and the
# agent stops cleanly.
#
# The sentinel is .claude/state/DONE — absent means keep working.
# To stop permanently the user can `touch .claude/state/DONE`.

set -uo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$repo_root" || exit 0

state_dir=".claude/state"
mkdir -p "$state_dir"

# Stop flag — an empty file created by the user or the batch on completion.
if [[ -f "${state_dir}/DONE" ]]; then
  exit 0
fi

# Soft-stop guard — 200 consecutive turns without the sentinel means
# something is probably wrong. Abort on runaway so the user can intervene.
turn_counter_file="${state_dir}/stop-hook-turn-counter"
turn_count=0
if [[ -f "${turn_counter_file}" ]]; then
  turn_count="$(cat "${turn_counter_file}" 2>/dev/null || echo 0)"
fi
turn_count=$((turn_count + 1))
echo "${turn_count}" > "${turn_counter_file}"
if [[ ${turn_count} -gt 200 ]]; then
  echo "keep-going: 200 turn ceiling reached — stopping for safety." >&2
  exit 0
fi

# Collect orientation snapshot.
branch="$(git branch --show-current 2>/dev/null || echo '')"
short_status="$(git status --short 2>/dev/null | head -10)"
ahead="$(git log --oneline origin/main..HEAD 2>/dev/null | head -5)"
last_commits="$(git log --oneline -5 2>/dev/null)"
open_prs="$(gh pr list --limit 10 --json number,title,isDraft,mergeStateStatus 2>/dev/null || echo '[]')"

tracker_excerpt=""
if [[ -f docs/plans/batch-tracker.md ]]; then
  tracker_excerpt="$(awk '/^## Next action/{flag=1; next} flag && /^## /{flag=0} flag' docs/plans/batch-tracker.md | head -20)"
  if [[ -z "${tracker_excerpt}" ]]; then
    tracker_excerpt="$(head -60 docs/plans/batch-tracker.md)"
  fi
fi

# Reason written to stderr — Claude Code surfaces this back to the agent.
cat <<EOF >&2
KEEP_GOING: voxel-realms 1.0 batch is still running. Do NOT stop.

Orientation (turn ${turn_count} / 200):
  branch: ${branch:-<none>}
  last commits:
${last_commits:-  <none>}
  ahead of origin/main:
${ahead:-  <none>}
  working tree:
${short_status:-  <clean>}
  open PRs:
${open_prs}

Tracker — Next action:
${tracker_excerpt:-  (tracker empty — initialize docs/plans/batch-tracker.md)}

Required behavior next turn:
  1. Read docs/plans/batch-tracker.md — it is the authoritative task list.
  2. Advance the next open item: diagnose failures, fix, verify locally,
     commit, push, open/update PR, merge when green, sync main, repeat.
  3. Update docs/plans/batch-tracker.md in every commit that changes state
     (mark items done, add newly discovered tasks).
  4. Do not file status reports to the user. Work continuously.
  5. Batch ends ONLY when tracker shows all pillars completed AND the
     Prime Directive in docs/plans/voxel-realms-1.0.prq.md is satisfied.
     At that point write .claude/state/DONE and stop.

EOF

exit 2
