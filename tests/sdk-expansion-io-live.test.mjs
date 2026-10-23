import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_EXPANSION_IO } from "./fixtures/sdk-expansion-io.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_EXPANSION_IO === "1";
const root = process.cwd();
for (const descriptor of SDK_EXPANSION_IO) {
  test(`${descriptor.id}: real SDK checks or loopback service transport`, { skip: !enabled, timeout: 180000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", descriptor.id), args: [path.join(root, ".agents/skills", descriptor.id, "test/science_test.py")] });
    const response = spawnSync(launch.command, launch.args, { cwd: root, encoding: "utf8", timeout: 150000 });
    assert.equal(response.status, 0, `${response.stdout}\n${response.stderr}`);
    assert.match(response.stderr, /\nOK/);
  });
  test(`${descriptor.id}: MCP output and honest missing-configuration errors`, { skip: !enabled, timeout: 180000 }, async t => {
    const client = new Client({ name: "sdk-expansion-io-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", descriptor.id, "mcp/server.mjs")], env: { ...process.env, QCPORTAL_ADDRESS: "", QCPORTAL_USERNAME: "", QCPORTAL_PASSWORD: "" } }));
    const result = await client.callTool({ name: descriptor.tool, arguments: descriptor.input }, undefined, { timeout: 120000 });
    if (descriptor.expectError) {
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result), new RegExp(descriptor.errorPattern));
    } else {
      assert.notEqual(result.isError, true, JSON.stringify(result));
      const { definition } = await import(`../.agents/skills/${descriptor.id}/mcp/contracts.mjs`);
      assert.ok(definition.validateOutput(result.structuredContent));
      assert.deepEqual(result.structuredContent.input, definition.normalize(descriptor.tool, descriptor.input));
    }
    const evidence = path.join(root, ".openquantum/sdk-expansion-evidence/io");
    await mkdir(evidence, { recursive: true });
    await writeFile(path.join(evidence, `${descriptor.id}.json`), JSON.stringify(result, null, 2) + "\n");
  });
}
