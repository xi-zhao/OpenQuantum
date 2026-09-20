import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DESKTOP_SOURCE } from "./lib/desktop-source.mjs";
import { RELEASES_URL, validateRelease } from "../src/updates/release.mjs";

export function buildUpdateManifest({ manifest, tag, publishedAt, desktop = DESKTOP_SOURCE.version }) {
  if (manifest.name !== "openquantum" || tag !== `v${manifest.version}`) throw new Error("Release tag must match the OpenQuantum package version exactly");
  return validateRelease({
    schemaVersion: 1, product: "openquantum", channel: "stable", version: manifest.version,
    publishedAt, releaseUrl: `${RELEASES_URL}/tag/${tag}`,
    upgradeUrl: `https://github.com/xi-zhao/OpenQuantum/blob/${tag}/docs/UPDATES.md#upgrading`,
    compatibility: { harness: manifest.dependencies["@deepseek-ai/dsh"], desktop },
    // Reserved for verified, signed native installers once packaging is available.
    artifacts: [],
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { tag: { type: "string" }, "published-at": { type: "string" }, output: { type: "string" } }, strict: true });
  if (!values.tag || !values["published-at"] || !values.output) throw new Error("Usage: --tag vX.Y.Z --published-at ISO_DATE --output FILE");
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const release = buildUpdateManifest({ manifest, tag: values.tag, publishedAt: values["published-at"] });
  await mkdir(path.dirname(values.output), { recursive: true });
  await writeFile(values.output, `${JSON.stringify(release, null, 2)}\n`);
  console.log(`Prepared OpenQuantum ${release.version} update manifest: ${values.output}`);
}
