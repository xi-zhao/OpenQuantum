import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_GAPS_CONTROL } from "./fixtures/sdk-gaps-control.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_GAPS_CONTROL === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-gaps-evidence/control");
for (const item of SDK_GAPS_CONTROL) {
  test(`${item.id}: actual offline SDK positive and edge cases`, { skip: !enabled, timeout: 240000 }, async () => {
    const skillRoot = path.join(root, ".agents/skills", item.id);
    const launch = await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "test/science_test.py")] });
    const env = Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR"].filter(k => process.env[k]).map(k => [k, process.env[k]]));
    Object.assign(env, { PYTHONDONTWRITEBYTECODE: "1", MPLBACKEND: "Agg", MPLCONFIGDIR: path.join(root, ".openquantum/cache", `${item.id}-matplotlib`) });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env, encoding: "utf8", timeout: 210000 });
    await mkdir(evidence, { recursive: true });
    await writeFile(path.join(evidence, `${item.id}-science.txt`), run.stdout + run.stderr);
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
  });
  test(`${item.id}: actual MCP schema, provenance and offline result`, { skip: !enabled, timeout: 240000 }, async t => {
    const { definition } = await import(`../.agents/skills/${item.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-gaps-control-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", item.id, "mcp/server.mjs")] }));
    for (const [label, input] of [["explicit", item.input], ["defaults", {}]]) {
      const response = await client.callTool({ name: item.tool, arguments: input }, undefined, { timeout: 210000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      assert.ok(definition.validateOutput(response.structuredContent), JSON.stringify(definition.validateOutput.errors));
      assert.equal(response.structuredContent.scientificValidation, "not_evaluated");
      assert.equal(response.structuredContent.result.networkUsed, false);
      assert.equal(response.structuredContent.result.hardwareExecuted, false);
      await mkdir(evidence, { recursive: true });
      await writeFile(path.join(evidence, `mcp-${item.id}-${label}.json`), JSON.stringify(response.structuredContent, null, 2));
    }
    const rejected = await client.callTool({ name: item.tool, arguments: { code: "print(1)" } });
    assert.equal(rejected.isError, true);
  });
}
