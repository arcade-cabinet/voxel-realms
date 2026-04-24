/**
 * Empty stub for @dimforge/rapier3d. JP voxel-renderer re-exports
 * VoxelColliderBuilder which transitively imports rapier3d (a 3+ MB
 * WASM module). We don't use physics colliders — we use the deterministic
 * realm-validation engine in src/engine instead — so we alias the rapier
 * import to this stub in vite.config.ts. Keeps the bundle slim and
 * prevents vite's transform from running out of memory inlining the
 * rapier WASM as base64.
 */

const stub: Record<string, never> = new Proxy({} as Record<string, never>, {
  get() {
    throw new Error(
      "@dimforge/rapier3d is stubbed in voxel-realms; the deterministic " +
        "engine in src/engine handles collision instead. Remove the alias in " +
        "vite.config.ts if you actually need physics."
    );
  },
});

export default stub;
