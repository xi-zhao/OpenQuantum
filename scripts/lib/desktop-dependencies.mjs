import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { parse } from "yaml";

const securityLock = ".openquantum-security.lock.yml";
const undici = { 6: "6.29.1", 7: "7.30.1", 8: "8.12.2" };
const fastUri = { 2: "2.4.8", 3: "3.1.9", 4: "4.2.3" };
// Security maintenance of the pinned desktop, without adopting its newer UI.
export const DESKTOP_SECURITY_VERSIONS = Object.freeze({
  electron: "43.8.1", "body-parser": "2.4.0", "@modelcontextprotocol/sdk": "1.32.1",
  "js-yaml": "4.3.2", hono: "4.13.11", qs: "6.16.1", "proxy-addr": "2.0.8",
  "ip-address": "10.7.4", sharp: "0.35.5", compression: "1.8.2",
  "adm-zip": "0.6.1", pnpm: "11.26.0", katex: "0.18.7",
});

export function desktopSecurityResolutions(source) {
  const resolutions = {
    ...DESKTOP_SECURITY_VERSIONS,
    // Keep upstream's minimumReleaseAge normalization when patching pnpm.
    "pnpm@npm:11.8.0": "patch:pnpm@npm%3A11.26.0#./.openquantum-pnpm-security.patch",
    "zod@npm:^3.25 || ^4.0": "4.6.6",
    "zod@npm:^4.6.5": "4.6.6",
  };
  for (const [selectors, entry] of Object.entries(parse(source))) {
    if (!/^(?:undici|zod|fast-uri)@/.test(selectors)) continue;
    const major = Number(String(entry.version).split(".")[0]);
    const version = selectors.startsWith("undici@") ? undici[major] : selectors.startsWith("fast-uri@") ? fastUri[major]
      : selectors.startsWith("zod@") && major === 4 ? "4.6.6" : undefined;
    if (version) for (const selector of selectors.split(", ")) resolutions[selector] = version;
  }
  return resolutions;
}

/** Apply build-owned dependency overrides, then restore upstream source bytes. */
export async function installDesktopDependencies(directory, install) {
  const manifestPath = path.join(directory, "package.json");
  const lockPath = path.join(directory, "yarn.lock");
  const [manifestBytes, lockBytes] = await Promise.all([readFile(manifestPath), readFile(lockPath)]);
  const manifest = JSON.parse(manifestBytes);
  const resolutions = desktopSecurityResolutions(lockBytes.toString());
  manifest.resolutions = { ...manifest.resolutions, ...resolutions };
  try {
    await writeFile(path.join(directory, ".openquantum-pnpm-security.patch"),
      await readFile(new URL("../patches/pnpm-11.26.0.patch", import.meta.url)));
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    await install();
    const patchedLock = await readFile(lockPath);
    await writeFile(path.join(directory, securityLock), patchedLock);
    return { resolutions, lockSha256: createHash("sha256").update(patchedLock).digest("hex") };
  } finally {
    await Promise.all([writeFile(manifestPath, manifestBytes), writeFile(lockPath, lockBytes)]);
  }
}

export async function verifyDesktopDependencySecurity(directory, marker) {
  const [original, patched] = await Promise.all([
    readFile(path.join(directory, "yarn.lock"), "utf8"), readFile(path.join(directory, securityLock)),
  ]);
  if (!isDeepStrictEqual(marker?.resolutions, desktopSecurityResolutions(original)) ||
      marker?.lockSha256 !== createHash("sha256").update(patched).digest("hex")) {
    throw new Error("Desktop dependency security evidence does not match the reviewed build policy");
  }
  const require = createRequire(path.join(directory, "dsh-plugin-desktop/package.json"));
  const versions = {};
  for (const name of [...Object.keys(DESKTOP_SECURITY_VERSIONS), "undici", "zod", "fast-uri"]) {
    let version;
    for (const base of require.resolve.paths(name)) {
      const manifest = await readFile(path.join(base, name, "package.json"), "utf8").catch(error => {
        if (error.code === "ENOENT") return undefined;
        throw error;
      });
      if (manifest !== undefined) { version = JSON.parse(manifest).version; break; }
    }
    // A reviewed version may be absent from this older dependency graph (for
    // example adm-zip only arrived with the later desktop features). A package
    // declared in the upstream lock must still resolve and match the patch.
    if (version === undefined && !Object.keys(parse(original)).some(selector => selector.startsWith(`${name}@`))) continue;
    const expected = name === "undici" ? Object.values(undici) : name === "fast-uri" ? Object.values(fastUri)
      : [name === "zod" ? "4.6.6" : DESKTOP_SECURITY_VERSIONS[name]];
    if (!expected.includes(version)) throw new Error(`Desktop resolves an unpatched dependency: ${name}@${version}`);
    versions[name] = version;
  }
  return versions;
}
