import { legacyDesktopHomeFiles } from "./lib/legacy-desktop-home.mjs";
import { assertCompatibleHarnessHome } from "./lib/harness-home-compatibility.mjs";
import path from "node:path";
import { installDesktopDistribution } from "./lib/desktop-distribution.mjs";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";

const [payload, projectRoot] = process.argv.slice(2);
if (!payload || !projectRoot || !path.isAbsolute(payload) || !path.isAbsolute(projectRoot)) {
  throw new Error("Expected absolute payload and Desktop project paths");
}
await assertCompatibleHarnessHome(path.join(projectRoot, ".openquantum/dsh"));
const legacyHomeFiles = await legacyDesktopHomeFiles(projectRoot, payload);
const result = await installDesktopDistribution({ payload, projectRoot });
process.chdir(projectRoot);
const prepared = await prepareOpenQuantumHarnessHome({
  projectRoot,
  harnessHome: path.join(projectRoot, ".openquantum/dsh"),
  profileName: "desktop",
  legacyHomeFiles,
});
process.stdout.write(`${JSON.stringify({ ...result, preservedHomeFiles: prepared.preservedFiles })}\n`);
