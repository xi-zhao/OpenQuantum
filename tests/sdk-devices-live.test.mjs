import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_DEVICE_TOOLS } from "./fixtures/sdk-devices.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_DEVICES === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-evidence/devices");

for (const fixture of SDK_DEVICE_TOOLS) {
  test(`${fixture.id}: real SDK numerical references with socket connections disabled`, { skip: !enabled, timeout: 240000 }, async () => {
    const skillRoot = path.join(root, ".agents/skills", fixture.id);
    const launch = await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "test/science_test.py")] });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, OPENQUANTUM_SDK_DEVICES_EVIDENCE: evidence }, encoding: "utf8", timeout: 210000 });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /Ran 3 tests/);
  });

  test(`${fixture.id}: real MCP result, defaults, units and provenance`, { skip: !enabled, timeout: 240000 }, async t => {
    const { definition } = await import(`../.agents/skills/${fixture.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-device-live-verification", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", fixture.id, "mcp/server.mjs")] }));
    await mkdir(evidence, { recursive: true });
    for (const [label, input] of [["fixture", fixture.input], ["defaults", {}]]) {
      const response = await client.callTool({ name: fixture.tool, arguments: input }, undefined, { timeout: 120000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.ok(definition.validateOutput(output), JSON.stringify(definition.validateOutput.errors));
      assert.deepEqual(output.input, definition.normalize(fixture.tool, input));
      assert.equal(output.scientificValidation, "not_evaluated");
      if (output.result.maxNormError !== undefined) assert.ok(output.result.maxNormError < 1e-5);
      if (output.result.counts) assert.equal(output.result.counts.reduce((s, row) => s + row.count, 0), output.result.shots);
      if (output.result.totalProbability !== undefined) assert.ok(Math.abs(output.result.totalProbability - 1) < 1e-10);
      await writeFile(path.join(evidence, `${fixture.id}-mcp-${label}.json`), JSON.stringify(output, null, 2));
    }
  });
}
