---
title: Android Signing and Distribution
updated: 2026-04-24
status: current
domain: ops
---

# Android Signing and Distribution

Voxel Realms ships to Android via Capacitor + Gradle. `release.yml`
already contains a signing-aware job that builds a store-grade AAB
when the required repository secrets are provisioned — this document
describes how to get the keystore, how to populate the secrets, and
how to promote the resulting artifact to Google Play.

## Current state

- `ci.yml` builds an unsigned debug APK on every PR (playtest harness).
- `cd.yml` builds + uploads an unsigned debug APK on every push to main
  (latest build surface).
- `release.yml` runs on release-please tags; if signing secrets are
  present, it produces a **signed release AAB**; otherwise it falls
  back to a **debug AAB** and warns in logs.

## Generate the release keystore

Do this once per release identity. Keep the resulting `.jks` file in a
password manager; this keystore is what Google Play uses to recognize
future updates as coming from the same publisher.

```bash
keytool -genkey -v \
  -keystore voxel-realms-release.jks \
  -alias voxel-realms \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store answers:

| Field | Value |
|---|---|
| First and last name | `Voxel Realms` (or the publishing entity name) |
| Organizational unit | `Arcade Cabinet` |
| Organization | `Arcade Cabinet` |
| City / State / Country | whatever the publisher's filing address is |

Set a **strong** keystore password and a **different** key password.
Back up the `.jks` file to at least two locations (password manager
export + offline drive). Losing it means you cannot ship updates to
an existing Play listing.

## Provision repository secrets

Encode the keystore for GitHub Actions:

```bash
base64 -i voxel-realms-release.jks -o voxel-realms-release.jks.base64
```

Then add the following to the repository's GitHub Actions secrets
(Settings → Secrets and variables → Actions):

| Secret | Contents |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contents of `voxel-realms-release.jks.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password from keytool |
| `ANDROID_KEY_ALIAS` | `voxel-realms` (or whatever alias you chose) |
| `ANDROID_KEY_PASSWORD` | key password from keytool |

The existing `release.yml` step at
`.github/workflows/release.yml` already reads these — no workflow
changes required once the secrets exist.

## Verify the pipeline

After pushing the secrets:

1. Trigger a release-please PR merge (or manually re-run `release.yml`
   via `workflow_dispatch`).
2. The workflow log should print `Signing release AAB with keystore`
   instead of `No signing keystore configured; building debug AAB.`.
3. Download the AAB artifact from the tagged release.
4. Run `jarsigner -verify -verbose -certs app-release.aab` locally.
   Output should end with `jar verified.` and list the expected
   `CN=Voxel Realms` entry.

## Promote to Google Play

1. Open [Google Play Console](https://play.google.com/console) →
   create an app entry with package name
   `com.arcadecabinet.voxelrealms` (matches `capacitor.config.ts`
   `appId` and the Gradle `applicationId`).
2. Enable **Play App Signing** — Google re-signs uploaded AABs with
   its own store key. The upload key you generated above stays with
   you; the Play signing key stays with Google.
3. Create an **Internal testing** track and upload the signed AAB.
4. After one internal build lands, submit for **Closed testing**.
5. When ready for public release, promote to **Production** and fill
   out the required store listing (see
   [store-listing.md](./store-listing.md)).

## Operator notes

- Never commit the keystore. `.gitignore` does not contain a default
  exclusion for `.jks` — add one (`*.jks`) if you ever store one under
  `android/` for local signing tests.
- The key password and keystore password are separate. `keytool`
  defaults them to the same value, but splitting them is good hygiene.
- If the key ever leaks, you cannot rotate the Play signing identity
  without re-listing as a new app. Treat it like a production secret.

## Related docs

- [iOS_SIGNING.md](./iOS_SIGNING.md) — iOS counterpart
- [DEPLOYMENT.md](./DEPLOYMENT.md) — overall CI/CD surface
- [RELEASE.md](./RELEASE.md) — release-please tag workflow
- [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) — pre-submission checklist
