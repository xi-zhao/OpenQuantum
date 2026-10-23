import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_GAPS_CLOUD, SDK_GAPS_CLOUD_AUTH } from "./fixtures/sdk-gaps-cloud.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_GAPS_CLOUD === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-gaps-evidence/cloud");
const environment = { ...process.env, OMP_NUM_THREADS: "1" };
for (const key of ["AQT_API_TOKEN", "OQC_API_TOKEN", "OQC_API_ENDPOINT", "QUANTUMINSPIRE_API_TOKEN"]) delete environment[key];
for (const c of SDK_GAPS_CLOUD) {
  test(`${c.id}: actual SDK numeric/HTTP contract checks with network denied`, { skip: !enabled, timeout: 300000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", c.id), args: [path.join(root, "tests/fixtures/sdk_gaps_cloud_science.py"), c.id] });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env: environment, encoding: "utf8", timeout: 240000 });
    await mkdir(evidence, { recursive: true });
    await writeFile(path.join(evidence, `${c.id}-sdk.txt`), run.stdout + run.stderr);
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /\nOK\n/);
  });
  test(`${c.id}: real MCP result/provenance and missing-auth boundary`, { skip: !enabled, timeout: 180000 }, async t => {
    const contracts = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const defs = contracts.definitions ?? [contracts.definition];
    const client = new Client({ name: "sdk-gaps-cloud-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", c.id, "mcp/server.mjs")], env: environment }));
    for (const item of [c, ...SDK_GAPS_CLOUD_AUTH.filter(row => row.id === c.id)]) {
      const def = defs.find(d => d.tool.name === item.tool);
      const normalized = def.normalize(item.tool, { ...item.input, execution: { threads: 1 } });
      const result = await client.callTool({ name: item.tool, arguments: normalized }, undefined, { timeout: 120000 });
      if (item.expectError) {
        assert.equal(result.isError, true);
        assert.match(JSON.stringify(result), new RegExp(item.errorPattern));
      } else {
        assert.notEqual(result.isError, true, JSON.stringify(result));
        assert.ok(def.validateOutput(result.structuredContent));
        assert.deepEqual(result.structuredContent.input, normalized);
        assert.equal(result.structuredContent.scientificValidation, "not_evaluated");
        assert.equal(result.structuredContent.result.networkUsed, false);
      }
      await mkdir(evidence, { recursive: true });
      await writeFile(path.join(evidence, `mcp-${item.tool}.json`), JSON.stringify(result, null, 2) + "\n");
    }
  });
}
