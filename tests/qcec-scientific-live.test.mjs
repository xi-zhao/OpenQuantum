import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { independentReference } from "../.agents/skills/quantum-circuit-verification/validators/independent-reference.mjs";
import { normalizeAuditRequest } from "../.agents/skills/quantum-circuit-verification/core/request-contract.mjs";
import { scientificResultAdapter, QUANTUM_CIRCUIT_VERIFICATION_TOOL } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";

const enabled = process.env.OPENQUANTUM_TEST_QCEC_REFERENCE === "1";
const prefix = qubits => `OPENQASM 2.0; include "qelib1.inc"; qreg q[${qubits}]; `;

test("real pinned MQT classifications agree with independent Qiskit complete unitaries and central reports", { skip: !enabled, timeout: 180000 }, async t => {
  const client = new Client({ name: "qcec-scientific-live", version: "1.0.0" }, { capabilities: {} });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [path.resolve(".agents/skills/quantum-circuit-verification/mcp/server.mjs")], cwd: process.cwd(),
    env: process.env.OPENQUANTUM_PYTHON_ENV_ROOT ? { OPENQUANTUM_PYTHON_ENV_ROOT: process.env.OPENQUANTUM_PYTHON_ENV_ROOT } : undefined });
  await client.connect(transport);
  t.after(() => client.close());
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "oq-qcec-science-live-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const cases = [
    { id: "redundant-x", a: prefix(2) + "h q[0]; cx q[0],q[1]; x q[1]; x q[1];", b: prefix(2) + "h q[0]; cx q[0],q[1];", verdict: "equivalent", status: "passed" },
    { id: "deleted-cx", a: prefix(2) + "h q[0]; cx q[0],q[1];", b: prefix(2) + "h q[0];", verdict: "not_equivalent", status: "passed" },
    { id: "global-phase", a: prefix(1) + "h q[0];", b: prefix(1) + "h q[0]; x q[0]; y q[0]; z q[0];", verdict: "equivalent_up_to_global_phase", status: "passed" },
    { id: "wire-order", a: prefix(2) + "x q[0];", b: prefix(2) + "x q[1];", verdict: "not_equivalent", status: "passed" },
    { id: "custom-gate", a: prefix(2) + "gate pair a,b { h a; cx a,b; } pair q[0],q[1];", b: prefix(2) + "h q[0]; cx q[0],q[1];", verdict: "equivalent", status: "passed" },
    { id: "register-order", a: 'OPENQASM 2.0; include "qelib1.inc"; qreg a[1]; qreg b[1]; h a[0]; cx a[0],b[0];', b: prefix(2) + "h q[0]; cx q[0],q[1];", verdict: "equivalent", status: "passed" },
    { id: "large-distinct-inputs", a: prefix(9) + "h q[0]; x q[8]; x q[8];", b: prefix(9) + "h q[0];", verdict: "equivalent", status: "conditional" },
    { id: "full-scope-identity", a: prefix(16) + "h q[15];", b: prefix(16) + "h q[15];", verdict: "equivalent", status: "passed" },
    { id: "invalid-identity-parameter", a: prefix(1) + "rx(1/0) q[0];", b: prefix(1) + "rx(1/0) q[0];", verdict: "equivalent", status: "conditional" },
  ];
  const evidence = [];
  for (const [i, example] of cases.entries()) {
    const request = { circuitAOpenQasm2: example.a, circuitBOpenQasm2: example.b };
    const canonicalValue = await client.callTool({ name: "verify_circuit_equivalence", arguments: request });
    assert.notEqual(canonicalValue.isError, true, example.id);
    assert.equal(canonicalValue.structuredContent.result.equivalence, example.verdict, example.id);
    const materialized = await scientificResultAdapter(QUANTUM_CIRCUIT_VERIFICATION_TOOL).materialize({
      fileSystem: new LocalFileSystem(new Context(), { cwd: workspace, diffBasisMaxBytes: 1048576 }),
      sandboxPolicy: { mode: "workspace-write", workspaceRoot: workspace },
      workspaceRoot: workspace, sessionId: "local-live-qcec-validation", callId: example.id,
      eventRange: { from: i * 2 + 1, to: i * 2 + 2 }, arguments: request, canonicalValue, signal: new AbortController().signal,
    });
    assert.equal(materialized.acceptanceStatus, example.status, JSON.stringify({ id: example.id, checks: materialized.validation.observations }));
    const replay = materialized.validation.observations.find(item => item.id === "classification.replayed");
    evidence.push({ case: example.id, verdict: example.verdict, acceptance: materialized.acceptanceStatus, reference: replay.observed });
  }
  // This uses real domain libraries but synthetic execution refs. The separate
  // Harness integration is responsible for genuine event provenance evidence.
  if (process.env.OPENQUANTUM_QCEC_REFERENCE_EVIDENCE) fs.writeFileSync(path.resolve(process.env.OPENQUANTUM_QCEC_REFERENCE_EVIDENCE),
    JSON.stringify({ at: new Date().toISOString(), realMqt: true, realQiskit: true, harnessExecutionProvenance: false, cases: evidence }, null, 2) + "\n", { mode: 0o600 });
});

