import path from "node:path";
import { installDesktopDistribution } from "./lib/desktop-distribution.mjs";
import { prepareOpenQuantumHarnessHome } from "./lib/prepare-harness-home.mjs";

const [payload, projectRoot] = process.argv.slice(2);
if (!payload || !projectRoot || !path.isAbsolute(payload) || !path.isAbsolute(projectRoot)) {
  throw new Error("Expected absolute payload and Desktop project paths");
}
const result = await installDesktopDistribution({ payload, projectRoot });
process.chdir(projectRoot);
await prepareOpenQuantumHarnessHome({
  projectRoot,
  harnessHome: path.join(projectRoot, ".openquantum/dsh"),
  profileName: "desktop",
});
process.stdout.write(`${JSON.stringify(result)}\n`);
