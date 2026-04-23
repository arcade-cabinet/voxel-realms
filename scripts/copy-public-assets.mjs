import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");
const modelDistDir = path.join(distDir, "assets", "models");
const maxRuntimeSourceGlbBytes = 3 * 1024 * 1024;
const copiedFiles = [];
const skippedFiles = [];

if (!fs.existsSync(publicDir)) {
  console.log("No public directory to copy.");
  process.exit(0);
}

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(modelDistDir, { recursive: true, force: true });
copyPublicDirectory(publicDir, distDir);
writePruningReport();

const copiedBytes = copiedFiles.reduce((sum, file) => sum + file.bytes, 0);
const skippedBytes = skippedFiles.reduce((sum, file) => sum + file.bytes, 0);

console.log(
  `Copied public assets into ${path.relative(root, distDir)} ` +
    `(${copiedFiles.length} files, ${formatBytes(copiedBytes)} copied, ` +
    `${formatBytes(skippedBytes)} pruned).`
);

function copyPublicDirectory(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyPublicDirectory(src, dest);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relativePublicPath = path.relative(publicDir, src);
    const bytes = fs.statSync(src).size;
    const skipReason = getSkipReason(relativePublicPath, bytes);

    if (skipReason) {
      skippedFiles.push({
        publicPath: `/${relativePublicPath}`,
        bytes,
        reason: skipReason,
      });
      continue;
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copiedFiles.push({
      publicPath: `/${relativePublicPath}`,
      bytes,
    });
  }
}

function getSkipReason(relativePublicPath, bytes) {
  const normalized = relativePublicPath.split(path.sep).join("/");

  if (
    normalized.startsWith("assets/models/chaos-slice/") &&
    normalized.toLowerCase().endsWith(".glb") &&
    bytes > maxRuntimeSourceGlbBytes
  ) {
    return "Pruned from dist: oversized chaos-slice source GLB has no direct runtime load path.";
  }

  return null;
}

function writePruningReport() {
  if (!skippedFiles.length) {
    return;
  }

  fs.mkdirSync(modelDistDir, { recursive: true });
  fs.writeFileSync(
    path.join(modelDistDir, "pruned-assets.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rule: "Production dist excludes chaos-slice source GLBs above 3 MB. Runtime loads small source GLBs or generated static variants instead.",
        copiedFiles: copiedFiles.length,
        copiedBytes: copiedFiles.reduce((sum, file) => sum + file.bytes, 0),
        skippedFiles,
      },
      null,
      2
    )}\n`
  );
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
