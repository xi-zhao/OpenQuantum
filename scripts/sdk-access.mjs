import { isMainModule } from "../src/lib/cli-entrypoint.mjs";
import { fileURLToPath } from "node:url";
import { sdkCli } from "../src/lib/sdk-access.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
if (isMainModule(import.meta.url)) {
  try { console.log(JSON.stringify(await sdkCli(root, process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
