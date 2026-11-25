import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cases, evaluateCase, checkSuite } from "../evals/run-evals.mjs";
for (const item of cases) test(`ldpc-decoding independent observation: ${item.id}`, () => evaluateCase(item));
test("ldpc-decoding is L2 with no Acceptance or Reproduction Profiles", checkSuite);
test("ldpc-decoding Validator has no dependency on Tool implementation", () => {
  const source = readFileSync(new URL("../validators/validate-result.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import[^;]*(?:mcp|modeling)\//);
});
