import path from "node:path";
import { fileURLToPath } from "node:url";
import { readSdkLibraries, sdkSourceRoot } from "../src/lib/sdk-access.mjs";
import { prepareSdkSource } from "../src/lib/sdk-source.mjs";
import { algorithmSelection } from "../src/lib/algorithm-environment.mjs";
import { runSetupCommand } from "../src/lib/setup-process.mjs";
import { setupAlgorithmEnvironment } from "./setup-open-algorithm-examples.mjs";

// Explicit installation only. This script never executes a research program.
const root = fileURLToPath(new URL("../", import.meta.url));
const libraries = await readSdkLibraries(root);
const args = process.argv.slice(2);
const option = args.findIndex(arg => arg.startsWith("--"));
const ids = option === -1 ? args : args.slice(0, option);
const selection = option === -1 ? [] : args.slice(option);
if (!ids.length || ids.some(id => !libraries.some(entry => entry.id === id))) throw new Error("Provide SDK ids from sdk-access.mjs list");
if (selection.length) {
  if (ids.length !== 1 || ids[0] !== "quantum-algorithms") throw new Error("Dependency groups apply only to quantum-algorithms");
  algorithmSelection(selection);
}
const run = (command, args, cwd = root, capture = false) => runSetupCommand(command, args, { cwd, capture });
for (const id of ids) {
  const entry = libraries.find(item => item.id === id);
  if (id === "quantum-algorithms") await setupAlgorithmEnvironment(selection);
  else if (entry.nativeProject) await run(process.execPath, [path.join(root, "scripts/setup-native-sdk.mjs"), id]);
  else if (entry.language === "native") await run(process.execPath, [path.join(root, "scripts/setup-qdmi.mjs")]);
  else await run(process.execPath, [path.join(root, "scripts/setup-paper-tools.mjs"), id]);
  if (id === "qpanda-qubo") await run(process.execPath, [path.join(root, ".agents/skills/qpanda-qubo/scripts/setup-native.mjs")]);
  if (!entry.sourceProject || entry.nativeProject) continue;
  const directory = sdkSourceRoot(root, id);
  const { repository, revision } = entry.sourceProject;
  await prepareSdkSource(directory, { repository, revision });
  console.log(`Prepared complete source checkout for ${id} at ${revision}`);
}
