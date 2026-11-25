import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { before, after } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { validateQubo } from "../validators/validate-result.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.OPENQUANTUM_REAL_L2 === "1";
const live = { skip: !enabled && "Requires the explicitly prepared pinned local QUBO SDK", timeout: 120000 };
let client;
before(async () => {
  if (!enabled) return;
  client = new Client({ name: "qubo-independent-live", version: "1" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, "mcp/server.mjs")], env: process.env }));
});
after(async () => { await client?.close(); });
for (const name of ["model", "maximize", "raw", "infeasible", "weak-penalty"]) {
  test(`pinned QUBO SDK and independent JS: ${name}`, live, async () => {
    const { request } = JSON.parse(readFileSync(path.join(root, "evals/fixtures", `${name}.json`)));
    const response = await client.callTool({ name: request.model ? "model_and_solve_qpanda_qubo" : "solve_qpanda_qubo", arguments: request });
    assert.equal(response.isError, undefined, JSON.stringify(response));
    const result = response.structuredContent, validation = validateQubo({ request, result });
    assert.deepEqual(result.validation, validation);
    assert.equal(result.scientificValidation, "observations_available");
    assert.equal(validation.observations.find(o => o.id === "provenance.complete").status, "not_checked");
    assert.equal(Object.hasOwn(validation, "status"), false);
    assert.deepEqual(validation.observations.filter(o => o.status === "fail").map(o => o.id).sort(),
      name === "infeasible" ? ["constraints.feasible", "penalty.sufficient"] : name === "weak-penalty" ? ["penalty.sufficient"] : []);
    assert.ok(validation.solutionEvaluations.every(row => Number.isFinite(row.objectiveValue) && Number.isFinite(row.penalizedEnergy)));
  });
}
