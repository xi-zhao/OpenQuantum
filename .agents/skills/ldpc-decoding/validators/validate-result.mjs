import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const multiply = (matrix, vector) => matrix.map(row => row.reduce((sum, bit, j) => sum ^ (bit & vector[j]), 0));
const binary = (v, n) => Array.isArray(v) && v.length === n && v.every(x => x === 0 || x === 1);
const equal = isDeepStrictEqual;

/** Independent input check, with GF(2) elimination before any native reference. */
export function normalizeRequest(raw) {
  const input = { errorRate: 0.05, bpIterations: 10, lsdOrder: 0, execution: {}, ...structuredClone(raw) };
  const issues = validateJsonWithSchema(input, path.join(root, "inputs/request.schema.json"));
  if (issues.length) throw new TypeError(issues.join("; "));
  const H = input.parityCheck, n = H[0].length, m = H.length;
  if (!H.every(row => binary(row, n) && row.some(Boolean)) || !input.syndromes.every(row => binary(row, m))) throw new TypeError("Invalid binary matrix/syndrome dimensions or zero check row");
  for (const syndrome of input.syndromes) {
    const rows = H.map((row, i) => [...row, syndrome[i]]);
    let k = 0;
    for (let j = 0; j < n && k < m; j++) {
      const i = rows.findIndex((row, position) => position >= k && row[j]);
      if (i < 0) continue;
      [rows[k], rows[i]] = [rows[i], rows[k]];
      for (let r = 0; r < m; r++) if (r !== k && rows[r][j]) for (let c = 0; c <= n; c++) rows[r][c] ^= rows[k][c];
      k++;
    }
    if (rows.some(row => !row.slice(0, n).some(Boolean) && row[n])) throw new TypeError("Inconsistent syndrome over GF(2)");
  }
  if (input.trueErrors && (input.trueErrors.length !== input.syndromes.length || !input.trueErrors.every((row, i) => binary(row, n) && equal(multiply(H, row), input.syndromes[i])))) throw new TypeError("True error vectors must have width n and generate the supplied syndromes");
  if (input.logicalObservables && !input.logicalObservables.every(row => binary(row, n))) throw new TypeError("Logical parity vectors must have width n");
  return input;
}

