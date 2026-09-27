import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_COMPILER_TOOLS } from "./fixtures/sdk-compilers.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_COMPILERS === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-evidence/compilers");

for (const c of SDK_COMPILER_TOOLS) {
  test(`${c.id}: real SDK numerical references and network-denied execution`, { skip: !enabled, timeout: 180000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", c.id), args: [path.join(root, ".agents/skills", c.id, "test/science_test.py")] });
    const result = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, OPENQUANTUM_SDK_COMPILERS_EVIDENCE: evidence }, encoding: "utf8", timeout: 150000 });
    assert.equal(result.status, 0, `${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /\nOK\n/);
  });
  test(`${c.id}: real MCP output, input provenance, defaults and failure`, { skip: !enabled, timeout: 180000 }, async t => {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-compilers-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", c.id, "mcp/server.mjs")] }));
    await mkdir(evidence, { recursive: true });
    for (const [label, input] of [["example", c.input], ["defaults", {}]]) {
      const response = await client.callTool({ name: c.tool, arguments: input }, undefined, { timeout: 120000 });
      assert.notEqual(response.isError, true, JSON.stringify(response));
      const output = response.structuredContent;
      assert.ok(definition.validateOutput(output));
      assert.deepEqual(output.input, definition.normalize(c.tool, input));
      assert.equal(output.scientificValidation, "not_evaluated");
      if (c.id.includes("simulation")) {
        assert.ok(output.result.normError < 2e-8);
        if (label === "example") {
          assert.ok(Math.abs(output.result.outcomes.find(r => r.bits === "11").probability - Math.cos(0.2)**2) < 2e-8);
          assert.ok(Math.abs(output.result.outcomes.find(r => r.bits === "10").probability - Math.sin(0.2)**2) < 2e-8);
        }
      }
      if (c.id === "ocean-optimization" && label === "example") assert.ok(Math.abs(output.result.minimumEnergyFound + 1.6) < 1e-12);
      if (c.id === "kaiwu-qubo" && label === "example") assert.deepEqual(output.result.evaluations.map(r => r.energy), [4, -2, -1, 1]);
      await writeFile(path.join(evidence, `mcp-${c.id}-${label}.json`), JSON.stringify(output, null, 2) + "\n");
    }
    assert.equal((await client.callTool({ name: c.tool, arguments: { backend: "cloud" } })).isError, true);
  });
}
