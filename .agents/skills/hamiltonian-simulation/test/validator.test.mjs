import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { cases, evaluateCase, checkSuite } from "../evals/run-evals.mjs";
import { normalizeRequest, validateSimulation, trotterBound } from "../validators/validate-result.mjs";

const fixture = name => JSON.parse(readFileSync(new URL(`../evals/fixtures/${name}.json`, import.meta.url)));
for (const item of cases) test(`Hamiltonian observation fixture: ${item.id}`, () => evaluateCase(item));
test("Hamiltonian L2 manifest binds the offline suite without Acceptance Profiles", checkSuite);
test("missing reference and incompatible RNG scope remain explicitly not_checked", () => {
  const input = fixture("qdrift");
  delete input.reference;
  const observations = validateSimulation(input).observations;
  assert.equal(observations.find(o => o.id === "seed.replayed").status, "not_checked");
  input.reference = fixture("qdrift").reference;
  input.reference.runtime.numpy = "unmatched";
  assert.equal(validateSimulation(input).observations.find(o => o.id === "seed.replayed").status, "not_checked");
});
test("nonfinite, complex, malformed or unnormalized requests cannot enter the independent reference", () => {
  const { request } = fixture("trotter-2");
  for (const patch of [{ time: NaN }, { terms: [{ pauli: "XI", coefficient: Infinity }] }, { terms: [{ pauli: "XI", coefficient: { re: 1, im: 1 } }] }, { numQubits: 1 }, { steps: 0 }, { initialState: [[1,0],[1,0],[0,0],[0,0]] }, { method: "qdrift" }]) {
    assert.throws(() => normalizeRequest({ ...request, ...patch }));
  }
});
test("zero/commuting and roundoff cases do not claim an observed convergence order", () => {
  for (const name of ["identity", "zero-time"]) {
    const observations = validateSimulation(fixture(name)).observations;
    assert.equal(observations.find(o => o.id === "trotter.convergence").status, "not_checked");
  }
  assert.equal(trotterBound(0, 1, 1, 2), 0);
  assert.equal(trotterBound(1, 0, 1, 2), 0);
  assert.equal(trotterBound(100, 100, 1, 4), 2);
});
test("CLI missing prepared Python returns exit 2 with observations and no implicit installation", () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../validators/validate-result.mjs", import.meta.url)), fileURLToPath(new URL("../evals/fixtures/trotter-2.json", import.meta.url)), "--reference"], {
    encoding: "utf8", env: { ...process.env, OPENQUANTUM_PYTHON_ENV_ROOT: fileURLToPath(new URL("../evals/nonexistent-environments", import.meta.url)) },
  });
  assert.equal(result.status, 2, result.stderr);
  const validation = JSON.parse(result.stdout);
  assert.equal(validation.observations.find(o => o.id === "reference.available").status, "not_checked");
  assert.equal(Object.hasOwn(validation, "status"), false);
});
