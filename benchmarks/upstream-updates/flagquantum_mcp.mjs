import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Explicit development environment; never substitute this SDK into the preset.
const environment = process.argv[2];
assert.ok(environment, "Pass the isolated Python environment directory");
const command = path.resolve(environment, process.platform === "win32" ? "Scripts/flagquantum-mcp-server.exe" : "bin/flagquantum-mcp-server");
const snapshot = JSON.parse(await readFile(new URL("../../.agents/skills/flagquantum-workbench/mcp/upstream-tools.json", import.meta.url), "utf8"));
const client = new Client({ name: "upstream-sdk-compatibility", version: "1" }, { capabilities: {} });
try {
  await client.connect(new StdioClientTransport({ command, env: {
    ...Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TMPDIR", "TEMP"].filter(k => process.env[k]).map(k => [k, process.env[k]])),
    OMP_NUM_THREADS: "2", PYTHONDONTWRITEBYTECODE: "1", PYTHONNOUSERSITE: "1",
  } }));
  assert.deepEqual((await client.listTools()).tools, snapshot.tools);
  const circuit = '[{"name":"h","index":[0]},{"name":"cx","index":[0,1]}]';
  const call = (name, args) => client.callTool({ name, arguments: args }, undefined, { timeout: 30000 });
  const analysis = (await call("analyze_circuit_tool", { circuit, circuit_format: "qir" })).structuredContent;
  assert.equal(analysis.status, "success");
  assert.equal(analysis.analysis.two_qubit_gates, 1);
  const simulation = (await call("simulate_circuit_tool", { circuit, circuit_format: "qir" })).structuredContent;
  assert.equal(simulation.status, "success");
  simulation.outputs[0].value.forEach((v, i) => assert.ok(Math.abs(v - [0.5, 0, 0, 0.5][i]) < 1e-6));
  assert.equal(simulation.execution.accuracy.metric, "not_measured");
  const invalid = (await call("analyze_circuit_tool", { circuit: "not-json", circuit_format: "ir" })).structuredContent;
  assert.equal(invalid.status, "error");
  process.stdout.write(JSON.stringify({ toolSchemasMatched: snapshot.tools.length,
    denominator: 4, passed: 4, analysis, simulation, invalid,
    scope: "all schemas; analysis, Bell simulation and error calls only",
    scientificValidation: "not_evaluated" }, null, 2) + "\n");
} finally {
  await client.close();
}
