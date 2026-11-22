import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { connectExternal } from "../runtime/chatgpt/external/client.mjs";
import { externalMcp, externalContract } from "../runtime/chatgpt/external/catalog.mjs";

const run = promisify(execFile);
const enabled = process.env.OPENQUANTUM_REAL_UPSTREAM_UPDATES === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/upstream-updates-evidence");
for (const id of ["qiskit_ibm_runtime", "qiskit_gym", "quantum_hardware"]) {
  test(`Runtime patch preserves ${id} MCP contract`, { skip: process.env.OPENQUANTUM_RUNTIME_MCP_LIVE !== "1", timeout: 120000 }, async () => {
    const session = await connectExternal(root, externalMcp(id), {
      OPENQUANTUM_PYTHON_ENV_ROOT: process.env.OPENQUANTUM_PYTHON_ENV_ROOT,
    });
    try {
      const expected = await externalContract(root, id);
      const actual = await session.client.listTools({}, { timeout: 90000 });
      assert.equal(actual.nextCursor, undefined, "review every tool in this fixed surface");
      assert.deepEqual(actual.tools.map(tool => tool.name).sort(), expected.tools.map(tool => tool.name).sort());
      for (const before of expected.tools) {
        const after = actual.tools.find(tool => tool.name === before.name);
        for (const field of ["description", "inputSchema", "outputSchema", "annotations"]) {
          assert.deepEqual(after[field], before[field], `${id}.${before.name}.${field}`);
        }
      }
      await mkdir(evidence, { recursive: true });
      await writeFile(path.join(evidence, `${id}-runtime-patch.json`), JSON.stringify({
        server: id, toolsChecked: actual.tools.length, matchesFixedContract: true,
        executionCalls: 0, scientificValidation: "not_evaluated",
      }, null, 2));
    } finally {
      await session.close();
    }
  });
}
for (const [capability, script, count] of [
  ["compact-optimization", "compiler_regressions.py", 14],
  ["clifft-sampling", "clifft_regressions.py", 2],
  ["qcut-knitting", "runtime_rzz_regressions.py", 48],
]) {
  test(`upstream update regression: ${script}`, { skip: !enabled, timeout: 240000 }, async () => {
    const python = path.join(root, ".openquantum/python-envs", capability, process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const { stdout } = await run(python, [path.join(root, "benchmarks/upstream-updates", script)], {
      cwd: root, timeout: 225000, maxBuffer: 4 * 1024 * 1024,
    });
    const result = JSON.parse(stdout);
    assert.equal(result.denominator, count);
    assert.equal(result.passed, count);
    assert.equal(result.scientificValidation, "not_evaluated");
    await mkdir(evidence, { recursive: true });
    await writeFile(path.join(evidence, script + ".json"), JSON.stringify(result, null, 2));
  });
}

test("Graphix migration preserves generation-only and optional references", { skip: !enabled, timeout: 240000 }, async t => {
  const client = new Client({ name: "graphix-upgrade-scope", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath,
    args: [path.join(root, ".agents/skills/graphix-mbqc/mcp/server.mjs")] }));
  const results = [];
  async function call(input) {
    const response = await client.callTool({ name: "simulate_graphix_pattern", arguments: input }, undefined, { timeout: 180000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    assert.equal(response.structuredContent.scientificValidation, "not_evaluated");
    results.push(response.structuredContent);
    return response.structuredContent.result;
  }
  const generated = await call({ numQubits: 11, gates: [{ gate: "H", targets: [10] }], simulate: false });
  assert.equal(generated.outputNodes.length, 11);
  assert.deepEqual(generated.branches, []);
  assert.equal(generated.reference.status, "not_run");
  assert.equal(generated.referenceStatevector, null);
  const skipped = await call({ referenceMode: "skip" });
  assert.equal(skipped.maxInfidelity, null);
  assert.ok(skipped.branches.every(branch => branch.fidelity === null && branch.normError < 1e-8));
  const full = await call({ numQubits: 4, initialState: "plus", branches: 12, referenceMode: "required", gates: [
    { gate: "CX", targets: [3, 0] }, { gate: "RY", targets: [2], angle: -1.3 },
    { gate: "RZ", targets: [0], angle: 0.73 }, { gate: "CZ", targets: [2, 0] },
    { gate: "RX", targets: [3], angle: 0.9 }, { gate: "T", targets: [1] },
    { gate: "Y", targets: [0] }, { gate: "CX", targets: [0, 3] },
  ] });
  assert.equal(full.branches.length, 12);
  assert.ok(full.branches.every(branch => Math.abs(1 - branch.fidelity) < 1e-8));
  assert.ok(new Set(full.branches.map(branch => JSON.stringify(branch.measurements))).size > 1);
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "graphix-scope.json"), JSON.stringify({ cases: results }, null, 2));
});
