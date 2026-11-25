import path from "node:path";
import { recoverDesktopInstall } from "./lib/desktop-install-transaction.mjs";

const [payload, projectRoot, ...extra] = process.argv.slice(2);
if (!payload || !projectRoot || !path.isAbsolute(payload) || !path.isAbsolute(projectRoot)
  || extra.length > 1 || (extra.length && extra[0] !== "--rebuild-extensions")) {
  throw new Error("Expected absolute payload and Desktop project paths, optionally --rebuild-extensions");
}
// Recovery cannot import the possibly half-upgraded project or check its new
// version receipt before restoring the last complete transaction.
await recoverDesktopInstall(projectRoot);
const { legacyDesktopHomeFiles } = await import("./lib/legacy-desktop-home.mjs");
const { installDesktopDistribution, sha256 } = await import("./lib/desktop-distribution.mjs");
const { prepareOpenQuantumHarnessHome, preflightDesktopHome } = await import("./lib/prepare-harness-home.mjs");
const harnessHome = path.join(projectRoot, ".openquantum/dsh");
let prepared, legacyHomeFiles, extensionSourceDigest;
const result = await installDesktopDistribution({
  payload, projectRoot,
  async preflight({ next, preservedFiles }) {
    // The installer has verified every payload/program file before this callback.
    // Reuse its complete identity, including the runtime lock and build scripts.
    extensionSourceDigest = sha256(JSON.stringify(next));
    legacyHomeFiles = await legacyDesktopHomeFiles(projectRoot, payload);
    const planned = await preflightDesktopHome({ projectRoot, sourceRoot: payload, harnessHome, legacyHomeFiles, preservedFiles });
    legacyHomeFiles = planned.legacyHomeFiles;
  },
  async prepare(transaction) {
    process.chdir(projectRoot);
    prepared = await prepareOpenQuantumHarnessHome({ projectRoot, harnessHome, profileName: "desktop", legacyHomeFiles, transaction,
      extensionSourceDigest, rebuildExtensions: extra.includes("--rebuild-extensions") });
  },
});
process.stdout.write(`${JSON.stringify({ ...result, preservedHomeFiles: prepared.preservedFiles, reusedExtensions: prepared.reusedExtensions })}\n`);
