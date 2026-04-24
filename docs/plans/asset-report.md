---
title: Asset Report
updated: 2026-04-24
status: current
domain: plan
---

# Asset Report

Snapshot of `pnpm realm:assets` output. Refreshed manually; not auto-generated on every build. Regenerate by running `pnpm realm:assets` and pasting the output below.

This satisfies the P4.1 verification step — committing the report to the repo so asset promotion drift is visible in diffs rather than only in local runs.

## Headline numbers (2026-04-24)

- 17 / 27 assets pass the default safe-policy budget (19.3 MB promotable out of 297.5 MB cataloged).
- 25 / 27 anomalies render with a real model at runtime (17 source GLBs + 8 static variants = 22.0 MB renderable).
- 2 / 27 fall back to markers only — both are the `house-piece` (OBJ) and `vox-house` (VOX) reference-tier slots used as ocean/steampunk ruins.
- Render gate allows 4 active models / 4.0 MB total at a time; inline radius 42 m; safe radius 18 m.

## Full output

```
Realm asset budget: 17/27 safe-policy promotable, 19.3 MB promotable, 297.5 MB cataloged
Tiers: inline 7, safe 10, deferred 8, reference 2
Runtime candidates: 25/27, 17 source GLBs, 8 static variants, 22.0 MB renderable bytes
Render gate: max 4 active models, 4.0 MB active bytes, 42m inline radius, 18m safe radius
- Jungle | 7/7 promotable | 5.3 MB promotable | promote: Tall Tree (tree), Realm Plant (plant), Plant Shard (plant-shard), Python (python), Squirrel (squirrel), Honeycomb (honeycomb), Wood Dragon (wood-dragon)
- Ocean | 3/6 promotable | 4.2 MB promotable | promote: Octopus (octopus), Seal (seal), Osprey (osprey)
  defer: Mermaid Echo (mermaid)
  reference: Broken House Piece (house-piece), VOX House Reference (vox-house)
- Steampunk | 3/6 promotable | 800 KB promotable | promote: Trap (trap), Survey Cabinet (cabinet), Sword Relic (sword)
  defer: Steampunk Scout (steampunk), Clown Intrusion (clown)
  reference: Broken House Piece (house-piece)
- Dinosaur | 5/6 promotable | 10.3 MB promotable | promote: Ankylosaurus (ankylosaurus), Bull (bull), Griffin (griffin), Wood Dragon (wood-dragon), Giraffe (giraffe)
  defer: Neanderthal Mother (mother)
- Arctic | 2/6 promotable | 2.9 MB promotable | promote: Seal (seal), Osprey (osprey)
  defer: Viking Echo (viking), Dwarf Surveyor (dwarf), Ronin Signal (samurai), Goblin Signal (goblin)
```

## Notes

### Deferred characters have working static variants

The `defer` entries above are reported against the **source** tier only. `getRealmAssetRuntimeModel` falls back to the static variant in `public/assets/models/static-variants/<id>/` for these, so they do render at runtime — they just cannot use the 30–40 MB animated source GLB. See `REALM_STATIC_VARIANT_BY_ID` in `realmAssetBudget.ts`.

Static variants in play:
- clown (315 KB) · dwarf (289 KB) · goblin (396 KB) · mermaid (327 KB)
- mother (327 KB) · samurai (350 KB) · steampunk (562 KB) · viking (285 KB)

All are under the 750 KB inline-tier cap and render as static poses — the animation rig is lost in the optimization pass that produced them.

### True reference-tier (marker-only) anomalies

- `house-piece` — `modular-house-pack/Piece-69.obj`. OBJ format requires a non-GLB loader that the game doesn't currently carry. Used as an objective-critical ocean / steampunk anomaly; **P4.2** flags it for replacement.
- `vox-house` — `vox-modular-houses-pack/Brick_Cube.vox`. MagicaVoxel format; same loader-gap story. Objective-critical ocean slot; also flagged by P4.2.

Both are non-blocking for the default slice because the marker cube renders at the anomaly position, but they read as "asset work unfinished" to a cold player.

### Promotion policy + render gate constants

From `realmAssetBudget.ts`:
- `REALM_ASSET_INLINE_MAX_BYTES = 750 KB` — load immediately.
- `REALM_ASSET_SAFE_MAX_BYTES = 3 MB` — load when within the 18 m safe radius.
- `REALM_RENDERABLE_ASSET_MAX_ACTIVE_MODELS = 4` — upper bound on concurrent rendered models.
- `REALM_RENDERABLE_ASSET_MAX_ACTIVE_BYTES = 4 MB` — upper bound on concurrent bytes.
- Inline render radius: 42 m. Safe render radius: 18 m. Preload-only radii are wider.

### Refresh procedure

```bash
pnpm realm:assets > /tmp/asset-report.txt
# Paste the relevant sections into this doc; update the "Headline numbers" date.
```

## Related docs

- [ASSETS.md](../ASSETS.md) — renderer posture, runtime promotion policy
- [batch-tracker.md](./batch-tracker.md) — P4.1–P4.3 status
- `scripts/report-realm-assets.ts` — the report generator itself
