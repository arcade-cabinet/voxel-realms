---
title: Trailer Capture
updated: 2026-04-24
status: current
domain: ops
---

# Trailer Capture

The trailer loop (P8.5) is captured by a Playwright spec at
`e2e/trailer.spec.ts`. The spec drives a cold-player journey
(landing → Enter Realm → HUD populated → coach advance → hold on
populated HUD) while Playwright records a WebM of the viewport.

The output is raw footage — it is the **starting point** for a
trailer, not the final artifact. The editor pass still needs to:

- Crop to the target aspect (16:9 for YouTube, 9:16 for Shorts).
- Re-encode to MP4 (Play Console) or GIF/PNG (App Store still).
- Overlay the brand wordmark.
- Cut silence and compress to the target duration.

## Running the capture

```bash
pnpm install
pnpm build
pnpm test:trailer
```

The WebM lands under `test-results/desktop-chromium-voxel-realms-trailer-capture-cold-player-realm-mount-HUD-populated/`
(Playwright's test-id-based directory layout). The exact filename is
`video.webm`.

## Capture parameters

| Field | Value |
|---|---|
| Resolution | 1280 x 720 (16:9) |
| Duration | ~25 seconds (sum of waits in the spec) |
| Format | WebM (Playwright default) |
| Framerate | Playwright default (25 fps on Chromium) |

If a different aspect ratio is needed, adjust the `viewport` +
`video.size` on `test.use` in `e2e/trailer.spec.ts`. For vertical
shorts, set both to `{ width: 720, height: 1280 }`.

## Why Playwright rather than the browser DevTools recorder

- Deterministic. A scripted journey always produces the same runtime
  footage; DevTools-recorded manual plays drift.
- Headless in CI. The same spec can run under `xvfb-run` on a Linux
  runner to regenerate the footage when the game's visual language
  shifts.
- Source-controlled. The script is a tiny TypeScript file in `e2e/`,
  reviewable alongside the game changes that make it stale.

## Post-processing

A minimal re-encode to MP4 (install ffmpeg locally):

```bash
ffmpeg -i test-results/.../video.webm \
  -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  trailer-1280x720.mp4
```

For a looping GIF trimmed to the first 6 seconds:

```bash
ffmpeg -i test-results/.../video.webm \
  -ss 0 -t 6 \
  -vf "fps=18,scale=640:-1:flags=lanczos" \
  -loop 0 \
  trailer-640.gif
```

## Exclusions

The trailer spec is tagged `@trailer` and excluded from:

- `pnpm test:e2e`
- `pnpm test:e2e:ci`
- `pnpm test:e2e:matrix`

so it never slows PR or nightly runs. It is also excluded from the
nightly-e2e-matrix workflow via the same grep-invert.

## Related docs

- [store-listing.md](./store-listing.md) — copy that accompanies the trailer on stores
- [LAUNCH_READINESS.md](./LAUNCH_READINESS.md) — pre-submission checklist
- [TESTING.md](./TESTING.md) — full test script inventory
