import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { applyOpenMaicUiOverlay, sourceDirectory, OPENMAIC_REVISION } from "./lib/openmaic-ui-source.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = sourceDirectory(root);
const env = { ...process.env, PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}` };
async function run(command, args, cwd, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...env, ...extraEnv }, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
if (!existsSync(directory)) {
  await run("git", ["clone", "--depth", "1", "--branch", "v1.0.1", "https://github.com/THU-MAIC/OpenMAIC.git", directory], root);
}
await applyOpenMaicUiOverlay(root);
if (!process.argv.includes("--overlay-only")) {
  const pnpm = path.join(root, "node_modules/pnpm/bin/pnpm.cjs");
  await run(process.execPath, [pnpm, "install", "--frozen-lockfile", "--ignore-scripts"], directory, { CI: "true" });
  // Build the eight pinned workspace packages explicitly. Do not approve every
  // transitive install hook or rely on whichever Node/npm a shell happens to find.
  for (const name of ["mathml2omml", "pptxgenjs", "@openmaic/dsl", "@openmaic/generation", "@openmaic/storage", "@openmaic/importer", "@openmaic/renderer", "@openmaic/editor"]) {
    const pkg = path.join(directory, "packages", name);
    const { scripts } = JSON.parse(await readFile(path.join(pkg, "package.json"), "utf8"));
    await run("/bin/sh", ["-c", scripts.build], pkg, { PATH: [path.dirname(process.execPath), path.join(pkg, "node_modules/.bin"), path.join(directory, "node_modules/.bin"), env.PATH].join(path.delimiter) });
  }
  await run(process.execPath, ["scripts/sync-maic-importer.mjs"], directory);
}
console.log(`OpenMAIC UI ready: ${OPENMAIC_REVISION}. Open 量子学习通 in OpenQuantum.`);
