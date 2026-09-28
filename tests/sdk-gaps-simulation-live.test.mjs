import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_GAPS_SIMULATION } from "./fixtures/sdk-gaps-simulation.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_GAPS_SIMULATION === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-gaps-evidence/simulation");
for (const c of SDK_GAPS_SIMULATION) {
  test(`${c.id}: real SDK independent numerical checks with network denied`, { skip: !enabled, timeout: 300000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", c.id), args: [path.join(root, ".agents/skills", c.id, "test/science_test.py")] });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, OPENQUANTUM_SDK_SIMULATION_EVIDENCE: evidence, OMP_NUM_THREADS: "1", MPLBACKEND: "Agg" }, encoding: "utf8", timeout: 240000 });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /\nOK\n/);
  });
  test(`${c.id}: real MCP computation, schema and provenance`, { skip: !enabled, timeout: 300000 }, async t => {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-gaps-simulation-live", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", c.id, "mcp/server.mjs")] }));
    await mkdir(evidence, { recursive: true });
    for (const [label, input] of [["example", c.input], ["defaults", {}]]) {
      const normalized = definition.normalize(c.tool, { ...input, execution: { threads: 1 } });
      const result = await client.callTool({ name: c.tool, arguments: normalized }, undefined, { timeout: 180000 });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      const out = result.structuredContent;
      assert.ok(definition.validateOutput(out));
      assert.deepEqual(out.input, normalized);
      assert.equal(out.scientificValidation, "not_evaluated");
      if (c.id === "mrmustard-optics") assert.ok(Math.abs(out.result.meanPhotons[0] - 0.25) < 1e-12);
      if (c.id === "merlin-learning") assert.ok(Math.abs(out.result.targetProbabilities[0] - Math.sin(0.35) ** 2) < 1e-12);
      if (["mimiq-simulation", "myqlm-simulation"].includes(c.id)) assert.ok(Math.abs(out.result.probabilities[0] - 0.5) < 1e-12);
      if (c.id === "mimiq-simulation" && label === "example") assert.equal(out.result.counts.reduce((sum, row) => sum + row.count, 0), 100);
      await writeFile(path.join(evidence, `mcp-${c.id}-${label}.json`), JSON.stringify(out, null, 2) + "\n");
    }
    assert.equal((await client.callTool({ name: c.tool, arguments: { apiKey: "forbidden" } })).isError, true);
  });
}