export function validateDecoding({ request, result, reference }) {
  const observations = [];
  const emit = (id, ok, detail) => observations.push({ id, status: ok ? "pass" : "fail", detail });
  const missing = (id, detail) => observations.push({ id, status: "not_checked", detail });
  let input;
  try { input = normalizeRequest(request); emit("request.scope", true, "Rectangular binary H, consistent binary syndromes and optional supplied error/logical parity vectors."); }
  catch (error) { emit("request.scope", false, error.message); }
  const issues = validateJsonWithSchema(result, path.join(root, "artifacts/ldpc-result.schema.json"));
  emit("artifact.schema", issues.length === 0, issues.join("; ") || "Structured decoder result.");
  if (input && !issues.length) {
    const n = input.parityCheck[0].length, shots = input.syndromes.length;
    const dimensions = [result.corrections, result.residualSyndromes, result.syndromeSatisfied, result.correctionWeights, result.bpConverged, result.bpIterationsUsed].every(a => a.length === shots)
      && result.corrections.every(row => binary(row, n)) && result.residualSyndromes.every(row => binary(row, input.parityCheck.length));
    emit("result.dimensions", dimensions, "One correction, residual, weight, convergence flag and iteration count per input syndrome.");
    if (dimensions) {
      const residuals = result.corrections.map((row, i) => multiply(input.parityCheck, row).map((b, j) => b ^ input.syndromes[i][j]));
      const matched = residuals.map(row => row.every(bit => bit === 0));
      const weights = result.corrections.map(row => row.reduce((s, bit) => s + bit, 0));
      emit("syndrome.replayed", equal(result.residualSyndromes, residuals) && equal(result.syndromeSatisfied, matched), "Every H e_hat + s is computed over GF(2), independently of claimed syndrome success.");
      emit("decoding.satisfied", matched.every(Boolean), "All corrections must satisfy their input syndromes; this is parity success, not logical success.");
      emit("weights.replayed", equal(result.correctionWeights, weights), "Hamming weights recomputed from every binary estimate.");
      emit("convergence.consistent", result.bpConverged.every((flag, i) => !flag || matched[i])
        && result.bpIterationsUsed.every(k => Number.isSafeInteger(k) && k >= 0 && k <= input.bpIterations), "A claimed BP convergence implies parity consistency; iteration counts obey the requested maximum. Native flags require separate replay.");
      const count = xs => xs.filter(Boolean).length;
      const logicalCount = input.logicalObservables ? count(result.corrections.map((row, i) => multiply(input.logicalObservables, row.map((b, j) => b ^ input.trueErrors[i][j])).some(Boolean))) : null;
      const exactCount = input.trueErrors ? count(result.corrections.map((row, i) => equal(row, input.trueErrors[i]))) : null;
      const expected = { shots, syndromeMatchedCount: count(matched), syndromeMatchRate: count(matched) / shots,
        bpConvergedCount: count(result.bpConverged), bpConvergenceRate: count(result.bpConverged) / shots,
        logicalFlipCount: logicalCount, logicalFlipRate: logicalCount === null ? null : logicalCount / shots,
        exactErrorMatchCount: exactCount, exactErrorMatchRate: exactCount === null ? null : exactCount / shots };
      emit("statistics.replayed", equal(result.statistics, expected), "Counts and rates recomputed per sample; logical flips are only projections against supplied true errors and parity vectors.");
      emit("logical.scope", result.logicalSuccess === (input.logicalObservables ? "evaluated-against-supplied-errors" : "not_evaluated"), "No logical success is inferred from syndrome agreement alone.");
      if (!input.logicalObservables) missing("logical.replayed", "No true-error/logical-parity pair was supplied, so logical flip rates are unknown.");
      else emit("logical.replayed", result.statistics.logicalFlipCount === logicalCount && result.statistics.logicalFlipRate === logicalCount / shots, "Logical parity flips independently recomputed; supplied vectors are not a proof of a quantum code's logical algebra.");
    }
    if (reference === undefined) missing("decoder.replayed", "Prepared independent BP+LSD reference was not available; no installation attempted.");
    else if (!equal(reference.runtime, result.runtime)) missing("decoder.replayed", "Recorded package/machine differs; deterministic replay is outside this environment.");
    else emit("decoder.replayed", reference.schemaVersion === "1.0" && reference.runtime.ldpc === "2.4.1"
      && equal(reference.request, input) && equal(reference.corrections, result.corrections)
      && equal(reference.bpConverged, result.bpConverged) && equal(reference.bpIterationsUsed, result.bpIterationsUsed), "A separate request-only Python program replayed serial BP+LSD with fixed options and checked estimates, convergence and iterations.");
  }
  missing("provenance.complete", "L2 observations only; no materialized Session provenance or final scientific Acceptance.");
  return { schemaVersion: "1.0", observations };
}

export async function replayDecoding(request, signal) {
  const input = normalizeRequest(request);
  const environment = Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"].flatMap(k => process.env[k] ? [[k, process.env[k]]] : []));
  return runLocalJsonProcess({ ...await preparedPythonLaunch({ skillRoot: root, args: [path.join(root, "validators/reference.py")] }),
    cwd: root, input, env: localComputeEnvironment(environment, input.execution), signal,
    ...localComputeProcessOptions(input.execution), label: "Independent LDPC decoder reference" });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const value = JSON.parse(readFileSync(process.argv[2], "utf8"));
  let reference, unavailable;
  if (process.argv[3] === "--replay") {
    try { reference = await replayDecoding(value.request); } catch (error) { unavailable = error.message; }
  }
  const validation = validateDecoding({ ...value, reference });
  if (unavailable) validation.observations.push({ id: "reference.available", status: "not_checked", detail: unavailable });
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
  else if (unavailable) process.exitCode = 2;
}
