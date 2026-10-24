import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

// The official signer uses unbounded async fs.open calls when discovering
// binaries. Apply its already-locked graceful-fs dependency at the builder's
// process entry point, before the signer captures fs.open. This generated
// preload stays outside the application and never runs in the shipped Desktop.
export async function writeDesktopBuilderPreload(upstream, directory) {
  const require = createRequire(path.join(upstream, "package.json"));
  const preload = path.join(directory, "desktop-builder-fs.cjs");
  await writeFile(preload, `require(${JSON.stringify(require.resolve("graceful-fs"))}).gracefulify(require("node:fs"));\n`);
  return preload;
}

/** Materialize the pinned Yarn workspace's production closure for the packager.
 * npm list against a symlinked Yarn node_modules loses optional native modules.
 * Use the pinned builder's manifest traversal and retain its nested layout.
 */
export async function copyDesktopProductionDependencies(upstream, destination) {
  const require = createRequire(path.join(upstream, "package.json"));
  const { getCollectorByPackageManager, PM } = require("app-builder-lib/out/node-module-collector/index.js");
  const { TmpDir } = require("temp-file");
  const temporary = new TmpDir();
  try {
    const manifest = JSON.parse(await readFile(path.join(upstream, "package.json"), "utf8"));
    const collector = getCollectorByPackageManager(PM.TRAVERSAL, upstream, temporary);
    const { nodeModules } = await collector.getNodeModules({ packageName: manifest.name });
    let count = 0;
    async function copyModules(modules, root) {
      for (const module of modules) {
        const target = path.join(root, module.name);
        await mkdir(path.dirname(target), { recursive: true });
        await cp(module.dir, target, {
          recursive: true, verbatimSymlinks: true,
          filter: (filename) => {
            const relative = path.relative(module.dir, filename);
            return relative !== "node_modules" && !relative.startsWith(`node_modules${path.sep}`);
          },
        });
        count++;
        if (module.dependencies?.length) await copyModules(module.dependencies, path.join(target, "node_modules"));
      }
    }
    await copyModules(nodeModules, destination);
    return count;
  } finally {
    await temporary.cleanup();
  }
}
