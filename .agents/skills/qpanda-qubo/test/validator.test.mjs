import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cases, evaluateCase, checkSuite } from "../evals/run-evals.mjs";
for (const item of cases) test(`qpanda-qubo independent observation: ${item.id}`, () => evaluateCase(item));
test("qpanda-qubo is L2 with no Acceptance or Reproduction Profiles", checkSuite);
test("qpanda-qubo Validator has no dependency on Tool implementation", () => {
  const source = readFileSync(new URL("../validators/validate-result.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import[^;]*(?:mcp|modeling)\//);
});

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
