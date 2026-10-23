import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_EXPANSION_RESOURCES } from "./fixtures/sdk-expansion-resources.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_EXPANSION_RESOURCES === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-expansion-evidence/resources");
for (const c of SDK_EXPANSION_RESOURCES) {
  test(`${c.id}: real SDK independent numerical checks with network denied`, { skip: !enabled, timeout: 300000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", c.id), args: [path.join(root, ".agents/skills", c.id, "test/science_test.py")] });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, OPENQUANTUM_SDK_RESOURCES_EVIDENCE: evidence, OMP_NUM_THREADS: "1" }, encoding: "utf8", timeout: 240000 });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /\nOK\n/);
  });
  test(`${c.id}: real MCP computation, schema and provenance`, { skip: !enabled, timeout: 300000 }, async t => {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-expansion-resources-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", c.id, "mcp/server.mjs")] }));
    await mkdir(evidence, { recursive: true });
    for (const [label, input] of [["example", c.input], ["defaults", {}]]) {
      const result = await client.callTool({ name: c.tool, arguments: { ...input, execution: { threads: 1 } } }, undefined, { timeout: 180000 });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      const out = result.structuredContent;
      assert.ok(definition.validateOutput(out));
      assert.deepEqual(out.input, definition.normalize(c.tool, { ...input, execution: { threads: 1 } }));
      assert.equal(out.scientificValidation, "not_evaluated");
      if (label === "example") {
        if (c.id === "quri-parts-estimation") assert.ok(Math.abs(out.result.expectation - 1.5) < 1e-12);
        if (c.id === "qdk-resource-estimation") assert.ok(out.result.feasible && out.result.frontier.every(row => row.errorProbability <= out.input.maxError));
        if (c.id === "qualtran-resources") assert.equal(out.result.tEquivalentCount, 12);
        if (c.id === "openfermion-mapping") assert.deepEqual(out.result.terms.map(term => [term.pauli, term.coefficient.real]), [["II", 1], ["ZI", -1]]);
        if (c.id === "mqt-ddsim") assert.equal(out.result.counts.reduce((sum, row) => sum + row.count, 0), 100);
        if (c.id === "mqt-qmap") assert.ok(out.result.resources.insertedSwaps > 0);
      }
      await writeFile(path.join(evidence, `mcp-${c.id}-${label}.json`), JSON.stringify(out, null, 2) + "\n");
    }
    assert.equal((await client.callTool({ name: c.tool, arguments: { token: "forbidden" } })).isError, true);
  });
}
