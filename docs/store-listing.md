---
title: Store Listing
updated: 2026-04-23
status: draft
domain: ops
---

# Store Listing

Draft copy and metadata for Google Play and App Store submission. Final
copy needs a branding pass (P4.5) and screenshots (P8.4). Narrative voice
follows [docs/LORE.md](./LORE.md).

## Short description

**≤ 80 characters (Google Play short; App Store subtitle cap 30).**

Candidate (Play short, 78 chars):
> A vertical voxel climber. Scan anomalies. Extract before the realm collapses.

Candidate (App Store subtitle, 30 chars):
> Climb. Scan. Extract.

## Full description

**Google Play allows 4000 chars; App Store allows 4000. Keep it tight.**

```
Voxel Realms is a mobile-first voxel platforming expedition.

The world fractured into realms — small stacked worlds that rise on
their own and fall apart under their own weight. You're a surveyor.
Your job is simple and finite: climb the spire, scan the anomaly
signals along the route, reach the extraction gate before instability
takes the realm down, and roll into the next one.

Every realm is seeded and deterministic. No sprawl. No survival
timers measured in hours. No quest logs. One climb, one timer, one
extraction — then the next realm in the expedition sequence.

FEATURES
• Mobile-first vertical climbing built for portrait play.
• Five biome archetypes — jungle, ocean, steampunk, dinosaur, arctic.
• Deterministic realm generation with a verified golden path.
• Anomaly scanning that arms the exit gate.
• Finite realms with collapse pressure — extract or collapse, then continue.
• Expedition survey ledger that persists across runs.
• Designed for phones first: touch controls, safe-area aware, brand
  typography, offline-playable.

Voxel Realms is not a survival sandbox. It is not an open world. It
is a climb with a purpose and a timer. Each realm ends. The
expedition continues.
```

## Features (bullet list for store UI)

- Mobile-first vertical climbing
- Five seeded biome archetypes
- Deterministic realm generation
- Anomaly scanning & extraction gate
- Finite realms, continuous expeditions
- Offline playable

## Keywords

**App Store allows 100 chars of comma-separated keywords. Google Play
infers from description but the following phrases should appear in the
full description for discovery.**

- voxel
- platformer
- climb
- expedition
- mobile platformer
- anomaly
- extraction
- vertical climber
- seeded
- survey

App Store packed (≤ 100 chars):

```
voxel,platformer,climb,survey,anomaly,expedition,extraction,vertical,seeded,mobile
```

## Category

- **Google Play primary**: Games → Action
- **Google Play secondary**: Games → Adventure
- **App Store primary**: Games → Action
- **App Store secondary**: Games → Adventure
- **Content rating target**: Everyone / 4+
  - No violence depicted (collapse ≠ death in fiction).
  - No in-app purchases at 1.0.
  - No user-generated content.
  - No advertising.

## Age / content rating questionnaire notes

- Cartoon violence: **none**.
- Realistic violence: **none**.
- Fear themes: **minimal** — collapse pressure is structural, not horror.
- Sexual content: **none**.
- Profanity: **none**.
- Gambling: **none**.
- Drug references: **none**.
- Data collection: **minimal** — anonymous error telemetry, opt-in only
  (see [PRIVACY.md](./PRIVACY.md) once authored in P8.6).

## Store assets required

Tracked in [LAUNCH_READINESS.md](./LAUNCH_READINESS.md). Capture script
lands in P8.4 (`scripts/capture-store-screenshots.mjs`).

- App icon (all Android densities + iOS App Store 1024×1024)
- Feature graphic (Google Play 1024×500)
- Screenshots:
  - 6.7" phone (iOS): 1290×2796 — portrait — ≥ 3, ideally 5
  - 6.5" phone: 1284×2778
  - Android phone: 1080×1920 minimum portrait — ≥ 3, ideally 8
  - Android tablet: 1920×1200 portrait — optional
- Promo video / trailer: 15–30 s, portrait, no UI chrome from other apps
  (P8.5)

## Privacy policy + support URLs

- Privacy policy URL: **TBD** — blocks P8.6.
- Support URL: **TBD** — blocks P8.6. Candidate:
  `https://github.com/arcade-cabinet/voxel-realms/issues/new/choose`.

## Pricing

- **1.0 launch**: free, no ads, no in-app purchases.
- Revisit after public playtest.

## Launch channels

- Google Play — start in Internal Testing, promote to Closed, then Open
  Beta, then Production. See [RELEASE.md](./RELEASE.md).
- App Store — TestFlight (Internal + External) → App Store.

## Open Questions

- [ ] Final wordmark / app icon lockup (blocks store icon generation, P8.3).
- [ ] Privacy policy host — GitHub Pages subpath vs separate static site.
- [ ] Support email or issue-tracker only? Issue-tracker is acceptable if
      Android 13+ submission doesn't require an email of record.
- [ ] Promo video aspect ratio: portrait-only, or also a landscape cut for
      the App Store preview?
- [ ] Localization scope for 1.0 — English only acceptable; add locales
      post-launch.
- [ ] Screenshot copy overlay vs clean — decide per-archetype framing in
      P4.3 / P8.4.
- [ ] Content rating partner (IARC for Google Play) answers double-checked
      by legal before first submit.
