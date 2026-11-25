import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import Ajv from "ajv/dist/2020.js";
import { validateJsonWithSchema } from "../../../skill-contracts/index.mjs";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
import { runLocalJsonProcess } from "../../../../src/lib/local-json-process.mjs";
import { localComputeEnvironment, localComputeProcessOptions } from "../../../../src/lib/local-compute-policy.mjs";
import requestSchema from "../inputs/request.schema.json" with { type: "json" };

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const artifactSchema = path.join(skillRoot, "artifacts/hamiltonian-simulation-result.schema.json");
const ajv = new Ajv({ strict: false, strictNumbers: true, allErrors: true, useDefaults: true });
const checkRequest = ajv.compile(requestSchema);
const close = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-10 + 1e-8 * Math.abs(b);
const norm = state => state.reduce((sum, [re, im]) => sum + re * re + im * im, 0);
const pairsClose = (a, b) => a.length === b.length && a.every((z, i) => z.every((x, j) => close(x, b[i][j])));

// Kept independent of the Tool normalizer: both boundaries reject invalid physics.
export function normalizeRequest(raw) {
  const v = structuredClone(raw);
  if (!checkRequest(v)) throw new TypeError(ajv.errorsText(checkRequest.errors));
  if (v.terms.some(t => t.pauli.length !== v.numQubits)) throw new TypeError("Pauli length must equal numQubits");
  if (v.method === "trotter") {
    v.order ??= 2;
    if (v.seed !== undefined || v.order !== 1 && v.order % 2) throw new TypeError("Trotter needs order 1 or even and no seed");
  } else {
    v.seed ??= 0;
    if (v.order !== undefined) throw new TypeError("qDrift does not take order");
  }
  if (Array.isArray(v.initialState) && (Math.log2(v.initialState.length) !== v.numQubits || Math.abs(norm(v.initialState) - 1) > 1e-10)) throw new TypeError("Initial state must be normalized with 2^n entries");
  if (v.outputMode === "circuit" && v.initialState !== "zero") throw new TypeError("Circuit-only output requires the default initial state");
  const scale = v.terms.reduce((s, t) => s + Math.abs(t.coefficient), 0);
  if (!Number.isFinite(scale) || !Number.isFinite(scale * v.time)) throw new TypeError("Nonfinite Hamiltonian scale");
  return v;
}

function sum(values) {
  // Compensated summation keeps duplicate/cancelled terms independent of their order.
  let total = 0, correction = 0;
  for (const value of values) {
    const next = total + value;
    correction += Math.abs(total) >= Math.abs(value) ? (total - next) + value : (value - next) + total;
    total = next;
  }
  return total + correction;
}

export function trotterBound(lambda, time, steps, order) {
  let absoluteWeight = lambda;
  for (let p = 4; p <= order; p += 2) {
    const r = 1 / (4 - 4 ** (1 / (p - 1)));
    absoluteWeight *= 4 * r + Math.abs(1 - 4 * r);
  }
  let logFactorial = 0;
  for (let k = 2; k <= order + 1; k++) logFactorial += Math.log(k);
  const tail = x => x === 0 ? 0 : Math.exp(Math.min(2, x + (order + 1) * Math.log(x) - logFactorial));
  return Math.min(2, steps * (tail(absoluteWeight * Math.abs(time) / steps) + tail(lambda * Math.abs(time) / steps)));
}

function angleValue(source) {
  const tokens = source.replaceAll(" ", "").match(/[+-]?(?:pi|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)|[*/]/g);
  if (!tokens || tokens.join("") !== source.replaceAll(" ", "") || tokens.length % 2 === 0) throw new Error("Unsupported angle expression");
  const number = t => t.endsWith("pi") ? (t.startsWith("-") ? -Math.PI : Math.PI) : Number(t);
  let value = number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    if (!["*", "/"].includes(tokens[i])) throw new Error("Unsupported angle operator");
    value = tokens[i] === "*" ? value * number(tokens[i + 1]) : value / number(tokens[i + 1]);
  }
  if (!Number.isFinite(value)) throw new Error("Nonfinite angle");
  return value;
}

