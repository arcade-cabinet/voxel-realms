#!/usr/bin/env bash
# Runs after every Edit/Write. Fast-fail checks only; never block for long.
# - Warn if a TODO / FIXME / pass stub was just introduced into source files.
# - Warn if a file is getting unusually large (soft signal, not a hard cap).

set -u

# Read JSON payload from stdin (provided by Claude Code hooks).
payload="$(cat || true)"
file_path="$(printf '%s' "$payload" | python3 -c 'import json,sys
try:
  data=json.load(sys.stdin)
  print(data.get("tool_input", {}).get("file_path", ""))
except Exception:
  print("")' 2>/dev/null)"

if [[ -z "${file_path}" ]]; then
  exit 0
fi

# Only inspect source trees.
case "${file_path}" in
  *src/*|*app/*|*scripts/*) ;;
  *) exit 0 ;;
esac

if [[ ! -f "${file_path}" ]]; then
  exit 0
fi

warnings=()

if grep -Eq '^[[:space:]]*(TODO|FIXME)\b' "${file_path}"; then
  warnings+=("TODO/FIXME introduced in ${file_path} — CLAUDE.md forbids unresolved stubs.")
fi

if grep -Eq '^[[:space:]]*pass[[:space:]]*$' "${file_path}" 2>/dev/null; then
  warnings+=("Empty 'pass' body in ${file_path} — fix or delete.")
fi

loc=$(wc -l < "${file_path}" | tr -d ' ')
if [[ "${loc}" -gt 500 ]]; then
  warnings+=("${file_path} is ${loc} lines — soft signal that it may need decomposition. Judge against single-responsibility.")
fi

if (( ${#warnings[@]} > 0 )); then
  printf 'voxel-realms guard warnings:\n' >&2
  for w in "${warnings[@]}"; do
    printf '  - %s\n' "$w" >&2
  done
fi

exit 0
