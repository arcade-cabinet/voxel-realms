---
title: Feedback Channel
updated: 2026-04-24
status: draft
domain: ops
---

# Voxel Realms — Feedback Channel

How players send feedback during the playtest window.

## In-app link

The Pause overlay → Settings → "Send feedback" button (tracked as a
follow-up task) opens the GitHub issue tracker in a new tab with a
pre-filled template URL. Target URL:

```
https://github.com/arcade-cabinet/voxel-realms/issues/new?template=feedback.yml
```

## Issue template content

The feedback template (to be added under
`.github/ISSUE_TEMPLATE/feedback.yml`) captures:

- Device + OS (single-line).
- App version (auto-filled from the version chip once it ships).
- What were you doing? (free text).
- What worked / what got in the way? (two short text boxes).
- Optional screenshot.

## Privacy

Feedback submissions follow standard GitHub issue privacy. Any personal
info a player pastes into an issue is visible to anyone who can read
the repo. Do not encourage players to paste device identifiers or
account credentials.

The app's Error telemetry log (if the player has opted in) is **not**
automatically attached — the player must paste it themselves, and the
log is already redacted of `/Users/<name>/` paths.

## Playtest-window workflow

During the 1.0 public playtest:

1. Players tap Settings → Send feedback.
2. A GitHub issue is opened with the template prefilled.
3. Issues are triaged weekly into Bug / Feature / Question labels.
4. High-impact bugs get hotfix PRs; lower-priority items get queued
   for the next release batch.
5. The weekly triage writes a short digest to `docs/STATE.md` so the
   team has a live sense of what the player base hit.

## Open questions

- [ ] Create the `.github/ISSUE_TEMPLATE/feedback.yml` template and
      wire the in-app link (tracked as the P9.3 follow-up).
- [ ] Decide whether to mirror feedback to a Discord channel or keep
      it issue-tracker-only.
