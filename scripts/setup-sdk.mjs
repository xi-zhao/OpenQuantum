import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { readSdkLibraries, sdkSourceRoot } from "../src/lib/sdk-access.mjs";
import { prepareSdkSource } from "../src/lib/sdk-source.mjs";

// Explicit installation only. This script never executes a research program.
const root = fileURLToPath(new URL("../", import.meta.url));
const libraries = await readSdkLibraries(root);
const ids = process.argv.slice(2);
if (!ids.length || ids.some(id => !libraries.some(entry => entry.id === id))) throw new Error("Provide SDK ids from sdk-access.mjs list");
const run = (command, args, cwd = root, capture = false) => {
  const result = spawnSync(command, args, { cwd, stdio: capture ? "pipe" : "inherit", encoding: "utf8", timeout: 1_800_000 });
  if (result.error || result.status !== 0) throw new Error(`SDK setup failed: ${path.basename(command)} (${result.error?.message ?? result.status})`);
  return result.stdout?.trim();
};
for (const id of ids) {
  const entry = libraries.find(item => item.id === id);
  if (id === "quantum-algorithms") run(process.execPath, [path.join(root, "scripts/setup-open-algorithm-examples.mjs")]);
  else if (entry.nativeProject) run(process.execPath, [path.join(root, "scripts/setup-native-sdk.mjs"), id]);
  else if (entry.language === "native") run(process.execPath, [path.join(root, "scripts/setup-qdmi.mjs")]);
  else run(process.execPath, [path.join(root, "scripts/setup-paper-tools.mjs"), id]);
  if (id === "qpanda-qubo") run(process.execPath, [path.join(root, ".agents/skills/qpanda-qubo/scripts/setup-native.mjs")]);
  if (!entry.sourceProject || entry.nativeProject) continue;
  const directory = sdkSourceRoot(root, id);
  const { repository, revision } = entry.sourceProject;
  await prepareSdkSource(directory, { repository, revision });
  console.log(`Prepared complete source checkout for ${id} at ${revision}`);
}
