import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

// The pinned 0.2.1 Harness reads up to V4. Never let it recover/repair a newer Home.
export async function assertCompatibleHarnessHome(harnessHome) {
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      if (entry.isSymbolicLink()) continue;
      const version = /^log\.v(\d+)\.jsonl(?:\.zstd)?$/.exec(entry.name)?.[1];
      if (version && Number(version) > 4) {
        throw new Error(`This Home contains V${version} sessions; DSH Desktop 2.0.18 requires a separate V4-compatible Home: ${harnessHome}`);
      }
      if (entry.isDirectory() && !["node_modules", "cache", ".cache"].includes(entry.name)) await visit(path.join(directory, entry.name));
    }
  }
  await visit(harnessHome);
  for (const profile of ["desktop", "web"]) {
    const manifest = await readFile(path.join(harnessHome, "profiles", profile, "package.json"), "utf8").then(JSON.parse).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const version = manifest?.dependencies?.["@deepseek-ai/dsh"];
    if (version && version !== "0.2.1-rc.2") throw new Error(`Incompatible Harness dependency in ${profile}: ${version}`);
  }
}
