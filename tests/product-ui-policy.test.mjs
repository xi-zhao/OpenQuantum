import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { composeEntries, loadOverlayPatches } from "@deepseek-ai/dsh-app-boot";
import { productUiPatch, HIDDEN_UPSTREAM_UI } from "../scripts/lib/product-ui-policy.mjs";

test("product overlay disables only existing account and plugin-marketplace entry rows", () => {
  const source = '- insert:\n' + [...HIDDEN_UPSTREAM_UI, "ui-chat", "plugin-manager", "plugin-inventory", "mcp", "ui-settings-models"].map(id => `    - id: ${id}\n      name: fixture-${id}\n`).join("");
  const hidden = productUiPatch(source);
  assert.deepEqual(hidden.map(row => row.id), HIDDEN_UPSTREAM_UI);
  const base = [...HIDDEN_UPSTREAM_UI, "ui-chat", "plugin-manager", "plugin-inventory", "mcp", "ui-settings-models"].map(id => ({ id, name: `fixture-${id}` }));
  const result = composeEntries([[{ insert: base }], hidden]);
  for (const id of HIDDEN_UPSTREAM_UI) assert.equal(result.find(row => row.id === id).disabled, true);
  for (const id of ["ui-chat", "plugin-manager", "plugin-inventory", "mcp", "ui-settings-models"]) assert.notEqual(result.find(row => row.id === id).disabled, true);
});

test("installed Harness release accepts the product UI overlay without absent rows", async () => {
  const file = new URL("../node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml", import.meta.url);
  const patch = productUiPatch(await readFile(file, "utf8"));
  assert.ok(patch.some(row => row.id === "ui-settings-plugin-inventory"));
  const original = loadOverlayPatches("openquantum-product-ui", file.pathname);
  // Web bundle patches also target the base Harness profile. Compose with that base.
  const base = loadOverlayPatches("openquantum-base", new URL("../node_modules/@deepseek-ai/dsh-base/cordis.patch.yml", import.meta.url).pathname);
  const rows = composeEntries([base, original, patch]);
  for (const row of patch) assert.equal(rows.find(item => item.id === row.id).disabled, true);
});
