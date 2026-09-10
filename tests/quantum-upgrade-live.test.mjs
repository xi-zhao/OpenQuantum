import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runLocalJsonProcess } from "../src/lib/local-json-process.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const enabled = process.env.OPENQUANTUM_REAL_QUANTUM === "1"
  || process.env.npm_lifecycle_event === "test:quantum-upgrade:live";
const environment = Object.fromEntries(
  ["HOME", "PATH", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "UV_CACHE_DIR", "UV_PYTHON_INSTALL_DIR", "TMPDIR"]
    .filter((name) => process.env[name]).map((name) => [name, process.env[name]]),
);

async function bridge(skill, input) {
  return runLocalJsonProcess({
    command: "uv",
    args: ["run", "--frozen", "--project", `.agents/skills/${skill}`, "python", `.agents/skills/${skill}/mcp/bridge.py`],
    cwd: root,
    env: { ...environment, UV_PROJECT_ENVIRONMENT: path.join(root, ".openquantum/python-envs", skill) },
    input, timeoutMs: 240_000, maxOutputBytes: 2 * 1024 * 1024, label: skill,
  });
}

test("TyxonQ preserves Bell amplitudes, asymmetric bit order and phase interference", { skip: !enabled, timeout: 300_000 }, async () => {
  for (const [numQubits, operations, expected] of [
    [2, [{ gate: "h", qubits: [0] }, { gate: "cx", qubits: [0, 1] }], { "00": 0.5, "11": 0.5 }],
    [3, [{ gate: "x", qubits: [0] }], { "100": 1 }],
    [1, [{ gate: "h", qubits: [0] }, { gate: "s", qubits: [0] }, { gate: "sdg", qubits: [0] }, { gate: "h", qubits: [0] }], { "0": 1 }],
  ]) {
    const result = await bridge("tyxonq-workbench", { action: "simulate", request: { numQubits, operations, mode: "exact" } });
    assert.equal(result.tyxonqVersion, "1.3.0");
    for (const [bits, probability] of Object.entries(result.result.probabilities)) {
      assert.ok(Math.abs(probability - (expected[bits] ?? 0)) < 1e-10, `${bits}: ${probability}`);
    }
    // TyxonQ may lower X to Rx(pi), which differs by a global phase. Compare
    // the whole state with one shared phase, preserving all relative phases.
    const first = Number.parseInt(Object.keys(expected)[0], 2);
    const reference = result.result.statevector[first];
    const scale = Math.sqrt(expected[Object.keys(expected)[0]]);
    const phase = { real: reference.real / scale, imag: reference.imag / scale };
    assert.ok(Math.abs(phase.real ** 2 + phase.imag ** 2 - 1) < 1e-10);
    for (const [index, amplitude] of result.result.statevector.entries()) {
      const expectedAmplitude = Math.sqrt(expected[index.toString(2).padStart(numQubits, "0")] ?? 0);
      assert.ok(Math.abs(amplitude.real - expectedAmplitude * phase.real) < 1e-10);
      assert.ok(Math.abs(amplitude.imag - expectedAmplitude * phase.imag) < 1e-10);
    }
    assert.ok(result.checks.normalizationError < 1e-10);
    assert.equal(result.scientificValidation, "not_evaluated");
  }
});

test("TyxonQ full amplitude damping returns the ground state", { skip: !enabled, timeout: 300_000 }, async () => {
  const result = await bridge("tyxonq-workbench", { action: "simulate", request: {
    numQubits: 1, operations: [{ gate: "x", qubits: [0] }], mode: "sampled", shots: 128,
    noise: { type: "amplitude_damping", strength: 1 },
  } });
  assert.equal(result.result.counts["0"], 128);
  assert.equal(result.checks.countsMatchShots, true);
});

test("QCEC preserves exact, inequivalent and global-phase classifications", { skip: !enabled, timeout: 300_000 }, async () => {
  const qasm = (body) => `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[1];\n${body}`;
  for (const [left, right, expected] of [
    ["x q[0]; x q[0];", "id q[0];", "equivalent"],
    ["x q[0];", "id q[0];", "not_equivalent"],
    ["x q[0]; z q[0]; x q[0]; z q[0];", "id q[0];", "equivalent_up_to_global_phase"],
  ]) {
    const result = await bridge("quantum-circuit-verification", { action: "verify", circuitA: qasm(left), circuitB: qasm(right) });
    assert.equal(result.packageVersion, "3.10.0");
    assert.equal(result.equivalence, expected);
  }
});
