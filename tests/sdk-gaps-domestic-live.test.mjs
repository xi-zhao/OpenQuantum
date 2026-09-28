import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { SDK_GAPS_DOMESTIC } from "./fixtures/sdk-gaps-domestic.mjs";

const enabled = process.env.OPENQUANTUM_REAL_SDK_GAPS_DOMESTIC === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/sdk-gaps-evidence/domestic");
for (const c of SDK_GAPS_DOMESTIC) {
  test(`${c.id}: real SDK versus independent numerical reference with network denied`, { skip: !enabled, timeout: 300000 }, async () => {
    const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills", c.id), args: [path.join(root, ".agents/skills", c.id, "test/science_test.py")] });
    const run = spawnSync(launch.command, launch.args, { cwd: root, env: { ...process.env, OPENQUANTUM_SDK_GAPS_DOMESTIC_EVIDENCE: evidence, OMP_NUM_THREADS: "1" }, encoding: "utf8", timeout: 240000 });
    assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stderr, /\nOK\n/);
  });
  test(`${c.id}: real MCP computation, strict schema and provenance`, { skip: !enabled, timeout: 300000 }, async t => {
    const { definition } = await import(`../.agents/skills/${c.id}/mcp/contracts.mjs`);
    const client = new Client({ name: "sdk-gaps-domestic-live", version: "1" }, { capabilities: {} });
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
        if (c.id === "simqn-network") {
          assert.equal(out.result.received, 4);
          assert.ok(out.result.arrivals.every(row => Math.abs(row.fidelity - (0.25 + 0.65 * Math.exp(-0.2))) < 1e-12));
        }
        if (c.id === "qcover-optimization") assert.ok(Math.abs(out.result.energy - Math.sin(0.6) * Math.sin(0.8)) < 1e-12);
        if (c.id === "vqnet-learning") {
          assert.ok(Math.abs(out.result.expectation - Math.cos(0.4)) < 1e-12);
          assert.ok(Math.abs(out.result.gradients[0].derivative + Math.sin(0.4)) < 1e-12);
        }
        if (c.id === "pychemiq-chemistry") assert.deepEqual(out.result.terms.map(term => [term.pauli, term.coefficient.real]), [["II", 1], ["ZI", -1]]);
      }
      await writeFile(path.join(evidence, `mcp-${c.id}-${label}.json`), JSON.stringify(out, null, 2) + "\n");
    }
    if (c.id === "pychemiq-chemistry") {
      const number = [{ mode: 0, action: "create" }, { mode: 0, action: "annihilate" }];
      const term = (real, operators = []) => ({ coefficient: { real }, operators });
      for (const input of [
        { numModes: 1, terms: [term(1e-10)] },
        { numModes: 1, terms: [term(1e10), term(1e-10), term(-1e10)] },
      ]) {
        const response = await client.callTool({ name: c.tool, arguments: input });
        assert.notEqual(response.isError, true, JSON.stringify(response));
        assert.deepEqual(response.structuredContent.result.terms, [{ pauli: "I", coefficient: { real: 1e-10, imaginary: 0 } }]);
      }
      const response = await client.callTool({ name: c.tool, arguments: { numModes: 1, terms: [term(5e-324, number)] } });
      assert.equal(response.isError, true);
      assert.match(JSON.stringify(response), /below floating-point representation/);
    }
    assert.equal((await client.callTool({ name: c.tool, arguments: { token: "forbidden" } })).isError, true);
  });
}