function parseQasm(source, numQubits) {
  const gates = [], counts = {};
  let phase, header = 0, include = 0, declaration = 0;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line === "OPENQASM 3.0;") { header++; continue; }
    if (line === 'include "stdgates.inc";') { include++; continue; }
    if (line === `qubit[${numQubits}] q;`) { declaration++; continue; }
    const global = line.match(/^gphase\(([^)]+)\);$/);
    if (global) {
      if (phase !== undefined) throw new Error("Duplicate global phase");
      phase = angleValue(global[1]); continue;
    }
    const match = line.match(/^(h|s|sdg|rz|cx)(?:\(([^)]+)\))? (q\[\d+\](?:, q\[\d+\])?);$/);
    if (!match) throw new Error("Unexpected OpenQASM instruction");
    const [, name, angle, wires] = match;
    const qubits = [...wires.matchAll(/q\[(\d+)\]/g)].map(m => Number(m[1]));
    if (qubits.some(q => q >= numQubits) || new Set(qubits).size !== qubits.length || qubits.length !== (name === "cx" ? 2 : 1) || (name === "rz") !== (angle !== undefined)) throw new Error("Invalid gate arguments");
    gates.push({ name, qubits, ...(angle === undefined ? {} : { angle: angleValue(angle) }) });
    counts[name] = (counts[name] ?? 0) + 1;
  }
  if (header !== 1 || include !== 1 || declaration !== 1 || phase === undefined) throw new Error("Missing or duplicated OpenQASM declaration/phase");
  return { gates, counts, phase };
}

