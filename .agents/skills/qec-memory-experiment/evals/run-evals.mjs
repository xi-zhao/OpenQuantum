import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCapability } from "../../../skill-contracts/index.mjs";
import { validateExperiment } from "../validators/validate-result.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
export const cases = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));

export function evaluateCase(testCase) {
  const raw = readFileSync(new URL(`./fixtures/${testCase.fixture}`, import.meta.url));
  assert.equal(createHash("sha256").update(raw).digest("hex"), testCase.fixtureSha256, "Fixed evidence changed");
  const input = JSON.parse(raw);
  for (const [key, value] of Object.entries(testCase.edits)) {
    const fields = key.split(".");
    const leaf = fields.pop();
    const target = fields.reduce((node, field) => node[field], input);
    target[leaf] = value;
  }
  if (!testCase.reference) delete input.reference;
  const result = validateExperiment(input);
  const failed = result.observations.filter(item => item.status === "fail").map(item => item.id).sort();
  assert.deepEqual(failed, [...testCase.failedChecks].sort(), testCase.id);
  assert.equal(result.observations.find(item => item.id === "provenance.complete").status, "not_checked");
  assert.equal(Object.hasOwn(result, "status"), false, "A Validator must not derive Acceptance");
  return result;
}

export async function checkSuite() {
  const capability = await loadCapability(root);
  assert.deepEqual(capability.manifest.acceptanceProfiles, []);
  assert.deepEqual(capability.manifest.reproductionProfiles, []);
  assert.deepEqual(capability.evaluationSuite.cases.map(item => item.id), cases.map(item => item.id));
  for (const [index, item] of cases.entries()) {
    const expected = capability.evaluationSuite.cases[index].expectedOutcome;
    assert.deepEqual(expected.failedChecks, item.failedChecks);
    assert.equal(expected.caseSha256, createHash("sha256").update(JSON.stringify(item)).digest("hex"), item.id);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkSuite();
  let failures = 0;
  for (const item of cases) {
    try { evaluateCase(item); console.log(`PASS ${item.id}`); }
    catch (error) { failures++; console.error(`FAIL ${item.id}: ${error.message}`); }
  }
  console.log(`Fixed observation evals: ${cases.length - failures} passed, ${failures} failed; no scientific Acceptance.`);
  if (failures) process.exitCode = 1;
}
