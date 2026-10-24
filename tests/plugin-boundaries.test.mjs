import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { parse } from "yaml";

const root = path.resolve(import.meta.dirname, "..");

test("shared Tool and MCP module graphs do not import a host runtime or UI", async () => {
  const policy = parse(await readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  const native = (await readdir(path.join(root, "src/capabilities"))).filter(name => name.endsWith(".mjs")).map(name => `src/capabilities/${name}`);
  const servers = policy.packages.flatMap(item => (item.execution?.mcpServers ?? [])
    .filter(server => server.source === "package").map(server => server.entrypoint));
  const { metafile } = await build({ absWorkingDir: root, entryPoints: [...new Set([...native, ...servers])],
    bundle: true, packages: "external", platform: "node", format: "esm", write: false,
    outdir: "dist/boundary-check", metafile: true, logLevel: "silent" });
  for (const [filename, input] of Object.entries(metafile.inputs)) {
    assert.ok(!filename.startsWith("runtime/") && !filename.startsWith("packages/openquantum-web-"), `Shared graph imports host module: ${filename}`);
    for (const dependency of input.imports) {
      assert.ok(!/^(@deepseek-ai\/|electron(?:\/|$))/.test(dependency.path), `${filename} imports ${dependency.path}`);
    }
  }
});
