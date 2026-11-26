import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test, { before, after } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const enabled = process.env.OPENQUANTUM_REAL_UNITARY_OBSERVATIONS === "1";
const specs = [
  ["pyzx-optimization", "optimize_pyzx_circuit"], ["symmer-tapering", "taper_symmer_hamiltonian"],
  ["paulie-algebra", "analyze_paulie_algebra"], ["graphix-mbqc", "simulate_graphix_pattern"],
];
const clients = new Map();
before(async () => {
  if (!enabled) return;
  for (const [id] of specs) {
    const client = new Client({ name: "unitary-independent-live", version: "1" });
    clients.set(id, client);
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve(`.agents/skills/${id}/mcp/server.mjs`)], env: process.env }));
  }
});
after(async () => { for (const client of clients.values()) await client.close(); });
for (const [id, name] of specs) {
  const directory = `.agents/skills/${id}/evals/fixtures`;
  for (const file of readdirSync(directory).filter(f => f.endsWith(".json"))) test(`live independent ${id}: ${file}`, { skip: !enabled, timeout: 240000 }, async () => {
    const fixed = JSON.parse(readFileSync(path.join(directory, file))), response = await clients.get(id).callTool({ name, arguments: fixed.request }, undefined, { timeout: 220000 });
    assert.equal(response.isError, undefined, JSON.stringify(response));
    const value = response.structuredContent, module = await import(`../.agents/skills/${id}/validators/validate-result.mjs`);
    assert.equal(value.scientificValidation, "observations_available");
    const reference = module.referenceSpectrum ? await module.referenceSpectrum(value.input, value.result) : undefined;
    const validation = module.validateResult({ request: value.input, result: value.result, reference });
    assert.deepEqual(value.validation, validation);
    assert.deepEqual(validation.observations.filter(o => o.status === "fail"), []);
    assert.equal(validation.observations.find(o => o.id === "provenance.complete").status, "not_checked");
    assert.equal(Object.hasOwn(validation, "status"), false);
    if (id === "symmer-tapering" && reference) {
      const corrupted = structuredClone(value.result); corrupted.reducedTerms[0].coefficient += 0.4;
      const independent = await module.referenceSpectrum(value.input, corrupted);
      assert.equal(module.validateResult({ request: value.input, result: corrupted, reference: independent }).observations.find(o => o.id === "sector.spectrum").status, "fail");
    }
  });
}
