import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const blender = getArgValue("--blender") ?? "/opt/homebrew/bin/blender";
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const outputRoot = path.join(root, "public", "assets", "models", "static-variants");
const manifestPath = path.join(outputRoot, "manifest.json");
const pythonScriptPath = path.join(os.tmpdir(), "voxel-realms-static-variant.py");

const deferredVariants = [
  {
    id: "clown",
    label: "Clown Intrusion",
    sourcePublicPath: "/assets/models/chaos-slice/gltf-files/Clown_Character_glt.glb",
  },
  {
    id: "dwarf",
    label: "Dwarf Surveyor",
    sourcePublicPath: "/assets/models/chaos-slice/voxel-dwarf-characters-pack/Dwarf 05.glb",
  },
  {
    id: "goblin",
    label: "Goblin Signal",
    sourcePublicPath: "/assets/models/chaos-slice/goblin-characters-pack-upload/Goblin 3.glb",
  },
  {
    id: "mermaid",
    label: "Mermaid Echo",
    sourcePublicPath:
      "/assets/models/chaos-slice/voxel-mermaid-characters-pack-upload/MermaidFemale03.glb",
  },
  {
    id: "mother",
    label: "Neanderthal Mother",
    sourcePublicPath: "/assets/models/chaos-slice/voxel-neanderthal-characters-pack/Mother.glb",
  },
  {
    id: "samurai",
    label: "Ronin Signal",
    sourcePublicPath: "/assets/models/chaos-slice/voxel-ronin-samurai-pack/Samurai GLTF.glb",
  },
  {
    id: "steampunk",
    label: "Steampunk Scout",
    sourcePublicPath: "/assets/models/chaos-slice/voxel-steampunk-characters-pack/Female_A1.glb",
  },
  {
    id: "viking",
    label: "Viking Echo",
    sourcePublicPath: "/assets/models/chaos-slice/voxel-viking-characters-upload/Male_D1.glb",
  },
];

if (!fs.existsSync(blender)) {
  throw new Error(`Missing Blender executable: ${blender}`);
}

writeBlenderScript(pythonScriptPath);
fs.mkdirSync(outputRoot, { recursive: true });

const entries = [];

for (const variant of deferredVariants) {
  const sourcePath = path.join(root, variant.sourcePublicPath.replace(/^\//, "public/"));
  const outputPublicPath = `/assets/models/static-variants/${variant.id}/${slugify(
    path.basename(variant.sourcePublicPath, ".glb")
  )}.static.glb`;
  const outputPath = path.join(root, outputPublicPath.replace(/^\//, "public/"));
  const warnings = [];

  if (!fs.existsSync(sourcePath)) {
    warnings.push(`Missing source: ${variant.sourcePublicPath}`);
  }

  if (fs.existsSync(outputPath) && !force) {
    console.log(`skip: ${variant.id} already exists`);
  } else if (!dryRun && warnings.length === 0) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    console.log(`static: ${path.relative(root, sourcePath)} -> ${path.relative(root, outputPath)}`);
    execFileSync(
      blender,
      [
        "--background",
        "--factory-startup",
        "--python",
        pythonScriptPath,
        "--",
        sourcePath,
        outputPath,
      ],
      { stdio: "inherit" }
    );
  } else {
    console.log(`dry-run: ${variant.id}`);
  }

  entries.push({
    ...variant,
    variantPublicPath: outputPublicPath,
    sourceBytes: fs.existsSync(sourcePath) ? fs.statSync(sourcePath).size : 0,
    variantBytes: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
    sizeReduction:
      fs.existsSync(sourcePath) && fs.existsSync(outputPath)
        ? round(1 - fs.statSync(outputPath).size / fs.statSync(sourcePath).size, 4)
        : null,
    warnings,
  });
}

const manifest = {
  title: "Voxel Realms Static Variants",
  generatedAt: new Date().toISOString(),
  tool: {
    name: "Blender",
    executable: blender,
    command: "import GLB, clear animation data, export GLB with export_animations=false",
  },
  rule: "Static variants are generated only for deferred chaos-slice GLB character assets. They preserve the source asset as metadata and never replace vendor/source files.",
  entries,
};

if (!dryRun) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const converted = entries.filter((entry) => entry.variantBytes > 0);
const sourceBytes = converted.reduce((sum, entry) => sum + entry.sourceBytes, 0);
const variantBytes = converted.reduce((sum, entry) => sum + entry.variantBytes, 0);
console.log(
  `static variants: ${converted.length}/${entries.length}, ${formatBytes(sourceBytes)} -> ${formatBytes(
    variantBytes
  )}`
);

function getArgValue(name) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function writeBlenderScript(dest) {
  fs.writeFileSync(
    dest,
    `import bpy
import sys
from pathlib import Path

args = sys.argv
input_path = Path(args[args.index("--") + 1])
output_path = Path(args[args.index("--") + 2])

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=str(input_path))

for obj in bpy.data.objects:
    obj.animation_data_clear()

for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

output_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(output_path),
    export_format="GLB",
    export_animations=False,
    export_yup=True,
    export_apply=False,
)
print(f"WROTE {output_path}")
`
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function round(value, precision) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
