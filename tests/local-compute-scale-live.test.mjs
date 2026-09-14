import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const enabled = process.env.OPENQUANTUM_REAL_LOCAL_SCALE === "1";
const root = process.cwd();
const near = (x, y, tolerance = 1e-8) => assert.ok(Math.abs(x - y) <= tolerance, `${x} != ${y}`);
const qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[129];\n${"x q[128];\n".repeat(600)}`;
const cases = [
  ["qec-memory-experiment", "run_qec_memory_experiment", { basis: "z", distance: 9, rounds: 21, shots: 50001, physicalErrorRate: 0, seed: 7 }, o => assert.equal(o.facts.result.logicalErrors, 0)],
  ["quantum-circuit-verification", "verify_circuit_equivalence", { circuitAOpenQasm2: qasm, circuitBOpenQasm2: qasm.replace("qreg q[129];", "qreg q[129];\n" + " ".repeat(65536)) }, o => assert.match(o.result.equivalence, /equivalent/)],
  ["quantum-information-audit", "audit_density_matrix", { matrixReal: Array.from({ length: 32 }, (_, i) => Array.from({ length: 32 }, (_, j) => i === j ? 1 / 32 : 0)), subsystemDimensions: [2, 2, 2, 2, 2], transposeSubsystems: [0, 4] }, o => { near(o.analysis.state.purity.real, 1 / 32); near(o.analysis.partialTranspose.negativity, 0); }],
  ["tyxonq-workbench", "simulate_tyxonq_circuit", { numQubits: 9, operations: [{ gate: "x", qubits: [8] }], mode: "exact" }, o => { near(o.checks.normalizationSum, 1); assert.equal(o.result.statevector.length, 512); }],
  ["fatqat-workbench", "simulate_fatqat_circuit", { backend: "general", numQubits: 9, operations: [{ gate: "x", qubits: [8] }], shots: 0, seed: 7 }, o => near(Object.values(o.result.probabilities).reduce((a, b) => a + b, 0), 1)],
  ["fatqat-workbench", "simulate_fatqat_dynamics", { model: "rydberg", numAtoms: 7, spacingUm: 6, durationUs: 0.01, omegaRadPerUs: 0, samples: 52 }, o => near(o.result.probabilities["0000000"], 1)],
  ["qpanda-qubo", "solve_qpanda_qubo", { quadratic: Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => i === j ? -1 : 0)), method: "traversal", referenceMode: "skip" }, o => near(o.classical.minimumValue, -6)],
  ["qpanda-qubo", "model_and_solve_qpanda_qubo", { model: { variables: ["a", "b"], objective: { sense: "minimize", linear: [{ variable: "b", coefficient: -1 }] } }, method: "qaoa", layer: 1, referenceMode: "skip" }, o => { assert.equal(o.solver.classical, null); assert.equal(o.modeling.reference.compiledMinimum, null); assert.ok(o.validation.observations.every(x => x.status === "not_checked")); }],
  ["ldpc-decoding", "decode_ldpc_syndromes", { parityCheck: Array.from({ length: 65 }, (_, i) => Array.from({ length: 129 }, (_, j) => i === j ? 1 : 0)), syndromes: [Array.from({ length: 65 }, (_, i) => i % 2)], errorRate: 0.05, bpIterations: 101, lsdOrder: 0 }, o => assert.deepEqual(o.result.syndromeSatisfied, [true])],
  ["deltakit-qec", "run_deltakit_memory", { width: 7, height: 7, rounds: 11, shots: 128, noiseProbability: 0 }, o => assert.equal(o.result.logicalFailures, 0)],
  ["dynamiqs-dynamics", "simulate_dynamiqs_dynamics", { drives: Array(9).fill(0), duration: 6, steps: 101, initialState: "excited", dampingRate: 0.1, referenceMode: "required" }, o => { near(o.result.excitedPopulations[0].at(-1), Math.exp(-0.6), 1e-7); assert.equal(o.result.reference.status, "computed"); }],
  ["oqupy-dynamics", "simulate_oqupy_spin_boson", { tunneling: 0, bias: 0, alpha: 0, duration: 2.1, steps: 41, memorySteps: 2, initialState: "ground" }, o => { assert.equal(o.result.times.length, 42); near(o.result.bloch.at(-1)[2], 1); }],
  ["mitiq-error-mitigation", "run_mitiq_experiment", { method: "zne", numQubits: 5, gates: Array.from({ length: 26 }, () => ({ name: "H", targets: [0] })), observable: "ZIIII", depolarizingProbability: 0, shotsBudget: 1024, replicates: 4 }, o => near(o.result.idealExpectation, 1)],
  ["randomized-measurements", "estimate_randomized_purity", { numQubits: 7, state: "ghz", subsystem: [0, 1, 2, 3, 4], settings: 8, shotsPerSetting: 16 }, o => near(o.result.analyticPurity, 0.5)],
  ["tenpy-ground-state", "solve_tenpy_chain", { numSites: 257, jx: 0, jy: 0, jz: 0, hz: 0.8, maxBondDimension: 2, maxSweeps: 2, referenceMode: "skip" }, o => { near(o.result.energy, -102.8, 1e-6); assert.equal(o.result.exactGroundEnergy, null); }],
  ["tjm-dynamics", "simulate_tjm_dynamics", { numQubits: 8, coupling: 0, field: 0, dampingRate: 0, duration: 0.02, steps: 2, trajectories: 8, maxBondDimension: 2, referenceMode: "skip" }, o => { assert.equal(o.result.referenceSiteZ, null); o.result.siteZ.forEach(row => row.forEach(z => near(z, 1))); }],
  ["flow-vqe", "train_flow_vqe", { numQubits: 12, terms: [{ pauli: "ZIIIIIIIIIII", coefficient: -1 }], epochs: 1, batchSize: 4, referenceMode: "skip" }, o => { near(o.result.bestEnergy, o.result.recomputedEnergy, 1e-6); assert.equal(o.result.exactGroundEnergy, null); }],
  ["sqd-chemistry", "run_sqd_chemistry", { molecule: { atoms: [{ element: "Na", positionAngstrom: [0, 0, 0] }, { element: "H", positionAngstrom: [0, 0, 1.9] }] }, basis: "sto-3g", activeSpace: { numOrbitals: 2, numElectrons: 2 }, counts: { "0101": 4097 }, iterations: 1, referenceMode: "required" }, o => { assert.equal(o.result.totalShots, 4097); assert.equal(o.result.reference.status, "computed"); assert.ok(o.result.energyHartree >= o.result.fciEnergyHartree - 1e-7); }],
];

for (const [id, tool, input, check] of cases) {
  test(`real local scale: ${id}/${tool}`, { skip: !enabled, timeout: 300000 }, async t => {
    const client = new Client({ name: "local-scale-check", version: "1" }, { capabilities: {} });
    t.after(() => client.close());
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(root, ".agents/skills", id, "mcp/server.mjs")], env: { ...process.env } }));
    const result = await client.callTool({ name: tool, arguments: input }, undefined, { timeout: 280000 });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    const out = result.structuredContent;
    const directory = path.join(root, ".openquantum/compute-scale-evidence/live");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${id}-${tool}.json`), JSON.stringify({ checkedAt: new Date().toISOString(), input, output: out }, null, 2));
    check(out);
  });
}
