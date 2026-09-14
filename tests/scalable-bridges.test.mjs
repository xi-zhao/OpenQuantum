import assert from "node:assert/strict";
import test from "node:test";
import { SCALABLE_BRIDGES } from "./fixtures/scalable-bridges.mjs";
function sample(schema) {
  if (schema.anyOf) return sample(schema.anyOf[0]);
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.type === "object") return Object.fromEntries(schema.required.map(key => [key, sample(schema.properties[key])]));
  if (schema.type === "array") return Array.from({ length: schema.minItems }, () => sample(schema.items));
  if (["number", "integer"].includes(schema.type)) return Math.max(0, schema.minimum ?? 0);
  if (schema.type === "boolean") return false;
  if (schema.pattern === "^[01]+$") return "0";
  return "x".repeat(schema.minLength ?? 1);
}
for (const entry of SCALABLE_BRIDGES) {
  test(`${entry.id}: expanded input and honest optional-reference contract`, async () => {
    const { definition: d } = await import(`../.agents/skills/${entry.id}/mcp/contracts.mjs`);
    const input = d.normalize(entry.tool, entry.input);
    assert.equal(input.referenceMode, "auto");
    assert.throws(() => d.normalize(entry.tool, { ...entry.input, referenceMode: "pretend" }));
    const output = sample(d.tool.outputSchema);
    Object.assign(output, { input, inputSha256: "a".repeat(64), dependencyLockSha256: "b".repeat(64) });
    assert.ok(d.validateOutput(output), JSON.stringify(d.validateOutput.errors));
    output.result[entry.referenceFields[0]] = null;
    assert.equal(d.validateOutput(output), false, "computed cannot omit its reference");
    output.result.reference.status = "not_run";
    for (const key of entry.referenceFields) output.result[key] = null;
    if (entry.id === "clifft-sampling") {
      output.result.outcomesCoverage = "observed_only";
      output.result.outcomes.forEach(row => { row.referenceProbability = null; });
    }
    assert.ok(d.validateOutput(output), JSON.stringify(d.validateOutput.errors));
    output.result[entry.referenceFields[0]] = sample(d.tool.outputSchema.properties.result.properties[entry.referenceFields[0]]);
    assert.equal(d.validateOutput(output), false, "not_run cannot fabricate reference observations");
    output.result[entry.referenceFields[0]] = null;
    output.result.reference.mode = "required";
    assert.equal(d.validateOutput(output), false, "required cannot silently skip or change input mode");
    output.input.referenceMode = "required";
    assert.equal(d.validateOutput(output), false);
    output.input.referenceMode = output.result.reference.mode = "skip";
    assert.ok(d.validateOutput(output));
    output.result.reference.status = "computed";
    assert.equal(d.validateOutput(output), false);
    const oversizedReference = entry.id === "sqd-chemistry"
      ? { activeSpace: { numOrbitals: 16, numElectrons: 16 }, maxSubspaceDimension: 8 }
      : entry.input;
    assert.doesNotThrow(() => d.normalize(entry.tool, { ...oversizedReference, referenceMode: "required" }));
  });
}

test("larger requests are accepted while molecular structural constraints remain enforced", async () => {
  const bad = {
    "tenpy-ground-state": { numSites: 256, maxBondDimension: 256 },
    "tjm-dynamics": { numQubits: 128, trajectories: 128, steps: 32, maxBondDimension: 64 },
    "flow-vqe": { numQubits: 20, terms: [{ pauli: "Z".repeat(20), coefficient: 1 }] },
    "sqd-chemistry": { activeSpace: { numOrbitals: 32, numElectrons: 32 }, maxSubspaceDimension: 128 },
    "clifft-sampling": { numQubits: 128, shots: 8192 },
  };
  for (const [id,input] of Object.entries(bad)) {
    const { definition: d } = await import(`../.agents/skills/${id}/mcp/contracts.mjs`);
    assert.doesNotThrow(() => d.normalize(d.tool.name, input), id);
  }
  const { definition: d } = await import("../.agents/skills/sqd-chemistry/mcp/contracts.mjs");
  for (const input of [
    { activeSpace: { numOrbitals: 4, numElectrons: 3 } },
    { activeSpace: { numOrbitals: 2, numElectrons: 6 } },
    { molecule: { atoms: [{ element: "H", positionAngstrom: [0,0,0] }] } },
    { molecule: { atoms: [{ element: "H", positionAngstrom: [0,0,0] }, { element: "H", positionAngstrom: [0,0,0] }] } },
    { activeSpace: { numOrbitals: 4, numElectrons: 2 }, counts: { "0101": 64 } },
  ]) assert.throws(() => d.normalize(d.tool.name, input));
});
