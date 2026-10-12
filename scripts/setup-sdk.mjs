import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readSdkLibraries } from "../src/lib/sdk-access.mjs";

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
  else if (entry.language === "native") run(process.execPath, [path.join(root, "scripts/setup-qdmi.mjs")]);
  else run(process.execPath, [path.join(root, "scripts/setup-paper-tools.mjs"), id]);
  if (id === "qpanda-qubo") run(process.execPath, [path.join(root, ".agents/skills/qpanda-qubo/scripts/setup-native.mjs")]);
  if (!entry.sourceProject) continue;
  const directory = path.join(root, ".openquantum/sdk-sources", id);
  const { repository, revision } = entry.sourceProject;
  await fs.mkdir(path.dirname(directory), { recursive: true });
  const exists = await fs.access(directory).then(() => true, error => { if (error.code === "ENOENT") return false; throw error; });
  if (!exists) {
    run("git", ["clone", "--filter=blob:none", "--no-checkout", repository, directory]);
    run("git", ["checkout", "--detach", revision], directory);
  }
  if (run("git", ["remote", "get-url", "origin"], directory, true) !== repository || run("git", ["rev-parse", "HEAD"], directory, true) !== revision) throw new Error(`Unexpected source checkout: ${id}; preserve it and prepare the reviewed revision separately`);
  const status = run("git", ["status", "--porcelain", "--untracked-files=no"], directory, true);
  if (status) throw new Error(`Modified upstream source: ${id}; refusing to attest it`);
  const files = {};
  const names = run("git", ["ls-files", "-z"], directory, true).split("\0").filter(Boolean);
  for (const name of names) {
    if (!/\.py$|(?:^|\/)(?:LICENSE|README\.md|requirements\.txt)$/.test(name)) continue;
    files[name] = createHash("sha256").update(await fs.readFile(path.join(directory, name))).digest("hex");
  }
  const marker = path.join(directory, "openquantum-source.json");
  const pending = `${marker}.${process.pid}.tmp`;
  await fs.writeFile(pending, JSON.stringify({ repository, revision, files }, null, 2) + "\n");
  await fs.rename(pending, marker);
  console.log(`Prepared complete source checkout for ${id} at ${revision}`);
}
