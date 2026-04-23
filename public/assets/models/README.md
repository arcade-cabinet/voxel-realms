# Voxel Realms Model Assets

This folder contains the public chaos slice: one usable model selected from each original top-level zip archive in `raw-assets/archives`.

The full purchased/vendor asset dumps remain local-only under `raw-assets/`, which is gitignored. Do not bulk-promote the raw dumps into `public/`; add assets intentionally through the manifest.

Selection rule: prefer GLB/GLTF when a pack has web-ready models, otherwise OBJ, otherwise VOX. See `manifest.json` for the exact source path, seed, and copied files for every pick.

Regenerate and package GLTF picks as GLB with:

```bash
pnpm assets:chaos-slice -- --seed chaos-goblin-first-slice-2026-04-22
pnpm assets:chaos-glb
pnpm assets:static-variants
```

Runtime model loading is gated by `src/games/voxel-realms/engine/realmAssetBudget.ts`.

Check the current promotion budget with:

```bash
pnpm realm:assets
```

Only `inline` and `safe` GLBs should be considered for promotion. The route renderer uses the active player position to load selected runtime-model GLBs under a small model-count and byte budget. Heavy animated character source exports remain `deferred`; generated files under `static-variants/` provide lightweight static runtime candidates for those characters. OBJ/VOX picks remain `reference` assets until converted or loaded intentionally.

Production builds prune chaos-slice source GLBs above 3 MB from `dist`; see `dist/assets/models/pruned-assets.json` after `pnpm build`. The public source catalog remains intact for local curation.

Verify runtime paths with:

```bash
pnpm assets:verify-runtime
pnpm assets:verify-runtime -- --dist
```
