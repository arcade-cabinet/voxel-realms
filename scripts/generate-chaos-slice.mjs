import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const archiveDir = path.join(root, "raw-assets", "archives");
const extractedRoot = path.join(root, "raw-assets", "extracted");
const publicRoot = path.join(root, "public", "assets", "models");
const sliceRoot = path.join(publicRoot, "chaos-slice");
const extsByPreference = [[".glb", ".gltf"], [".obj"], [".vox"]];
const seed = getArgValue("--seed") ?? randomBytes(8).toString("hex");
const random = createSeededRandom(seed);

function getArgValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function createSeededRandom(seedValue) {
  let h = 2166136261;
  for (let i = 0; i < seedValue.length; i += 1) {
    h ^= seedValue.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomIndex(length) {
  return Math.floor(random() * length);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__MACOSX" || entry.name === ".DS_Store") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function copyFileSafe(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function decodeUriRef(ref) {
  try {
    return decodeURIComponent(ref);
  } catch {
    return ref;
  }
}

function copyGltfWithRefs(src, destDir) {
  const destName = path.basename(src);
  const dest = path.join(destDir, destName);
  copyFileSafe(src, dest);

  const copied = [destName];
  const warnings = [];
  const json = JSON.parse(fs.readFileSync(src, "utf8"));
  const refs = new Set();

  for (const buffer of json.buffers ?? []) {
    if (typeof buffer.uri === "string" && !buffer.uri.startsWith("data:")) refs.add(buffer.uri);
  }
  for (const image of json.images ?? []) {
    if (typeof image.uri === "string" && !image.uri.startsWith("data:")) refs.add(image.uri);
  }

  for (const ref of refs) {
    if (/^[a-z]+:/i.test(ref)) continue;
    const decoded = decodeUriRef(ref);
    const refSrc = path.resolve(path.dirname(src), decoded);
    if (!fs.existsSync(refSrc)) {
      warnings.push(`Missing GLTF reference: ${ref}`);
      continue;
    }

    const refDest = path.join(destDir, decoded);
    copyFileSafe(refSrc, refDest);
    copied.push(decoded);
  }

  return { entryFile: destName, copied, warnings };
}

function copyObjWithRefs(src, destDir) {
  const destName = path.basename(src);
  const dest = path.join(destDir, destName);
  copyFileSafe(src, dest);

  const copied = [destName];
  const warnings = [];
  const objText = fs.readFileSync(src, "utf8");
  const mtls = [...objText.matchAll(/^mtllib\s+(.+)$/gm)].map((match) => match[1].trim());

  for (const mtl of mtls) {
    const mtlSrc = path.resolve(path.dirname(src), mtl);
    if (!fs.existsSync(mtlSrc)) {
      warnings.push(`Missing OBJ material: ${mtl}`);
      continue;
    }

    const mtlDest = path.join(destDir, mtl);
    copyFileSafe(mtlSrc, mtlDest);
    copied.push(mtl);

    const mtlText = fs.readFileSync(mtlSrc, "utf8");
    const textureRefs = [...mtlText.matchAll(/^map_\S+\s+(.+)$/gm)].map((match) => match[1].trim());
    for (const texture of textureRefs) {
      const textureSrc = path.resolve(path.dirname(mtlSrc), texture);
      if (!fs.existsSync(textureSrc)) {
        warnings.push(`Missing OBJ texture: ${texture}`);
        continue;
      }

      const textureDest = path.join(destDir, texture);
      copyFileSafe(textureSrc, textureDest);
      copied.push(texture);
    }
  }

  return { entryFile: destName, copied, warnings };
}

function copyAsset(src, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const ext = path.extname(src).toLowerCase();
  if (ext === ".gltf") return copyGltfWithRefs(src, destDir);
  if (ext === ".obj") return copyObjWithRefs(src, destDir);

  const destName = path.basename(src);
  copyFileSafe(src, path.join(destDir, destName));
  return { entryFile: destName, copied: [destName], warnings: [] };
}

if (!fs.existsSync(archiveDir)) {
  throw new Error(`Missing archive directory: ${path.relative(root, archiveDir)}`);
}

fs.rmSync(publicRoot, { recursive: true, force: true });
fs.mkdirSync(sliceRoot, { recursive: true });

const archives = fs
  .readdirSync(archiveDir)
  .filter((name) => name.toLowerCase().endsWith(".zip"))
  .sort();
const entries = [];
for (const archiveName of archives) {
  const pack = path.basename(archiveName, ".zip");
  const slug = slugify(pack);
  const extractedDir = path.join(extractedRoot, slug);
  const allFiles = fs.existsSync(extractedDir) ? walk(extractedDir) : [];
  let selectedGroup = [];
  let selectedExtensions = [];

  for (const group of extsByPreference) {
    selectedGroup = allFiles.filter((file) => group.includes(path.extname(file).toLowerCase()));
    if (selectedGroup.length > 0) {
      selectedExtensions = group;
      break;
    }
  }

  if (selectedGroup.length === 0) {
    entries.push({ pack, archive: archiveName, slug, status: "no usable model found" });
    continue;
  }

  const chosen = selectedGroup[randomIndex(selectedGroup.length)];
  const destDir = path.join(sliceRoot, slug);
  const result = copyAsset(chosen, destDir);
  const publicPath = `/assets/models/chaos-slice/${slug}/${result.entryFile}`;

  entries.push({
    pack,
    archive: archiveName,
    slug,
    status: "selected",
    selectionPool: selectedExtensions.join(", "),
    candidateCount: selectedGroup.length,
    rawRelativePath: path.relative(root, chosen),
    publicPath,
    copiedFiles: result.copied,
    warnings: result.warnings,
  });
}

const manifest = {
  title: "Voxel Realms Chaos Slice",
  generatedAt: new Date().toISOString(),
  seed,
  rule: "One usable model per original top-level zip archive. Randomly selected from GLB/GLTF when available, otherwise OBJ, otherwise VOX.",
  totalArchives: archives.length,
  selectedCount: entries.filter((entry) => entry.status === "selected").length,
  entries,
};

fs.writeFileSync(path.join(publicRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(
  path.join(publicRoot, "README.md"),
  `# Voxel Realms Model Assets\n\nThis folder contains the public chaos slice: one usable model selected from each original top-level zip archive in \`raw-assets/archives\`.\n\nThe full purchased/vendor asset dumps remain local-only under \`raw-assets/\`, which is gitignored. Do not bulk-promote the raw dumps into \`public/\`; add assets intentionally through the manifest.\n\nSelection rule: prefer GLB/GLTF when a pack has web-ready models, otherwise OBJ, otherwise VOX. See \`manifest.json\` for the exact source path, seed, and copied files for every pick.\n\nRegenerate and package GLTF picks as GLB with:\n\n\`\`\`bash\npnpm assets:chaos-slice -- --seed chaos-goblin-first-slice-2026-04-22\npnpm assets:chaos-glb\n\`\`\`\n`
);

for (const entry of entries) {
  console.log(
    entry.status === "selected"
      ? `${entry.slug}: ${entry.publicPath}`
      : `${entry.slug}: ${entry.status}`
  );
}
