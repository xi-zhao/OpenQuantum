import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

// Resolve source imports without running an entrypoint or traversing packages.
// Runtime-read assets remain explicit at each fixture's call site.
export async function localModuleFiles(root, entryPoints) {
  const { metafile } = await build({ absWorkingDir: root, entryPoints,
    bundle: true, packages: "external", platform: "node", format: "esm",
    write: false, outdir: "dist/fixture-graph", metafile: true, logLevel: "silent" });
  return Object.keys(metafile.inputs).map(file => {
    const relative = path.relative(root, path.resolve(root, file));
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Fixture import escapes the source root: ${file}`);
    }
    return relative;
  }).sort();
}

export async function copyModuleGraph(root, destination, entryPoints) {
  for (const file of await localModuleFiles(root, entryPoints)) {
    const target = path.join(destination, file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, file), target);
  }
}
