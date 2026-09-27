import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { DIFFERENTIABLE_TOOLS } from "./fixtures/sdk-differentiable.mjs";

const enabled = process.env.OPENQUANTUM_REAL_DIFFERENTIABLE === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-evidence/differentiable");

for (const descriptor of DIFFERENTIABLE_TOOLS) {
  test(`${descriptor.id}: real SDK reproduces independent dense and parameter-shift references offline`, { skip: !enabled, timeout: 180000 }, async () => {
    const skillRoot = path.join(root, ".agents/skills", descriptor.id);
    const launch = await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "test/science_test.py")] });
    const run = spawnSync(launch.command, launch.args, {
      cwd: root, env: { ...process.env, OPENQUANTUM_DIFFERENTIABLE_EVIDENCE: evidence }, encoding: "utf8", timeout: 150000,
    });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /Ran 7 tests/);
  });

  test(`${descriptor.id}: actual MCP default and explicit calls return derivatives and matching provenance`, { skip: !enabled, timeout: 180000 }, async t => {
    const { definition } = await import(`../.agents/skills/${descriptor.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "differentiable-live-verification", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", descriptor.id, "mcp/server.mjs")] }));
    const tools = (await client.listTools()).tools;
    assert.deepEqual(tools.map(tool => tool.name), [descriptor.tool]);
    await mkdir(evidence, { recursive: true });
    for (const [label, input] of [["explicit", descriptor.input], ["defaults", {}]]) {
      const response = await client.callTool({ name: descriptor.tool, arguments: input }, undefined, { timeout: 120000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.ok(definition.validateOutput(output));
      assert.deepEqual(output.input, definition.normalize(descriptor.tool, input));
      assert.equal(output.scientificValidation, "not_evaluated");
      assert.ok(Math.abs(output.result.expectations[0] - Math.cos(.4)) < 1e-10);
      assert.ok(Math.abs(output.result.jacobian[0][0] + Math.sin(.4)) < 1e-10);
      assert.ok(Math.abs(output.result.jacobian[2][0] - Math.cos(.4)) < 1e-10);
      await writeFile(path.join(evidence, `mcp-${descriptor.id}-${label}.json`), JSON.stringify(output, null, 2));
    }
    assert.equal((await client.callTool({ name: descriptor.tool, arguments: { ...descriptor.input, trainableGateIndices: [1] } })).isError, true);
  });
}
