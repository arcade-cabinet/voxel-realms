---
title: iOS Signing and Distribution
updated: 2026-04-24
status: current
domain: ops
---

# iOS Signing and Distribution

Voxel Realms ships to iOS via Capacitor. This document describes the
pre-1.0 signing path, the repository secrets needed to move from
unsigned archives to a signed, App-Store-ready IPA, and the manual
steps the operator still runs during a release window.

## Current state (pre-1.0)

- `release.yml` produces an **unsigned** iOS archive (`App.xcarchive`)
  as a tagged artifact.
- No automated provisioning, no notarization.
- TestFlight / App Store distribution is **not wired up**.

The unsigned archive is a valid Xcode archive — an operator with the
right developer account can open it, re-sign manually, export an IPA,
and upload through Transporter or Xcode Organizer.

## What's needed for a signed pipeline

### Apple Developer account

1. An active paid Apple Developer Program membership
   (individual or organization — organization is preferred for long-term
   store ownership).
2. Access to [App Store Connect](https://appstoreconnect.apple.com).
3. Team ID from [developer.apple.com/account](https://developer.apple.com/account).

### App Store Connect entry

1. Create a new app in App Store Connect with:
   - **Bundle ID**: `com.arcadecabinet.voxelrealms` (matches
     `capacitor.config.ts` `appId` and the Xcode project).
   - **Platform**: iOS.
   - **SKU**: `voxel-realms-ios`.
2. Register the bundle ID under Certificates, Identifiers & Profiles.

### Certificates and profiles

Create and download:

1. A **Distribution Certificate** (`.p12` export including the private
   key). Set an export password and keep it in a password manager.
2. An **App Store Provisioning Profile** for the bundle ID above.

### Repository secrets to add

Once the above exists, add to GitHub Actions secrets:

| Secret | Contents |
|---|---|
| `IOS_DISTRIBUTION_CERT_BASE64` | `base64 -i voxel-realms-distribution.p12` |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | the `.p12` export password |
| `IOS_PROVISIONING_PROFILE_BASE64` | `base64 -i VoxelRealms_AppStore.mobileprovision` |
| `IOS_TEAM_ID` | 10-character Apple Team ID |
| `IOS_APP_STORE_CONNECT_KEY_ID` | App Store Connect API key ID |
| `IOS_APP_STORE_CONNECT_ISSUER_ID` | App Store Connect API issuer UUID |
| `IOS_APP_STORE_CONNECT_KEY_BASE64` | `base64 -i AuthKey_XXXX.p8` |

The API key is preferred over Apple ID + app-specific password because
it allows unattended uploads from CI. Generate it from App Store Connect
→ Users and Access → Integrations → App Store Connect API.

## Wiring it into `release.yml`

The signed-build job will replace the current unsigned archive step with:

1. Decode `IOS_DISTRIBUTION_CERT_BASE64` into a temporary keychain.
2. Import `IOS_PROVISIONING_PROFILE_BASE64` into
   `~/Library/MobileDevice/Provisioning Profiles/`.
3. `pnpm cap:sync`.
4. `xcodebuild -workspace ios/App/App.xcworkspace -scheme App
   -configuration Release -archivePath build/App.xcarchive archive
   DEVELOPMENT_TEAM=$IOS_TEAM_ID CODE_SIGN_STYLE=Manual
   PROVISIONING_PROFILE_SPECIFIER="VoxelRealms_AppStore"
   CODE_SIGN_IDENTITY="iPhone Distribution"`.
5. `xcodebuild -exportArchive -archivePath build/App.xcarchive
   -exportOptionsPlist ExportOptions.plist -exportPath build/ipa`.
6. `xcrun altool --upload-app -t ios -f build/ipa/App.ipa
   --apiKey $IOS_APP_STORE_CONNECT_KEY_ID
   --apiIssuer $IOS_APP_STORE_CONNECT_ISSUER_ID`.

`ExportOptions.plist` lives at `ios/App/ExportOptions.plist` and
specifies `app-store` as the `method`.

## Operator checklist per release

1. Confirm the signed `release.yml` run produced a `build/App.ipa`
   artifact (attached to the tag).
2. Open [App Store Connect](https://appstoreconnect.apple.com) →
   Voxel Realms → TestFlight.
3. Wait for Apple's processing to finish (typically 10–30 min).
4. Submit the build to an internal testing group for one smoke pass
   on a physical iPhone.
5. After one internal pass, submit for external TestFlight beta
   review (first submission takes up to 24 h, later updates usually
   clear in an hour).
6. When ready for public release, promote the build from TestFlight
   to the Ready for Review queue and attach the required App Store
   metadata (see [store-listing.md](./store-listing.md)).

## Manual fallback (while CI signing is still pending)

Until the pipeline above is wired up, the operator can:

1. Download the `App.xcarchive` artifact from the release tag.
2. Unzip it into `~/Library/Developer/Xcode/Archives/`.
3. Open Xcode → Window → Organizer → Archives.
4. Select the new archive → Distribute App → App Store Connect.
5. Follow the signing wizard — Xcode will pull the Distribution
   Certificate and Provisioning Profile from the developer account
   automatically.

This is tolerable for a handful of pre-1.0 TestFlight builds and becomes
untenable once the cadence exceeds one build per week.

## Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) — overall CI/CD surface
- [RELEASE.md](./RELEASE.md) — release-please tag workflow
- [store-listing.md](./store-listing.md) — required App Store metadata
- [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) — pre-submission checklist
