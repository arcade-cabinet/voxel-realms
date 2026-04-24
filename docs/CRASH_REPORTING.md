---
title: Crash Reporting Strategy
updated: 2026-04-24
status: current
domain: ops
---

# Crash Reporting Strategy

Voxel Realms has an opt-in in-process error telemetry ring buffer
(`app/shared/telemetry/errors.ts`) that captures JavaScript errors,
unhandled promise rejections, and redacts local filesystem paths.
That's enough for playtest-digest triage of crashes that happen
*inside* the web runtime, but it misses:

- Native-only crashes (Rapier/WebGL/Capacitor bridge).
- Crashes that kill the JS runtime before the buffer can flush.
- ANRs / foreground-service freezes on Android.
- iOS symbolicated stack traces.

P9.2 (native crash reporting) is the decision of **which SDK** to
wire up to close that gap once the game ships to stores. This doc
captures the tradeoff analysis so a future session can pick without
re-running the research.

## Requirements

1. Free or near-free at playtest scale (<1k DAU).
2. Works across web + Capacitor Android + Capacitor iOS with one
   integration story.
3. Doesn't require a backend we have to operate ourselves.
4. Respects the player's `telemetryOptIn` preference — no reporting
   unless the player opted in via Settings.
5. Privacy-friendly default: no PII, no device identifiers, no IP
   addresses stored past aggregation.

## Candidates

### Sentry

- **Web**: `@sentry/browser` + `@sentry/react` packages.
- **Capacitor**: `@sentry/capacitor` wraps native + web in one SDK.
- **Pricing**: free tier = 5k errors/month, 10k performance units.
  Fine for playtest; tightens quickly under real launch load.
- **Privacy**: cookies and IPs can be disabled; source maps can be
  uploaded at build time so stack traces symbolicate.
- **Weight**: ~70 kB gzipped for the web SDK — significant but within
  our build-budget headroom after the recent dep bumps.

### Google Firebase Crashlytics

- **Web**: no native web SDK; would need a custom bridge.
- **Capacitor**: `@capacitor-community/firebase-crashlytics` wraps
  the Android/iOS native SDKs. Web coverage stays on our own
  in-process telemetry.
- **Pricing**: free at any volume.
- **Privacy**: Google-hosted, requires Firebase project setup, ties
  the game into the Google surveillance graph — inconsistent with
  the privacy posture set in PRIVACY.md.
- **Weight**: zero on web, ~250 kB on native. Native-only is a
  structural mismatch — we lose web crash coverage.

### Bugsnag

- **Web + Capacitor**: `@bugsnag/js` (web) + `@bugsnag/plugin-react`
  + native plugin for Capacitor.
- **Pricing**: 7.5k events/month free, then a steep jump.
- **Privacy**: comparable to Sentry; EU region option.
- **Weight**: ~50 kB gzipped web.
- **Unique**: stable release tracking and session-volume dashboards
  are slightly nicer than Sentry's free tier.

### Honeybadger / Rollbar / Datadog

- Self-serve but priced for commercial teams. Not a fit for a
  pre-revenue playtest.

## Recommendation

**Sentry** (`@sentry/capacitor`) is the default choice:

1. One integration story covers web + iOS + Android.
2. Free tier carries us through playtest.
3. Source-map upload in `release.yml` gives us symbolicated web
   traces immediately.
4. SDK respects `beforeSend` hooks, so the existing
   `telemetryOptIn` preference gates network calls at the SDK layer
   rather than at the app layer.

Revisit if:

- Sentry free tier runs out before a monetization plan exists.
- Privacy requirements tighten beyond what Sentry's EU region + PII
  scrubbing covers.
- The app adds a first-party backend that could absorb crash
  reports natively.

## Wiring sketch (for the future PR that implements this)

### Dependencies

```bash
pnpm add @sentry/capacitor @sentry/react
```

### Initialize once, gated on the player preference

```ts
// app/shared/telemetry/crashReporting.ts
import * as Sentry from "@sentry/capacitor";
import { loadRealmPreferences } from "@app/shared/platform/persistence/preferences";

export async function bootstrapCrashReporting(release: string): Promise<void> {
  const prefs = await loadRealmPreferences();
  if (!prefs.telemetryOptIn) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release,
    tracesSampleRate: 0.0, // traces disabled for playtest; enable if useful
    beforeSend(event) {
      // Defense in depth — drop events if the preference flipped
      // between init and send.
      if (typeof window !== "undefined" && !window.__voxelRealmsTelemetryEnabled) {
        return null;
      }
      return event;
    },
  });
}
```

### Hook into `bootstrapPlatform`

`app/shared/platform/bootstrap.ts` already runs once at startup.
Call `bootstrapCrashReporting(import.meta.env.VITE_APP_VERSION)`
from there after the existing platform plugins register.

### Add the DSN as a build secret

```yaml
# release.yml (conceptual)
- name: Inject Sentry DSN
  env:
    VITE_SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    VITE_APP_VERSION: ${{ github.ref_name }}
  run: pnpm build
```

Source maps upload step:

```yaml
- uses: getsentry/action-release@...
  with:
    environment: production
    sourcemaps: ./dist/assets
```

### Gate on preference flip

When the player toggles Telemetry in Settings:

- On → `bootstrapCrashReporting(...)` (if not already initialized)
- Off → `Sentry.close()` and clear the scope

This mirrors the audio/haptics cache invalidation pattern.

## Until this ships

The in-process `telemetry/errors.ts` ring buffer is the current
crash-reporting surface. It captures most web-side errors and is
surfaced to the player via the Feedback link in Settings (P9.3).
That's acceptable for pre-store playtest; it is **not** acceptable
for a production launch.

## Related docs

- [PRIVACY.md](./PRIVACY.md) — player-facing data handling
- [DEPLOYMENT.md](./DEPLOYMENT.md) — CI/CD surface the wiring lands in
- [FEEDBACK.md](./FEEDBACK.md) — the manual feedback channel today
