import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { parse } from "yaml";

const root = path.resolve(import.meta.dirname, "..");

async function optionalMjsFiles(relativeDir) {
  try {
    return (await readdir(path.join(root, relativeDir)))
      .filter(name => name.endsWith(".mjs"))
      .map(name => `${relativeDir}/${name}`);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

test("shared Tool, MCP and scientific Validator/report module graphs do not import a host runtime or UI", async () => {
  const policy = parse(await readFile(path.join(root, ".agents/capability-packages.yml"), "utf8"));
  const native = (await readdir(path.join(root, "src/capabilities"))).filter(name => name.endsWith(".mjs")).map(name => `src/capabilities/${name}`);
  const servers = policy.packages.flatMap(item => (item.execution?.mcpServers ?? [])
    .filter(server => server.source === "package").map(server => server.entrypoint));
  const scientificModules = (await Promise.all(
    policy.packages
      .filter(item => ["L2", "L3"].includes(item.level))
      .flatMap(item => [
        optionalMjsFiles(`.agents/skills/${item.id}/validators`),
        optionalMjsFiles(`.agents/skills/${item.id}/core`),
      ]),
  )).flat();
  assert.ok(scientificModules.length >= 20, `Expected shared scientific validator/report modules, found ${scientificModules.length}`);
  const sharedExecution = ["src/lib/tool-backend.mjs"];
  const { metafile } = await build({ absWorkingDir: root, entryPoints: [...new Set([...native, ...servers, ...scientificModules, ...sharedExecution])],
    bundle: true, packages: "external", platform: "node", format: "esm", write: false,
    outdir: "dist/boundary-check", metafile: true, logLevel: "silent" });
  for (const [filename, input] of Object.entries(metafile.inputs)) {
    assert.ok(!filename.startsWith("runtime/") && !filename.startsWith("packages/openquantum-web-"), `Shared graph imports host module: ${filename}`);
    for (const dependency of input.imports) {
      assert.ok(!/^(@deepseek-ai\/|electron(?:\/|$))/.test(dependency.path), `${filename} imports ${dependency.path}`);
    }
  }
});