/** Pure observations; only the trusted request-only reference supplies the oracle. */
export function validateSimulation({ request, result, reference }) {
  const observations = [];
  const emit = (id, condition, detail) => observations.push({ id, status: condition ? "pass" : "fail", detail });
  const missing = (id, detail) => observations.push({ id, status: "not_checked", detail });
  let v;
  try { v = normalizeRequest(request); emit("request.scope", true, "Real Hermitian Pauli model and normalized initial state."); }
  catch (error) { emit("request.scope", false, error.message); }
  const issues = validateJsonWithSchema(result, artifactSchema);
  emit("artifact.schema", issues.length === 0, issues.join("; ") || "Structured Hamiltonian result matches its schema.");
  if (v && issues.length === 0) {
    const grouped = new Map();
    for (const t of v.terms) grouped.set(t.pauli, [...(grouped.get(t.pauli) ?? []), t.coefficient]);
    const combined = [...grouped].map(([pauli, values]) => ({ pauli, coefficient: sum(values) }));
    const identity = combined.find(t => t.pauli === "I".repeat(v.numQubits))?.coefficient ?? 0;
    const terms = combined.filter(t => t.pauli !== "I".repeat(v.numQubits) && t.coefficient !== 0);
    const lambda = sum(terms.map(t => Math.abs(t.coefficient)));
    const active = terms.length > 0 && v.time !== 0;
    emit("request.binding", result.method === v.method && result.numQubits === v.numQubits && result.steps === v.steps
      && result.order === (v.order ?? null) && result.seed === (v.seed ?? null), "Method, qubits, steps, order and seed bind to the original request.");
    emit("hamiltonian.terms", terms.length === result.terms.length && terms.every((t, i) => t.pauli === result.terms[i].pauli && close(t.coefficient, result.terms[i].coefficient))
      && close(identity, result.identityCoefficient) && close(lambda, result.lambda), "Duplicate terms, identity phase and coefficient L1 norm are recomputed.");
    const rotations = !active ? 0 : v.method === "qdrift" ? v.steps : v.steps * (v.order === 1 ? terms.length : (2 * terms.length - 1) * 5 ** (v.order / 2 - 1));
    emit("sampling.budget", result.pauliRotations === rotations && (v.method === "qdrift"
      ? result.sampledTermCounts.length === terms.length && sum(result.sampledTermCounts) === rotations
      : result.sampledTermCounts.length === 0), "Exact Trotter rotation count or qDrift sampled-rotation budget; no probabilistic error guarantee.");
    if (v.outputMode === "statevector") {
      emit("state.normalized", Array.isArray(result.statevector) && Math.log2(result.statevector.length) === v.numQubits
        && Math.abs(norm(result.statevector) - 1) <= 1e-10 && Math.abs(result.stateNorm - norm(result.statevector)) <= 1e-10,
      "Squared norm is recomputed from every amplitude, absolute tolerance 1e-10.");
    } else emit("state.omitted", result.statevector === null && result.stateNorm === null && result.stateFidelity === null, "Circuit-only output does not assert a simulated state or its fidelity.");
    const computed = v.referenceMode === "required" || v.referenceMode === "auto" && v.numQubits <= 6;
    emit("reference.mode", result.reference.mode === v.referenceMode && result.reference.status === (computed ? "computed" : "not_run")
      && (computed && v.outputMode === "statevector" ? result.stateFidelity !== null : result.stateFidelity === null), "Dense work follows auto <= 6 / required / skip without limiting the primary computation.");
    let assembly;
    try {
      assembly = parseQasm(result.openQasm3, v.numQubits);
      emit("circuit.resources", assembly.gates.length === result.circuit.gates
        && isDeepStrictEqual(assembly.counts, result.circuit.gateCounts) && (assembly.counts.cx ?? 0) === result.circuit.twoQubitGates
        && (assembly.counts.rz ?? 0) === rotations && close(Math.sin(assembly.phase), Math.sin(-identity * v.time))
        && close(Math.cos(assembly.phase), Math.cos(-identity * v.time)) && close(assembly.phase, result.circuit.globalPhase), "OpenQASM gate counts, rotation budget and exact identity phase agree.");
    } catch (error) { emit("circuit.resources", false, error.message); }
    const oracleChecks = ["circuit.replayed", "seed.replayed", "state.replayed", "fidelity.replayed", "unitary-error.replayed", "trotter.error-bound", "trotter.convergence"];
    if (reference === undefined) {
      for (const id of oracleChecks) missing(id, "Independent prepared Python reference was not supplied; no installation attempted.");
    } else {
      try {
        emit("reference.binding", isDeepStrictEqual(reference.request, v), "Reference reads only the original request, not the Tool result.");
        const expected = reference.circuit;
        emit("circuit.replayed", isDeepStrictEqual(reference.request, v) && assembly !== undefined && assembly.gates.length === reference.gates.length
          && assembly.gates.every((g, i) => g.name === reference.gates[i].name && isDeepStrictEqual(g.qubits, reference.gates[i].qubits) && (g.angle === undefined || close(g.angle, reference.gates[i].angle)))
          && ["gates", "twoQubitGates", "depth"].every(k => result.circuit[k] === expected[k]) && isDeepStrictEqual(result.circuit.gateCounts, expected.gateCounts),
        "Independent Pauli schedule reconstructs every emitted gate, angle, wire and circuit depth.");
        if (v.method !== "qdrift") missing("seed.replayed", "Deterministic Trotter formula has no sampling seed.");
        else if (!isDeepStrictEqual(result.runtime, reference.runtime)) missing("seed.replayed", "NumPy version or machine differs; bitwise PCG64 replay is outside this recorded scope.");
        else emit("seed.replayed", result.sequenceSha256 === reference.sequenceSha256 && isDeepStrictEqual(result.sampledTermCounts, reference.sampledTermCounts), "Same pinned NumPy PCG64, machine, request and scalar-choice convention reproduce the sequence digest and counts.");
        if (!computed || !reference.dense) {
          for (const id of ["state.replayed", "fidelity.replayed", "unitary-error.replayed", "trotter.error-bound", "trotter.convergence"]) missing(id, "Dense numerical reference was not run.");
        } else {
          const dense = reference.dense;
          if (v.outputMode === "statevector" && result.statevector) {
            emit("state.replayed", pairsClose(result.statevector, dense.statevector), "Analytic Pauli exponentials reproduce the complex state, including global phase.");
            let re = 0, im = 0;
            for (const [i, [a, b]] of result.statevector.entries()) {
              const [c, d] = dense.exactState[i]; re += a * c + b * d; im += b * c - a * d;
            }
            emit("fidelity.replayed", close(result.stateFidelity, re * re + im * im) && close(result.stateFidelity, dense.stateFidelity), "Fidelity |<exp(-iHt) psi0|psi>|^2 is recomputed using Hermitian spectral decomposition.");
          } else {
            missing("state.replayed", "Circuit-only output."); missing("fidelity.replayed", "Circuit-only output.");
          }
          emit("unitary-error.replayed", close(result.unitaryFrobeniusError, dense.unitaryFrobeniusError) && close(result.unitarySpectralError, dense.unitarySpectralError), "Full-unitary Frobenius and spectral errors are independently reconstructed; tolerance 1e-10 + 1e-8 relative.");
          if (v.method === "trotter") {
            const points = reference.refinements;
            const valid = points.length === 3 && points.every((p, i) => p.steps === v.steps * 2 ** i
              && Number.isFinite(p.spectralError) && p.spectralError >= 0 && close(p.bound, trotterBound(lambda, v.time, p.steps, v.order))
              && p.spectralError <= p.bound + 1e-10);
            emit("trotter.error-bound", valid && result.unitarySpectralError <= trotterBound(lambda, v.time, v.steps, v.order) + 1e-10,
              "At N, 2N, 4N, spectral error obeys the Taylor-remainder/telescoping bound capped at 2; this is a conservative numerical check.");
            const orders = points.slice(1).map((p, i) => Math.log2(points[i].spectralError / p.spectralError));
            if (valid && points.every(p => p.spectralError > 1e-10) && orders.every(p => Math.abs(p - v.order) <= 0.5)) {
              emit("trotter.convergence", true, `Observed spectral-error orders ${orders.map(p => p.toFixed(4)).join(", ")} at N, 2N, 4N; expected asymptotic order ${v.order}.`);
            } else missing("trotter.convergence", "Commuting/zero/roundoff or no stable asymptotic regime at these budgets; convergence order is not asserted.");
          } else {
            missing("trotter.error-bound", "qDrift single realizations do not have a Trotter bound.");
            missing("trotter.convergence", "No monotonic single-seed qDrift convergence claim.");
          }
        }
      } catch (error) { emit("reference.structure", false, `Invalid independent reference: ${error.message}`); }
    }
  }
  missing("provenance.complete", "Execution observations only: Session provenance is checked separately after Materializer readback.");
  return { schemaVersion: "1.0", observations };
}

