/**
 * Copy WASM artifacts from node_modules into public/assets/ at install
 * + prebuild time, so the bundler never has to touch them. Static
 * `<base>/assets/<file>.wasm` URLs are then fetched at runtime by
 * whichever module needs them.
 *
 * Why not let vite handle it: vite's transform inlines `.wasm` as
 * base64 by default, which OOMs the build worker pool for anything
 * over a few hundred KB. Copying to public/ keeps the WASM as a
 * separate static asset, which matches how every other JP/wasm
 * reference project ships these (sql.js, rapier3d, etc.).
 *
 * Add an entry below when a new WASM-shipping dep gets added. The
 * artifact gets copied at `pnpm install` (postinstall) and at
 * `pnpm run build` (prebuild).
 */

import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/**
 * Each entry: { source: relative-to-root path under node_modules,
 *               destination: relative-to-root path under public,
 *               optional: bool }
 *
 * `optional: true` skips silently if the source isn't installed
 * (e.g. rapier is a transitive dep that pnpm may or may not unpack
 * depending on resolution).
 */
const ARTIFACTS = [
  {
    source: "node_modules/sql.js/dist/sql-wasm.wasm",
    destination: "public/assets/sql-wasm.wasm",
  },
  {
    source: "node_modules/@dimforge/rapier3d/rapier_wasm3d_bg.wasm",
    destination: "public/assets/rapier_wasm3d_bg.wasm",
    optional: true,
  },
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

for (const artifact of ARTIFACTS) {
  const src = resolve(root, artifact.source);
  const dst = resolve(root, artifact.destination);

  if (!(await exists(src))) {
    if (artifact.optional) {
      continue;
    }
    throw new Error(`prepare-web-wasm: required artifact missing: ${artifact.source}`);
  }

  await mkdir(dirname(dst), { recursive: true });
  await copyFile(src, dst);
}
