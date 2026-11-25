import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cases, evaluateCase, checkSuite } from "../evals/run-evals.mjs";
for (const item of cases) test(`graphix-mbqc independent observation: ${item.id}`, () => evaluateCase(item));
test("graphix-mbqc has independently bound schemas and no Acceptance or Reproduction Profiles", checkSuite);
test("graphix-mbqc Validator does not import the Tool implementation", () => {
  const source = readFileSync(new URL("../validators/validate-result.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import[^;]*(?:mcp|bridge|quantum_reference)/);
});