export async function referenceSimulation(request, signal) {
  const input = normalizeRequest(request);
  const environment = Object.fromEntries(["HOME", "PATH", "SYSTEMROOT", "TEMP", "TMP", "TMPDIR", "WINDIR"]
    .flatMap(k => process.env[k] ? [[k, process.env[k]]] : []));
  return runLocalJsonProcess({
    ...await preparedPythonLaunch({ skillRoot, args: [path.join(skillRoot, "validators/reference.py")] }),
    cwd: skillRoot, env: localComputeEnvironment(environment, input.execution), input, signal,
    ...localComputeProcessOptions(input.execution), label: "Independent Hamiltonian reference",
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [filename, option] = process.argv.slice(2);
  if (!filename || option !== undefined && option !== "--reference") throw new Error("Usage: node validate-result.mjs result.json [--reference]");
  const value = JSON.parse(readFileSync(filename, "utf8"));
  const request = value.request ?? value.input;
  let reference, unavailable;
  if (option === "--reference") {
    try { reference = await referenceSimulation(request); } catch (error) { unavailable = error.message; }
  }
  const validation = validateSimulation({ request, result: value.result, reference });
  if (unavailable) validation.observations.push({ id: "reference.available", status: "not_checked", detail: unavailable });
  console.log(JSON.stringify(validation, null, 2));
  if (validation.observations.some(o => o.status === "fail")) process.exitCode = 1;
  else if (unavailable) process.exitCode = 2;
}
