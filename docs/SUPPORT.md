---
title: Support
updated: 2026-04-24
status: draft
domain: ops
---

# Voxel Realms — Support

Voxel Realms is a single-developer passion project built in public.
Support happens through GitHub issues; there is no email support
line today.

## Where to get help

- **Report a bug or regression**: open a new issue in the repository
  using the "Bug" template once it exists
  ([issue tracker](https://github.com/arcade-cabinet/voxel-realms/issues)).
- **Request a feature**: use the "Feature request" template.
- **Ask a question**: tag the issue with `question`.

## What to include in a bug report

A good bug report for Voxel Realms includes:

1. **Platform**: web (browser + version), Android (device + OS), or iOS (device + OS).
2. **App version**: visible in the bottom of the landing page once the version chip lands
   (tracked as a follow-up).
3. **Steps to reproduce**: realm archetype, seed if known, what you tried.
4. **Expected vs. actual**: what you expected, what happened instead.
5. **If crash**: if you enabled "Error telemetry" in Settings, paste
   the local error log. The log is stored on your device only and
   contains captured stack traces with `/Users/<name>/` paths already
   redacted.
6. **Screenshots**: optional but help a lot for visual or layout bugs.

## Response time

This is a side project with no SLA. Reasonable response time is days,
not hours.

## Security reports

Security issues should be reported privately through
[GitHub Security Advisories](https://github.com/arcade-cabinet/voxel-realms/security/advisories/new)
rather than filed as public issues, so we can coordinate a fix before
disclosure.

## Open questions (before submit)

- [ ] Decide whether to add a dedicated support email (required on some
      Android submission questionnaires for apps that target 13+; not
      required if the issue tracker is the advertised channel).
- [ ] Add a feedback control inside the app that links to the issue
      tracker (tracked as P9.3).
- [ ] Confirm the Security Advisories route is enabled in the repo
      before linking.
