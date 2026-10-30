import path from "node:path";
import { recoverDesktopInstall } from "./lib/desktop-install-transaction.mjs";

const [payload, projectRoot, ...extra] = process.argv.slice(2);
if (!payload || !projectRoot || !path.isAbsolute(payload) || !path.isAbsolute(projectRoot) || extra.length) {
  throw new Error("Expected absolute payload and Desktop project paths");
}
// Recovery cannot import the possibly half-upgraded project or check its new
// version receipt before restoring the last complete transaction.
await recoverDesktopInstall(projectRoot);
const { legacyDesktopHomeFiles } = await import("./lib/legacy-desktop-home.mjs");
const { installDesktopDistribution } = await import("./lib/desktop-distribution.mjs");
const { prepareOpenQuantumHarnessHome, preflightDesktopHome } = await import("./lib/prepare-harness-home.mjs");
const harnessHome = path.join(projectRoot, ".openquantum/dsh");
let prepared, legacyHomeFiles;
const result = await installDesktopDistribution({
  payload, projectRoot,
  async preflight({ preservedFiles }) {
    legacyHomeFiles = await legacyDesktopHomeFiles(projectRoot, payload);
    const planned = await preflightDesktopHome({ projectRoot, sourceRoot: payload, harnessHome, legacyHomeFiles, preservedFiles });
    legacyHomeFiles = planned.legacyHomeFiles;
  },
  async prepare(transaction) {
    process.chdir(projectRoot);
    prepared = await prepareOpenQuantumHarnessHome({ projectRoot, harnessHome, profileName: "desktop", legacyHomeFiles, transaction });
  },
});
process.stdout.write(`${JSON.stringify({ ...result, preservedHomeFiles: prepared.preservedFiles })}\n`);
