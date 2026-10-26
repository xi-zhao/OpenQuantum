import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { assertInstalledPythonFiles } from "../src/lib/installed-python.mjs";
import { runSetupCommand } from "../src/lib/setup-process.mjs";
import { ALGORITHM_GROUPS, acquireAlgorithmSetup, algorithmEnvironmentRoot, algorithmPreparation, algorithmSelection } from "../src/lib/algorithm-environment.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, "examples/quantum-algorithms");
export async function setupAlgorithmEnvironment(selection = []) {
  const groups = algorithmSelection(selection);
  const environmentRoot = algorithmEnvironmentRoot(root);
  const unlock = await acquireAlgorithmSetup(environmentRoot);
  const marker = path.join(environmentRoot, "openquantum-lock.sha256");
  const groupMarker = path.join(environmentRoot, "openquantum-groups.json");
  const digest = async () => createHash("sha256").update(await fs.readFile(path.join(directory, "uv.lock"))).digest("hex");

  try {
    const before = await digest();
    const previous = await algorithmPreparation(environmentRoot, before, groups, { duringSetup: true });
    if (previous.state === "prepared") {
      assertInstalledPythonFiles(previous.interpreter, { cwd: directory });
      console.log(`Reusing prepared algorithm environment (${groups.join(", ") || "base"})`);
    } else {
      // Mark every partial, failed or cancelled installation as unprepared.
      await Promise.all([fs.rm(marker, { force: true }), fs.rm(groupMarker, { force: true })]);
      const selected = [...new Set([...previous.availableGroups, ...groups])];
      console.log(`Preparing algorithm dependencies: ${selected.join(", ") || "NumPy, SciPy, Qiskit only"}`);
      await runSetupCommand("uv", ["sync", "--locked", "--no-dev", "--python", "3.12", "--no-default-groups", "--inexact", ...selected.flatMap(group => ["--group", group])], {
        cwd: directory, env: { ...process.env, UV_PROJECT_ENVIRONMENT: environmentRoot },
      });
      if (before !== await digest()) throw new Error("Algorithm dependency lock changed during setup");
      assertInstalledPythonFiles(previous.interpreter, { cwd: directory });
      const pending = `${groupMarker}.${process.pid}.tmp`;
      await fs.writeFile(pending, JSON.stringify({ schemaVersion: 1, lockSha256: before, groups: selected }) + "\n");
      await fs.rename(pending, groupMarker);
      // Preserve the old full-environment marker only after every group is ready.
      if (ALGORITHM_GROUPS.every(group => selected.includes(group))) {
        const temporary = `${marker}.${process.pid}.tmp`;
        await fs.writeFile(temporary, `${before}\n`);
        await fs.rename(temporary, marker);
      }
    }
  } catch (error) {
    await Promise.all([fs.rm(marker, { force: true }), fs.rm(groupMarker, { force: true })]);
    throw error;
  } finally { await unlock(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await setupAlgorithmEnvironment(process.argv.slice(2));
}
