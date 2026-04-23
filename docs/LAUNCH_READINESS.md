---
title: Launch Readiness
updated: 2026-04-23
status: current
domain: ops
---

# Launch Readiness

This is the manual checklist to run before a broader public playtest drop or any
store-submission attempt. Automated CI/CD is assumed green first.

## Local Quality Gates

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:browser`
- [ ] `pnpm test:golden`
- [ ] `pnpm realm:validate -- --sequence-count 10`
- [ ] `pnpm build`
- [ ] `pnpm realm:assets` reviewed for unexpected budget drift

## Mobile Validation

- [ ] Android physical device: install, launch, start run, scan signal, reach
      gate, complete next-realm rollover
- [ ] iOS physical device: same golden path
- [ ] Android kill-and-resume behavior checked
- [ ] iOS kill-and-resume behavior checked
- [ ] Touch controls feel acceptable in portrait on a real phone
- [ ] Status bar and safe areas are visually correct on notch devices
- [ ] Splash and first-frame transition feel intentional on native builds

## Browser And Visual Validation

- [ ] GitHub Pages build resolves with no console errors
- [ ] Start, signal, and goal captures still look correct
- [ ] Landing page reads like a product, not a prototype
- [ ] HUD remains readable on small screens

## Persistence

- [ ] Preferences survive restart on web and native shells
- [ ] Current-run save/load behavior is confirmed from a player-facing flow
- [ ] No corrupted-state warnings appear under normal usage

## Release Infrastructure

- [ ] `ci.yml` green on the final PR
- [ ] `cd.yml` green on `main`
- [ ] `release.yml` green on the latest release commit or tag
- [ ] Pages URL responds successfully
- [ ] Android debug artifact uploaded on the latest `main` run

## Store-Submission Blockers

- [ ] Android signing secrets configured
- [ ] iOS signing and distribution credentials configured
- [ ] Store listing copy finalized
- [ ] Screenshots and trailer assets prepared
- [ ] Privacy/support/legal requirements reviewed

## Sign-Off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Product |  |  |  |
| Engineering |  |  |  |
| QA |  |  |  |
| Design |  |  |  |
