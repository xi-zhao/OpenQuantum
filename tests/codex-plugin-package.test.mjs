import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { zipSync } from "fflate";
import { parse } from "acorn";
import { unpackPlugin, updateMarketplace, installedMcpServer } from "../scripts/install-codex-plugin.mjs";
import { projectSkill } from "../scripts/build-chatgpt.mjs";
import { installerFiles } from "../scripts/build-codex-release.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("standalone installer includes its complete module graph and declares its runtime dependencies", async () => {
  const files = await installerFiles(root, "fixture");
  const manifest = JSON.parse(Buffer.from(files["fixture/package.json"]).toString("utf8"));
  for (const [name, bytes] of Object.entries(files).filter(([name]) => name.endsWith(".mjs"))) {
    const program = parse(Buffer.from(bytes).toString("utf8"), { ecmaVersion: "latest", sourceType: "module" });
    for (const declaration of program.body.filter(node => node.source)) {
      const specifier = declaration.source.value;
      if (specifier.startsWith("node:")) continue;
      if (specifier.startsWith(".")) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), specifier));
        assert.ok(files[target], `${name} imports missing standalone file ${target}`);
      } else {
        const dependency = specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
        assert.ok(manifest.dependencies[dependency], `${name} imports undeclared installer dependency ${dependency}`);
      }
    }
  }
});
test("installer updates only its owned OpenQuantum source and retains unrelated marketplace entries", () => {
  const home = "/fixture";
  const other = { name: "other", source: { source: "local", path: "./other" } };
  const original = { name: "personal", plugins: [other, { name: "openquantum", source: { source: "local", path: "./.local/share/openquantum/desktop/old/plugin" }, policy: { installation: "AVAILABLE" } }] };
  const next = updateMarketplace(JSON.stringify(original), "/fixture/.local/share/openquantum/desktop/new/plugin", home);
  assert.deepEqual(next.plugins[0], other);
  assert.equal(next.plugins[1].source.path, "./.local/share/openquantum/desktop/new/plugin");
  assert.deepEqual(next.plugins[1].policy, original.plugins[1].policy);
  original.plugins[1].source.path = "./unowned";
  assert.throws(() => updateMarketplace(JSON.stringify(original), "/new", home), /not owned/);
  assert.equal(installedMcpServer("/runtime", "/node/bin").env.OPENQUANTUM_PLUGIN_ROOT, "${PLUGIN_ROOT}");
});

test("installer rejects archive traversal before extracting any files", () => {
  const bytes = zipSync({ "openquantum/../escape": new Uint8Array([1]) });
  assert.throws(() => unpackPlugin(bytes), /Unsafe archive path/);
});

test("generated Skill identifies the host and keeps Tool execution separate from Acceptance", () => {
  const text = projectSkill({ id: "example", title: "Example", description: "Fixture", tools: ["calculate"] }, { version: "0.7.4" });
  assert.match(text, /当前 Codex 对话/);
  assert.match(text, /not_checked/);
  assert.match(text, /不能伪造/);
});

test("runtime distribution has no Agent runtime dependency or model credential field", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, "distributions/codex-plugin/package.json"), "utf8"));
  assert.ok(!Object.keys(manifest.dependencies).some(name => /deepseek|codex|openai/.test(name)));
  const source = await fs.readFile(path.join(root, "runtime/chatgpt/main.mjs"), "utf8");
  assert.doesNotMatch(source, /app-server|CHATGPT_API_KEY|OPENAI_API_KEY|run-harness/);
});
