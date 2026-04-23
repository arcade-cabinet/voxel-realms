---
title: Assets
updated: 2026-04-23
status: current
domain: content
---

# Assets

This document owns renderer posture, raw asset handling, runtime promotion, and
curation priorities. Gameplay goals live in [DESIGN.md](./DESIGN.md). Technical
implementation lives in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Renderer Decision

Stay on the current React Three Fiber, drei, and Rapier stack.

JollyPixel remains interesting, but it is not the right pivot for the current
problem. The repo already ships deterministic terrain, realm validation,
Capacitor support, browser capture, and a curated GLB-driven asset pipeline.
JollyPixel becomes relevant only if Voxel Realms turns into an editable block
terrain product.

## Asset Posture

- `raw-assets/` is the local-only vendor dump area. It should stay gitignored.
- `public/assets/models/` is the curated runtime-facing catalog.
- `public/assets/fonts/brand/` is the tracked local brand type system.
- `public/assets/sql-wasm.wasm` is the tracked web SQLite runtime dependency.

The game should never ship every purchased voxel pack. The shipping catalog must
remain role-driven and budgeted.

## Chaos Slice Rule

The first tracked model slice intentionally follows one rule:

- pick one usable asset from each top-level source archive
- keep the full vendor dump local-only
- publish only the curated slice plus required sidecars
- let the random cast suggest realm identities instead of forcing a fake
  unified world too early

Regeneration commands:

```bash
pnpm assets:chaos-slice -- --seed chaos-goblin-first-slice-2026-04-22
pnpm assets:chaos-glb
pnpm assets:static-variants
pnpm realm:assets
```

## Runtime Promotion Policy

The catalog is budgeted by promotion tier:

- `inline`: small GLB assets safe for immediate runtime use.
- `safe`: runtime-eligible GLBs that should still respect active-load limits.
- `deferred`: heavy GLB sources that need static variants or selective loading.
- `reference`: non-runtime assets that stay in the catalog for future conversion
  or design reference.

As of the current catalog report:

- 27 assets are cataloged across the first archetype set.
- 17 of 27 are safe-policy promotable source assets.
- 8 deferred heavy character sources have runtime static variants.
- 2 assets remain reference-only.
- The render gate allows at most 4 active models and 4.0 MB of active bytes.

## Current Budget Snapshot

`pnpm realm:assets` currently reports:

- 17 of 27 safe-policy promotable assets.
- 19.3 MB of promotable source assets.
- 297.5 MB of total cataloged source bytes.
- 25 of 27 runtime candidates when static variants are counted.
- 22.0 MB of renderable runtime bytes.

Archetype summary from the live report:

- Jungle: 7 of 7 promotable.
- Ocean: 3 of 6 promotable, 1 deferred character, 2 reference house assets.
- Steampunk: 3 of 6 promotable, 2 deferred character assets.
- Dinosaur: 5 of 6 promotable, 1 deferred character asset.
- Arctic: 2 of 6 promotable, 4 deferred character assets.

## Runtime Shipping Rules

- Static variants are preferred for heavy character GLBs.
- `scripts/copy-public-assets.mjs` prunes oversized source GLBs from `dist`.
- Production builds ship manifests and runtime-safe assets, not the whole raw
  source library.
- Marker-only anomalies are acceptable when the source asset is deferred.
- Promotion happens by gameplay role, not by purchase-pack loyalty.

## Curation Direction

The random cast already suggests a coherent fiction: the player is surveying
broken realms where unrelated voxel creatures, props, factions, and structures
bleed into each other as anomalies. That means the right curation direction is:

- one dominant biome identity per realm
- a few controlled intrusion signals
- clear anchor assets for objectives and hazards
- no "everything everywhere all at once" runtime clutter

## Remaining Work In This Domain

- Replace more primitive anomaly markers with curated runtime models by biome and
  gameplay role.
- Produce trimmed animation banks or lighter gameplay variants for heavy
  character assets.
- Decide whether VOX-only assets need a tracked conversion pipeline or stay
  reference-only.
- Add stronger hand-authored biome sets so the generator is not relying on the
  initial chaos slice forever.
- Generate store and marketing art from the same tracked asset vocabulary.
- Decide when texture compression or mesh LOD work is worth the added pipeline
  complexity.
