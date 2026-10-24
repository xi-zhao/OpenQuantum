import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DESKTOP_SOURCE } from "./desktop-source.mjs";

// The pinned Harness reads V3. Never let it recover/repair a newer Home.
export async function assertCompatibleHarnessHome(harnessHome) {
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      if (entry.isSymbolicLink()) continue;
      const version = /^(?:log|session)\.v(\d+)\.jsonl(?:\.zstd)?$/.exec(entry.name)?.[1];
      if (version && Number(version) > 3) {
        throw new Error(`This Home contains V${version} sessions; DSH Desktop ${DESKTOP_SOURCE.version} requires a separate V3-compatible Home: ${harnessHome}`);
      }
      if (entry.isDirectory() && !["node_modules", "cache", ".cache"].includes(entry.name)) await visit(path.join(directory, entry.name));
    }
  }
  await visit(harnessHome);
  // A 0.2 Home can contain saved model routes before its first V4 session.
  // Refuse it before preparation overwrites those profile-owned settings.
  for (const marker of [
    "profiles/.agent-presets/presets.cordis.yml",
    ".openquantum-extensions/harness-desktop-profile/profile-defaults.cordis.yml",
  ]) {
    const source = await readFile(path.join(harnessHome, marker)).catch(error => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (source !== undefined) throw new Error(`This Home contains newer Harness profile settings; DSH Desktop ${DESKTOP_SOURCE.version} requires a separate V3-compatible Home: ${harnessHome}`);
  }
  for (const profile of ["desktop", "web", "acp"]) {
    const manifest = await readFile(path.join(harnessHome, "profiles", profile, "package.json"), "utf8").then(JSON.parse).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    for (const dependency of ["@deepseek-ai/dsh", "@deepseek-ai/dsh-base", "@deepseek-ai/dsh-base-profile", "@deepseek-ai/dsh-web-app", "@deepseek-ai/dsh-acp-app"]) {
      const version = manifest?.dependencies?.[dependency];
      if (version && version !== DESKTOP_SOURCE.harnessVersion) throw new Error(`Incompatible Harness dependency in ${profile}: ${dependency}@${version}; use a separate V3-compatible Home`);
    }
  }
}
