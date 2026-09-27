import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { preparedPythonLaunch } from "../src/lib/prepared-python.mjs";
import { definition } from "../.agents/skills/bloqade-analog/mcp/contracts.mjs";
import { BLOQADE_TOOLS } from "./fixtures/bloqade.mjs";

const enabled = process.env.OPENQUANTUM_REAL_BLOQADE === "1";
const root = process.cwd();
const evidence = path.join(root, ".openquantum/bloqade-evidence");

test("Bloqade independently reproduces analytical and dense references without network access", { skip: !enabled, timeout: 180000 }, async () => {
  const launch = await preparedPythonLaunch({ skillRoot: path.join(root, ".agents/skills/bloqade-analog"), args: [path.join(root, ".agents/skills/bloqade-analog/test/science_test.py")] });
  const run = spawnSync(launch.command, launch.args, {
    cwd: root, env: { ...process.env, OPENQUANTUM_BLOQADE_EVIDENCE: evidence }, encoding: "utf8", timeout: 150000,
  });
  assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
  assert.match(run.stderr, /Ran 7 tests/);
});

test("real Bloqade MCP returns state probabilities and provenance, with replayable input and defaults", { skip: !enabled, timeout: 180000 }, async t => {
  const client = new Client({ name: "bloqade-live-verification", version: "1" }, { capabilities: {} });
  t.after(() => client.close());
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills/bloqade-analog/mcp/server.mjs")] }));
  await mkdir(evidence, { recursive: true });
  for (const [label, input] of [["single-atom", BLOQADE_TOOLS[0].input], ["defaults", {}]]) {
    const response = await client.callTool({ name: definition.tool.name, arguments: input }, undefined, { timeout: 120000 });
    assert.notEqual(response.isError, true, JSON.stringify(response));
    const output = response.structuredContent;
    assert.ok(definition.validateOutput(output));
    assert.deepEqual(output.input, definition.normalize(definition.tool.name, input));
    assert.equal(output.scientificValidation, "not_evaluated");
    assert.ok(output.result.maxNormError < 1e-6);
    if (label === "single-atom") assert.ok(Math.abs(output.result.rydbergPopulations.at(-1)[0] - Math.sin(0.2)**2) < 1e-8);
    await writeFile(path.join(evidence, `mcp-${label}.json`), JSON.stringify(output, null, 2));
  }
});
