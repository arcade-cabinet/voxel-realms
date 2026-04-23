import {
  parseVisualManifestVerifierArgs,
  printVisualManifestVerifierReport,
  verifyVisualManifest,
} from "./visual-manifest-verifier";

const options = parseVisualManifestVerifierArgs(process.argv.slice(2));
const report = verifyVisualManifest(options);

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printVisualManifestVerifierReport(report);
}

if (!report.valid) {
  process.exitCode = 1;
}
