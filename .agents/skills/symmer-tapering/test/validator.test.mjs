import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cases, evaluateCase, checkSuite } from "../evals/run-evals.mjs";
for (const item of cases) test(`symmer-tapering independent observation: ${item.id}`, () => evaluateCase(item));
test("symmer-tapering has a versioned Acceptance Profile and no Reproduction Profile", checkSuite);
test("symmer-tapering Validator does not import the Tool implementation", () => {
  const source = readFileSync(new URL("../validators/validate-result.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import[^;]*(?:mcp|bridge|quantum_reference)/);
});
