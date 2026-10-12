import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareVersions, parseVersion } from "../../src/updates/release.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const packages = ["", "distributions/codex-plugin", "distributions/codex-installer"];
// Both release channels currently publish plain, stable X.Y.Z product versions.
const isProductVersion = value => Boolean(parseVersion(value) && /^\d+\.\d+\.\d+$/.test(value));

async function readManifests(root) {
  const files = [];
  for (const directory of packages) {
    for (const name of ["package.json", "package-lock.json"]) {
      const relative = path.join(directory, name);
      const value = JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));
      if (!isProductVersion(value.version)) throw new Error(`Invalid stable product version in ${relative}`);
      const locked = name === "package-lock.json";
      if (locked && !isProductVersion(value.packages?.[""]?.version)) throw new Error(`Missing root package version or invalid stable product version in ${relative}`);
      files.push({ relative, value, locked });
    }
  }
  return files;
}

/** The root product version is authoritative; package and lock versions are copies. */
export async function checkReleaseVersions(root = PROJECT_ROOT) {
  const files = await readManifests(root);
  const version = files[0].value.version;
  for (const { relative, value, locked } of files) {
    if (value.version !== version || locked && value.packages[""].version !== version) {
      throw new Error(`Release version mismatch in ${relative}; expected OpenQuantum ${version}. Run npm run release:version -- <version>.`);
    }
  }
  return version;
}

export async function setReleaseVersion(version, root = PROJECT_ROOT) {
  if (!isProductVersion(version)) throw new Error("Expected a stable X.Y.Z version such as 0.8.1, without prerelease or build metadata");
  // Read and validate all inputs before changing any file. Dependency versions stay untouched.
  const files = await readManifests(root);
  for (const { relative, value, locked } of files) {
    for (const current of locked ? [value.version, value.packages[""].version] : [value.version]) {
      if (compareVersions(version, current) < 0) throw new Error(`Refusing to lower ${relative} from ${current} to ${version}`);
    }
  }
  for (const { relative, value, locked } of files) {
    value.version = version;
    if (locked) value.packages[""].version = version;
    await fs.writeFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
  }
  return checkReleaseVersions(root);
}
