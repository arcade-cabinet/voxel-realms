---
title: QA Rubric
updated: 2026-04-24
status: current
domain: quality
---

# Voxel Realms — Physical-Device QA Rubric

Automated tests (Vitest + Playwright) cover the deterministic engine,
the cold-player E2E smoke, and visual manifest digests. They do **not**
cover how the game *feels* on a real phone. This rubric fills that gap.

Run this pass before every public playtest drop and before any store
submission. Block the drop on any red (✗) row.

## Setup

- Install the debug APK on a physical Android device (not an emulator).
  The APK is published as a `voxel-realms-debug-apk` artifact on every
  main-branch CD run — download from the Actions tab, then
  `adb install -r ~/Downloads/app-debug.apk`.
- On iOS, install from a fresh Capacitor sync
  (`pnpm cap:sync && pnpm cap:run:ios` on a Mac with Xcode + a paired
  device), or wait for a TestFlight build once signing lands.
- Record the device + OS + app version at the top of the checklist run.

## Cold-open

| Check | Expected |
| --- | --- |
| Splash color matches brand | Brand dark, no white flash. |
| First interactive frame ≤ 2.5 s on a mid-tier Android | Landing visible; no long black screen. |
| Status bar content is legible | Time / battery icons readable against landing sky. |
| Safe-area insets respected | Nothing clipped under the notch or home indicator. |

## Landing

| Check | Expected |
| --- | --- |
| Hero copy reads operational | "Climb the spire. Scan the signals. Extract before it falls." |
| Single primary CTA "Enter Realm" thumb-reachable | ≥ 48 px target, bottom half of screen on portrait. |
| Settings button visible and opens dialog | Toggles for audio / haptics / motion / telemetry. |
| ExpeditionSummaryCard shows best + last once the player has a run | Renders nothing before the first run. |

## First run coach

| Check | Expected |
| --- | --- |
| Coach fires exactly once on first play | Three steps, cannot fire again unless replayed in Settings. |
| Step copy is LORE-approved | No placeholder text. |
| Skip button dismisses and persists | Second launch does not re-fire. |
| Replay tutorial from Settings re-arms the coach | Next play shows it again. |

## Climb

| Check | Expected |
| --- | --- |
| Touch look (left half) feels responsive | No 100 ms+ stalls; works around scroll gestures. |
| Touch move (right half / joystick) feels responsive | Deadzone does not misinterpret thumb rest. |
| Jump button hit area ≥ 56 px | Reachable in the bottom-right thumb arc. |
| Coyote time feels forgiving | A jump pressed right after leaving a ledge still lands. |
| Jump buffer feels forgiving | A jump pressed right before landing fires on touchdown. |
| Camera damping does not lag behind fast turns | No overshoot > 120 ms. |
| HUD copy is readable | Gate pill state is clear; no debug identifiers leaked. |
| Objective line reads plainly | "Find the next anomaly", not "anomaly=2/3". |

## Scan + gate

| Check | Expected |
| --- | --- |
| Dwelling on an anomaly produces a scan pulse | SFX fires; gate pill moves locked → primed. |
| Gate opens when threshold met | Visual distinct from primed; HUD copy switches to OPEN. |
| SFX layer plays through device speaker and headphones | Mutes when Settings · Audio off. |
| Haptics fire on scan-complete and extract | Mutes when Settings · Haptics off. |

## Extraction + collapse

| Check | Expected |
| --- | --- |
| Extraction triggers the celebration beat | "Extracted" card shows archetype + signals + next realm. |
| After the beat, player continues cleanly into next realm | NextRealmSplash appears briefly, then gameplay resumes. |
| Collapse shows REALM COLLAPSED | Not "YOU DIED". Shows score + rank + expedition ledger. |
| Continue expedition CTA advances the sequence | RealmIndex increments. |
| Retry this realm rebuilds the same realm | Same archetype, same platform layout, same anomaly seeds. |
| Abandon · New expedition resets the run | RealmIndex returns to 0. |

## Pause

| Check | Expected |
| --- | --- |
| ⏸ Pause button top-right toggles the overlay | Shows Paused title + four actions. |
| Hardware back (Android) resumes the game | One tap returns to play. |
| Escape key on connected keyboard resumes | Same effect. |
| Settings from pause overlays on top | Closing Settings returns to Pause. |
| Restart realm · Same seed rebuilds the realm | Same seed preserved. |
| Abandon expedition returns to landing | Fresh expedition on Start. |

## Persistence

| Check | Expected |
| --- | --- |
| Audio / haptics / motion / telemetry toggles survive app restart | Saved via @capacitor/preferences. |
| onboardingSeen survives app restart | Coach does not re-fire. |
| Best expedition + last expedition survive app restart | ExpeditionSummaryCard on landing shows them. |
| Force-stop + relaunch does not crash the app on cold start | No crash; landing renders within 3 s. |

## Audio + haptics + motion

| Check | Expected |
| --- | --- |
| No autoplay warning on landing | AudioContext created on first gesture only. |
| SFX cues fire on jump / scan-complete / gate-arm / gate-open / extract / collapse | All audible through the device output. |
| Haptics fire on light events (jump-land), medium (scan / extract), heavy (collapse) | Matches ImpactStyle mapping. |
| Reduce-motion toggle dampens celebration beats | Slower or skipped transitions. |

## Telemetry (opt-in only)

| Check | Expected |
| --- | --- |
| Default is OFF | No error capture happens out of the box. |
| Toggling on captures errors into the local buffer | Visible only if a future "Show error log" control ships; otherwise verify via dev menu. |
| Buffer respects the 30-entry cap | Oldest entries roll off. |
| Stack traces are redacted of `/Users/<name>/` | Never leaks local path in the buffer. |

## Accessibility

| Check | Expected |
| --- | --- |
| VoiceOver / TalkBack reads "Voxel Realms" on landing | Brand heading announces clearly. |
| VoiceOver / TalkBack reads each toggle state | role=switch + aria-checked. |
| Color contrast on HUD text is readable | No pale-on-pale regressions. |
| Reduce-motion in OS-level settings is respected | `prefers-reduced-motion` dampens beats. |

## Store-submission blockers (not playtest blockers)

- [ ] Android signing keystore decoded in `release.yml`.
- [ ] iOS signing + provisioning profile steps documented.
- [ ] App icons for every density committed.
- [ ] Store screenshots for required device sizes captured.
- [ ] Trailer / promo video ≤ 30 s.
- [ ] Privacy policy hosted at a stable URL.
- [ ] Support URL hosted at a stable URL.
- [ ] IARC / App Store content-rating questionnaire answers reviewed.

## Sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Engineering |  |  |  |
| QA |  |  |  |
| Product |  |  |  |
