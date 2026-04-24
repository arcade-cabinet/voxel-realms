import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  type RealmVisualManifest,
  validateRealmVisualManifest,
} from "@assets/visual-manifest";

export interface VisualManifestVerifierOptions {
  manifestPath: string;
}

export interface VisualManifestVerifierCliOptions extends VisualManifestVerifierOptions {
  json?: boolean;
}

export interface VisualArtifactIssue {
  code:
    | "manifest-missing"
    | "manifest-parse-error"
    | "capture-file-missing"
    | "capture-file-size-mismatch"
    | "capture-file-digest-mismatch";
  message: string;
  path?: string;
  value?: number | string;
  limit?: number | string;
}

export interface VisualArtifactReport {
  valid: boolean;
  manifestPath: string;
  semanticIssues: ReturnType<typeof validateRealmVisualManifest>["issues"];
  artifactIssues: VisualArtifactIssue[];
  captures: Array<{
    kind: string;
    path: string;
    base64Length: number;
    sha256: string;
  }>;
}

export function verifyVisualManifest({
  manifestPath: requestedManifestPath,
}: VisualManifestVerifierOptions): VisualArtifactReport {
  const manifestPath = path.resolve(process.cwd(), requestedManifestPath);
  const artifactIssues: VisualArtifactIssue[] = [];
  let manifest: RealmVisualManifest | undefined;

  if (!existsSync(manifestPath)) {
    artifactIssues.push({
      code: "manifest-missing",
      message: "Visual manifest file does not exist. Run pnpm test:browser first.",
      path: manifestPath,
    });
  } else {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as RealmVisualManifest;
    } catch (error) {
      artifactIssues.push({
        code: "manifest-parse-error",
        message: error instanceof Error ? error.message : "Unable to parse visual manifest JSON.",
        path: manifestPath,
      });
    }
  }

  const semanticIssues = manifest ? validateRealmVisualManifest(manifest).issues : [];
  const captures = manifest?.captures ?? [];

  for (const capture of captures) {
    const capturePath = resolveCapturePath(capture.path);

    if (!existsSync(capturePath)) {
      artifactIssues.push({
        code: "capture-file-missing",
        message: `${capture.kind} capture file does not exist.`,
        path: capturePath,
      });
      continue;
    }

    const file = readFileSync(capturePath);
    const base64Length = Math.ceil(file.length / 3) * 4;
    const sha256 = createHash("sha256").update(file).digest("hex");

    if (base64Length !== capture.base64Length) {
      artifactIssues.push({
        code: "capture-file-size-mismatch",
        message: `${capture.kind} capture byte payload does not match manifest metadata.`,
        path: capturePath,
        value: base64Length,
        limit: capture.base64Length,
      });
    }

    if (sha256 !== capture.sha256) {
      artifactIssues.push({
        code: "capture-file-digest-mismatch",
        message: `${capture.kind} capture digest does not match manifest metadata.`,
        path: capturePath,
        value: sha256,
        limit: capture.sha256,
      });
    }
  }

  return {
    valid: semanticIssues.length === 0 && artifactIssues.length === 0,
    manifestPath,
    semanticIssues,
    artifactIssues,
    captures: captures.map((capture) => ({
      kind: capture.kind,
      path: resolveCapturePath(capture.path),
      base64Length: capture.base64Length,
      sha256: capture.sha256,
    })),
  };
}

export function parseVisualManifestVerifierArgs(args: string[]): VisualManifestVerifierCliOptions {
  const options: VisualManifestVerifierCliOptions = {
    manifestPath: "test-screenshots/voxel-realms-manifest.json",
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--manifest") {
      options.manifestPath = args[++index] ?? options.manifestPath;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printVisualManifestVerifierHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function printVisualManifestVerifierReport(report: VisualArtifactReport) {
  if (report.valid) {
    console.log(
      `Visual manifest verification: valid (${report.captures.length} captures, ${report.manifestPath})`
    );
    for (const capture of report.captures) {
      console.log(`- ${capture.kind}: ${path.relative(process.cwd(), capture.path)}`);
    }
    return;
  }

  console.log(`Visual manifest verification: invalid (${report.manifestPath})`);

  for (const issue of report.semanticIssues) {
    console.log(`- semantic ${issue.code}: ${issue.message}`);
  }

  for (const issue of report.artifactIssues) {
    const location = issue.path ? ` (${path.relative(process.cwd(), issue.path)})` : "";
    const value = issue.value === undefined ? "" : ` value=${issue.value}`;
    const limit = issue.limit === undefined ? "" : ` expected=${issue.limit}`;
    console.log(`- artifact ${issue.code}: ${issue.message}${location}${value}${limit}`);
  }
}

export function printVisualManifestVerifierHelp() {
  console.log(`Usage: pnpm realm:verify-visual [options]

Options:
  --manifest <path>        Manifest JSON path. Default: test-screenshots/voxel-realms-manifest.json.
  --json                   Print JSON report.
`);
}

function resolveCapturePath(capturePath: string) {
  return path.isAbsolute(capturePath) ? capturePath : path.resolve(process.cwd(), capturePath);
}