test("identity proofs require independently parsed finite unitary semantics", { skip: !enabled, timeout: 60000 }, async () => {
  for (const source of [prefix(1) + "// /*\ncreg c[1]; measure q[0] -> c[0];\n// */",
    prefix(1) + "// /*\nqreg extra[17];\n// */"]) {
    const request = { circuitAOpenQasm2: source, circuitBOpenQasm2: source };
    assert.throws(() => normalizeAuditRequest(request), /unitary|qubits/);
    assert.throws(() => independentReference(request), /unitary|qubits/);
  }
  for (const gates of ["rx(1/0) q[0];", "rx(1e999) q[0];", "gate invalid(theta) a { rx(theta/0) a; } invalid(1) q[0];"]) {
    const source = prefix(1) + gates;
    const reference = await independentReference({ circuitAOpenQasm2: source, circuitBOpenQasm2: source })
      .catch(() => ({ mode: "unavailable" }));
    assert.equal(reference.mode, "unavailable", gates);
  }
  const source = prefix(16) + "gate valid(theta) a { rx(theta/2) a; } valid(pi) q[15];";
  const reference = await independentReference({ circuitAOpenQasm2: source, circuitBOpenQasm2: source });
  assert.equal(reference.mode, "input-identity");
  assert.equal(reference.engine.name, "qiskit");
  assert.equal(reference.unitaryDomainChecked, true);
  assert.equal(reference.qubits, 16);
});

test("independent parser includes no user files, preserves phase, and respects the dense budget", { skip: !enabled, timeout: 60000 }, async () => {
  const phase = await independentReference({ circuitAOpenQasm2: prefix(1) + "h q[0];", circuitBOpenQasm2: prefix(1) + "h q[0]; x q[0]; y q[0]; z q[0];" });
  assert.ok(Math.abs(phase.strictResidual - 1) < 1e-12);
  assert.ok(Math.abs(phase.phase.real) < 1e-12 && Math.abs(phase.phase.imag - 1) < 1e-12);
  assert.ok(phase.globalPhaseResidual < 1e-9);
  const large = await independentReference({ circuitAOpenQasm2: prefix(9) + "h q[0];", circuitBOpenQasm2: prefix(9) + "h q[0]; x q[0]; x q[0];" });
  assert.equal(large.mode, "unavailable");
  assert.equal(large.reason, "dense_reference_budget_exceeded");
  await assert.rejects(async () => independentReference({ circuitAOpenQasm2: 'OPENQASM 2.0; include "/private/input.inc"; qreg q[1];', circuitBOpenQasm2: prefix(1) }), error => {
    assert.match(error.message, /may include only qelib1.inc/);
    assert.equal(error.message.includes("/private/input.inc"), false);
    return true;
  });
});
