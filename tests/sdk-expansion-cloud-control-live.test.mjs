import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_EXPANSION_CLOUD_CONTROL, SDK_EXPANSION_CLOUD_CONTROL_AUTH } from "./fixtures/sdk-expansion-cloud-control.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_EXPANSION_CLOUD_CONTROL === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-expansion-evidence/cloud-control");
for (const item of SDK_EXPANSION_CLOUD_CONTROL) {
  test(`${item.id}: actual SDK local behavior and remote transport fixtures`, { skip: !enabled, timeout: 180000 }, async () => {
    const skillRoot = path.join(root, ".agents/skills", item.id);
    const launch = await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "test/science_test.py")] });
    const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };
    delete env.CLASSIQ_XCH_TOKEN; delete env.QCTRL_API_KEY;
    const run = spawnSync(launch.command, launch.args, { cwd: root, env, encoding: "utf8", timeout: 120000 });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    await mkdir(evidence, { recursive: true });
    await writeFile(path.join(evidence, `${item.id}-tests.txt`), run.stderr);
  });
  test(`${item.id}: actual MCP results and fail-fast missing credentials`, { skip: !enabled, timeout: 180000 }, async t => {
    const { definition } = await import(`../.agents/skills/${item.id}/mcp/contracts.mjs`);
    const env = { ...process.env }; delete env.CLASSIQ_XCH_TOKEN; delete env.QCTRL_API_KEY;
    const client = new Client({ name: "sdk-cloud-control-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", item.id, "mcp/server.mjs")], env }));
    for (const [label, input] of [["explicit", item.input], ["defaults", {}]]) {
      const response = await client.callTool({ name: item.tool, arguments: input }, undefined, { timeout: 120000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      assert.ok(definition.validateOutput(response.structuredContent));
      assert.equal(response.structuredContent.result.networkUsed, false);
      assert.equal(response.structuredContent.scientificValidation, "not_evaluated");
      await mkdir(evidence, { recursive: true });
      await writeFile(path.join(evidence, `mcp-${item.id}-${label}.json`), JSON.stringify(response.structuredContent, null, 2));
    }
    for (const remote of SDK_EXPANSION_CLOUD_CONTROL_AUTH.filter(remote => remote.id === item.id)) {
      const response = await client.callTool({ name: remote.tool, arguments: remote.input }, undefined, { timeout: 120000 });
      assert.equal(response.isError, true);
      assert.ok(JSON.stringify(response).includes(remote.expectedError));
    }
  });
}
