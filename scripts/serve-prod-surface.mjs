#!/usr/bin/env node
// Serve dist/ under /voxel-realms/ so Playwright's @prod-surface specs
// hit the exact base path GitHub Pages uses. Caller must have built
// with VITE_BASE_PATH=voxel-realms first — pnpm test:e2e:prod-surface
// does that automatically.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..", "dist");
const prefix = "/voxel-realms";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "41744" },
  },
});
const port = Number(values.port);

if (!existsSync(root)) {
  console.error(
    `[serve-prod-surface] dist/ not found at ${root}. Build first: VITE_BASE_PATH=voxel-realms pnpm build`
  );
  process.exit(1);
}

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  const path = url.pathname;

  if (path === "/" || path === prefix || path === `${prefix}`) {
    res.writeHead(302, { location: `${prefix}/` });
    res.end();
    return;
  }

  if (!path.startsWith(`${prefix}/`)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end(`404 Not Found (expected prefix ${prefix}/)`);
    return;
  }

  const rel = path.slice(prefix.length + 1) || "index.html";
  let filePath = join(root, rel);

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    // SPA fallback mirrors how GitHub Pages would serve the client
    // router (there isn't one right now, but keep the behaviour
    // predictable).
    filePath = join(root, "index.html");
    if (!existsSync(filePath)) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
  }

  const mime = mimeByExt[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
  createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[serve-prod-surface] serving ${root} on http://127.0.0.1:${port}${prefix}/`);
});

const shutdown = () => {
  server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
