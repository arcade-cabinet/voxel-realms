---
title: Privacy Policy
updated: 2026-04-24
status: draft
domain: ops
---

# Voxel Realms — Privacy Policy

**Draft. Not yet legal-reviewed. Do not link publicly until the open
questions below are resolved.**

Voxel Realms is a single-player voxel platforming game. This document
describes what data the app collects, how long it is retained, and how
a player can delete it.

## What we collect

### By default: nothing

Out of the box, Voxel Realms does not collect any personal data, does
not make any network requests beyond downloading the game itself, and
does not use any third-party analytics, advertising, or social SDKs.

All gameplay state — preferences, expedition ledgers, best-score
records, tutorial completion — is stored **only on the player's
device** using the platform's standard preferences API
(`@capacitor/preferences` on Android and iOS, `localStorage` on the
web). No save data is ever sent off-device by default.

### Opt-in: error telemetry

Players can enable **Error telemetry** in Settings. When enabled:

- The app captures uncaught exceptions and unhandled promise rejections
  into a local in-memory buffer (maximum 30 entries).
- Stack traces are redacted of `/Users/<name>/` and
  `C:\Users\<name>\` segments before they are buffered.
- **No network upload is performed today.** The buffer is local-only
  and is intended to help support the player if they choose to share
  it in a bug report.
- If a future release introduces upload, a separate opt-in prompt will
  describe exactly where the data is sent and how long it is retained.
  Enabling the current "Error telemetry" toggle does **not** grant
  consent for future uploads.

Players can turn the toggle off at any time in Settings. Turning it
off stops capture immediately; any buffered entries are dropped when
the app is closed or when the buffer is cleared via "Clear local
error log" (future control).

## What we do not collect

- Account identifiers or profiles.
- Device identifiers.
- IP addresses.
- Location.
- Contacts, photos, microphone, camera.
- Advertising IDs.
- Any behavioural analytics beyond the anonymous error log described
  above.

## Data retention

- Preferences and expedition ledgers remain on the device until the
  player uninstalls the app or clears the app's storage through the
  platform settings.
- The opt-in error telemetry ring buffer holds at most 30 entries and
  is cleared on app uninstall.

## Third-party SDKs

Voxel Realms currently depends on the following third-party SDKs at
runtime:

| SDK | Purpose | Data sent off-device |
| --- | --- | --- |
| Capacitor core plugins (`@capacitor/app`, `@capacitor/preferences`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`) | Native shell, storage, haptics, status bar, splash | None by default. |
| `@capacitor-community/sqlite` | On-device SQLite for save data | None by default. |
| React / React Three Fiber / Rapier / Three.js | Runtime engine | None. |

No advertising or analytics SDK is present.

## Children

Voxel Realms does not direct content at children and does not
knowingly collect any personal data from anyone, including children.

## Contacting us

For questions about this policy or any data the app stores, use the
support channel listed in [SUPPORT.md](./SUPPORT.md).

## Changes to this policy

Any material change to what data the app collects, how long it is
retained, or where it is sent will ship alongside a new opt-in prompt
in the app and a corresponding revision of this document.

## Open questions (before submit)

- [ ] Confirm the App Store / Google Play data-type questionnaire
      matches this document.
- [ ] Decide whether the privacy policy URL lives on GitHub Pages
      subpath or a separate static host.
- [ ] Legal review of the "future upload" language so it does not
      accidentally grant standing consent.
- [ ] Date-stamp this file when the above are resolved and remove the
      `status: draft` frontmatter value.
