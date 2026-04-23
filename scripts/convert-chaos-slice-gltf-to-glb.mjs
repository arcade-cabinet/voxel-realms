import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "public", "assets", "models", "manifest.json");
const cliPackage = "@gltf-transform/cli@4.3.0";

if (!fs.existsSync(manifestPath)) {
  throw new Error("Missing public/assets/models/manifest.json. Run pnpm assets:chaos-slice first.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let convertedCount = 0;

for (const entry of manifest.entries ?? []) {
  if (entry.status !== "selected" || !entry.publicPath?.toLowerCase().endsWith(".gltf")) {
    continue;
  }

  const input = path.join(root, "public", entry.publicPath.replace(/^\/assets\//, "assets/"));
  const output = input.replace(/\.gltf$/i, ".glb");
  if (!fs.existsSync(input)) {
    entry.warnings = [
      ...(entry.warnings ?? []),
      `Missing input for GLB conversion: ${entry.publicPath}`,
    ];
    continue;
  }

  console.log(`convert: ${path.relative(root, input)} -> ${path.relative(root, output)}`);
  execFileSync("npx", ["--yes", cliPackage, "copy", input, output], { stdio: "inherit" });

  fs.rmSync(input);
  for (const copied of entry.copiedFiles ?? []) {
    if (copied === path.basename(input)) continue;
    const copiedPath = path.join(path.dirname(input), copied);
    if (fs.existsSync(copiedPath)) fs.rmSync(copiedPath);
  }

  const oldPath = entry.publicPath;
  entry.publicPath = oldPath.replace(/\.gltf$/i, ".glb");
  entry.copiedFiles = [path.basename(output)];
  entry.optimization = {
    convertedFrom: path.basename(input),
    tool: cliPackage,
    command: "gltf-transform copy",
    compression: "none",
    note: "Lossless GLTF to GLB packaging. Does not strip animations or apply decoder-dependent compression.",
  };
  convertedCount += 1;
}

manifest.assetPipeline = [
  ...(manifest.assetPipeline ?? []),
  {
    step: "convert-gltf-to-glb",
    generatedAt: new Date().toISOString(),
    tool: cliPackage,
    convertedCount,
  },
];

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`converted ${convertedCount} GLTF files to GLB`);
