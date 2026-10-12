import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { assertNoLinks, sha256 } from "./desktop-distribution.mjs";

export const DESKTOP_PROFILE_BUNDLE = "@openquantum/harness-desktop-profile";
export const DESKTOP_PROFILE_DIRECTORY = ".openquantum-extensions/harness-desktop-profile";
export const DESKTOP_PROFILE_PATCH = `${DESKTOP_PROFILE_DIRECTORY}/cordis.patch.yml`;

export function desktopProfileManifest(manifest) {
  const next = structuredClone(manifest);
  const bundles = (next.dsh?.profile?.bundles ?? []).filter(name => name !== DESKTOP_PROFILE_BUNDLE);
  const webIndex = bundles.indexOf("@deepseek-ai/dsh-web-app");
  if (webIndex < 0) throw new Error("Desktop profile is missing @deepseek-ai/dsh-web-app");
  bundles.splice(webIndex + 1, 0, DESKTOP_PROFILE_BUNDLE);
  next.dsh = { ...next.dsh, profile: { ...next.dsh?.profile, bundles } };
  return next;
}

/** Plan migration before writing anything; only byte-proven Home defaults move. */
export async function desktopHomePatchMigration(home, legacyFiles = {}) {
  const filename = path.join(home, "cordis.patch.yml");
  await assertNoLinks(filename);
  const source = await readFile(filename).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  const files = new Map();
  if (!source) return files;
  const stateFile = path.join(home, ".openquantum-home.json");
  await assertNoLinks(stateFile);
  const state = await readFile(stateFile, "utf8").then(JSON.parse).catch(error => {
    if (error.code === "ENOENT") return { files: legacyFiles };
    throw error;
  });
  const hash = sha256(source);
  if (hash === state.files?.["cordis.patch.yml"]) {
    if (source.toString() !== "[]\n") files.set(`.openquantum-migrations/${hash}/cordis.patch.yml`, source);
    files.set("cordis.patch.yml", "[]\n");
    return files;
  }
  const document = parseDocument(source.toString(), { customTags: [{ tag: "tag:yaml.org,2002:js", resolve: value => value }] });
  if (document.errors.length) throw new Error("Invalid Desktop Home patch; reconcile cordis.patch.yml before migration.");
  const hasOpenQuantum = value => value && typeof value === "object" && (
    typeof value.name === "string" && value.name.startsWith("@openquantum/")
    || Object.values(value).some(hasOpenQuantum)
  );
  if (hasOpenQuantum(document.toJS())) {
    throw new Error(`Desktop Home has an independently edited OpenQuantum patch. Preserve the original and reconcile its OpenQuantum entries with the project's runtime/openquantum/cordis.patch.yml before migrating: ${filename}`);
  }
  return files;
}
