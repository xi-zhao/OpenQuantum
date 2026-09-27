import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_CLOUD_TOOLS } from "./fixtures/sdk-cloud.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_CLOUD === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-evidence/cloud");
for (const descriptor of SDK_CLOUD_TOOLS) {
  test(`${descriptor.id}: real SDK serialization and network boundaries`, { skip: !enabled, timeout: 180000 }, async () => {
    const skillRoot = path.join(root, ".agents/skills", descriptor.id);
    const launch = await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "test/science_test.py")] });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }, encoding: "utf8", timeout: 120000 });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    await mkdir(evidence, { recursive: true });
    await writeFile(path.join(evidence, `${descriptor.id}-tests.txt`), run.stderr);
  });
  test(`${descriptor.id}: real MCP execution preserves source provenance and rejects cloud credentials in arguments`, { skip: !enabled, timeout: 180000 }, async t => {
    const { definition } = await import(`../.agents/skills/${descriptor.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-program-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    const env = { ...process.env }; delete env.SUPERSTAQ_API_KEY;
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", descriptor.id, "mcp/server.mjs")], env }));
    for (const [label, input] of [["explicit", descriptor.input], ["defaults", {}]]) {
      const response = await client.callTool({ name: descriptor.tool, arguments: input }, undefined, { timeout: 120000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.ok(definition.validateOutput(output));
      assert.deepEqual(output.input, definition.normalize(descriptor.tool, input));
      assert.equal(output.result.networkUsed, false);
      assert.equal(output.scientificValidation, "not_evaluated");
      await mkdir(evidence, { recursive: true });
      await writeFile(path.join(evidence, `mcp-${descriptor.id}-${label}.json`), JSON.stringify(output, null, 2));
    }
    assert.equal((await client.callTool({ name: descriptor.tool, arguments: { ...descriptor.input, apiKey: "forbidden" } })).isError, true);
    if (descriptor.id === "superstaq-compilation") {
      for (const [name, args] of [["list_superstaq_targets", {}], ["compile_superstaq_circuit", { ...descriptor.input, target: "ss_unconstrained_simulator" }]]) {
        const missing = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
        assert.equal(missing.isError, true);
        assert.match(JSON.stringify(missing), /SUPERSTAQ_API_KEY is not configured/);
      }
    }
  });
}
