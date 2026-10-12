import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./desktop-distribution.mjs";
import { productUiOverlay } from "./product-ui-policy.mjs";

// Adopt only byte-verified defaults from a previous managed distribution. User
// edits to the source or Home never qualify for automatic replacement.
export async function legacyDesktopHomeFiles(projectRoot, payload) {
  const previous = await readFile(path.join(projectRoot, ".openquantum/desktop-distribution.json"), "utf8").then(JSON.parse).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!previous || previous.kind === "dsh-capability-package") return {};
  const defaults = {};
  const verified = new Map();
  for (const [relative, entry] of Object.entries(previous.files)) {
    if (!relative.startsWith("runtime/openquantum/")) continue;
    const source = await readFile(path.join(projectRoot, relative)).catch(error => { if (error.code === "ENOENT") return null; throw error; });
    if (!source || sha256(source) !== entry.sha256) continue;
    verified.set(relative, source);
    if (relative.startsWith("runtime/openquantum/agent-presets/")) defaults[relative.replace("runtime/openquantum/agent-presets/", ".agent-presets/")] = entry.sha256;
    if (relative === "runtime/openquantum/model-routes.cordis.yml") defaults["profiles/model-routes.cordis.yml"] = entry.sha256;
  }
  const patch = verified.get("runtime/openquantum/cordis.patch.yml");
  const desktop = verified.get("runtime/openquantum/desktop.cordis.patch.yml");
  if (patch && desktop) {
    let overlay;
    try { overlay = await productUiOverlay(projectRoot); }
    catch (error) {
      if (error.code !== "ENOENT" || !payload) throw error;
      const next = JSON.parse(await readFile(path.join(payload, "distribution.json"), "utf8"));
      if (previous.upstream?.harnessVersion !== next.upstream?.harnessVersion) throw new Error("Cannot adopt legacy defaults across Harness families");
      overlay = await productUiOverlay(payload);
    }
    defaults["cordis.patch.yml"] = sha256(`${patch}\n${desktop}\n${overlay}`);
  }
  return defaults;
}
