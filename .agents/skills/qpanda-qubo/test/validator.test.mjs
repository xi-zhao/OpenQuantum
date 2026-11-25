import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cases, evaluateCase, checkSuite } from "../evals/run-evals.mjs";
for (const item of cases) test(`qpanda-qubo independent observation: ${item.id}`, () => evaluateCase(item));
test("qpanda-qubo has a versioned Acceptance Profile and no Reproduction Profile", checkSuite);
test("qpanda-qubo Validator has no dependency on Tool implementation", () => {
  const source = readFileSync(new URL("../validators/validate-result.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import[^;]*(?:mcp|modeling)\//);
});

for (const name of ["raw", "model"]) {
  test(`QUBO result binds method, layer and reference policy for ${name} input`, async () => {
    const { validateQubo } = await import("../validators/validate-result.mjs");
    const fixture = JSON.parse(readFileSync(new URL(`../evals/fixtures/${name}.json`, import.meta.url)));
    const solver = result => name === "model" ? result.solver : result;
    const binding = input => validateQubo(input).observations.find(o => o.id === "solver.request-binding")?.status;
    assert.equal(binding(fixture), "pass");
    const input = structuredClone(fixture);
    Object.assign(input.request, { method: "qaoa", layer: 2 });
    assert.equal(binding(input), "fail", "Traversal output cannot satisfy a QAOA request");

    // Synthetic distribution for request-binding tests, not QAOA scientific evidence.
    const output = solver(input.result);
    const bits = output.classical.optimalAssignments[0].join("");
    output.quantum = { layer: 2, optimizer: "SLSQP", distribution: { [bits]: 1 }, topBitstring: bits };
    output.classicalRole = "reference";
    output.reference.status = "computed";
    assert.equal(binding(input), "pass");
    assert.deepEqual(validateQubo(input).observations.filter(o => o.status === "fail"), []);
    for (const edit of [
      value => { solver(value.result).quantum.layer = 3; },
      value => { value.request.method = "traversal"; delete value.request.layer; },
      value => { value.request.referenceMode = "skip"; },
      value => { solver(value.result).reference.mode = "required"; },
      value => { solver(value.result).classicalRole = "main"; },
      value => {
        value.request.referenceMode = "required";
        Object.assign(solver(value.result), { classical: null, classicalRole: "not_run",
          reference: { mode: "required", status: "not_run", reason: "Missing requested reference" } });
      },
    ]) {
      const changed = structuredClone(input);
      edit(changed);
      assert.equal(binding(changed), "fail");
    }
    input.request.referenceMode = "skip";
    Object.assign(output, { classical: null, classicalRole: "not_run",
      reference: { mode: "skip", status: "not_run", reason: "Caller skipped classical reference" } });
    assert.equal(binding(input), "pass", "QAOA without optional classical reference remains valid");
    assert.deepEqual(validateQubo(input).observations.filter(o => o.status === "fail"), []);
  });
}

test("independent exact enumeration includes n=16 and explicitly stops optimality claims above it", async () => {
  const { validateQubo } = await import("../validators/validate-result.mjs");
  const fixture = JSON.parse(readFileSync(new URL("../evals/fixtures/raw.json", import.meta.url)));
  for (const n of [16, 17]) {
    const request = { quadratic: Array.from({ length: n }, () => Array(n).fill(0)), linear: Array(n).fill(1), constant: 3, method: "traversal" };
    const result = structuredClone(fixture.result);
    result.problem.size = n;
    result.classical = { method: "qubobytraversal", minimumValue: 3, optimalAssignments: [Array(n).fill(0)] };
    const validation = validateQubo({ request, result });
    assert.deepEqual(validation.observations.filter(o => o.status === "fail"), []);
    assert.equal(validation.observations.find(o => o.id === "solver.classical-reference").status, n === 16 ? "pass" : "not_checked");
  }
});
