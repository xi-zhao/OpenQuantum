import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { before, after } from "node:test";
import { preparePythonFixture } from "./helpers/prepared-python.mjs";
import { scientificProjectionFixture } from "./helpers/scientific-projection.mjs";
import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";
import { SandboxedFileSystem } from "@deepseek-ai/dsh-fs-sandbox";
import { SandboxPolicyService } from "@deepseek-ai/dsh-sandbox-policy";
import { loadCapability, loadResultPackage, loadAcceptanceReport, validateResultCommitValue } from "../.agents/skill-contracts/index.mjs";
import { normalizeVerificationRequest, normalizeAuditRequest } from "../.agents/skills/quantum-circuit-verification/core/request-contract.mjs";
import { independentReference } from "../.agents/skills/quantum-circuit-verification/validators/independent-reference.mjs";
import { scientificResultAdapter } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";
import { parseScientificToolResult, QUANTUM_CIRCUIT_VERIFICATION_TOOL } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-projection.mjs";

let preparedRoot;
const previousPythonRoot = process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
before(async () => {
  preparedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oq-qcec-reference-fixture-"));
  const executable = path.join(preparedRoot, "fixture-python");
  fs.writeFileSync(executable, `#!${process.execPath}
const { createHash } = require("node:crypto");
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const request = JSON.parse(input);
  if (request.circuitAOpenQasm2 !== request.circuitBOpenQasm2) throw new Error("Fixture only handles identical input");
  const digest = createHash("sha256").update(request.circuitAOpenQasm2).digest("hex");
  const qubits = [...request.circuitAOpenQasm2.matchAll(/qreg\\s+[a-zA-Z][a-zA-Z0-9_]*\\s*\\[\\s*(\\d+)\\s*\\]/g)].reduce((sum, match) => sum + Number(match[1]), 0);
  process.stdout.write(JSON.stringify({ schemaVersion: "1.0", engine: { name: "qiskit", version: "2.5.2" },
    inputDigests: { circuitA: digest, circuitB: digest }, maxDenseQubits: 8, mode: "input-identity",
    qubits, unitaryDomainChecked: true, strictResidual: 0, globalPhaseResidual: 0, phase: { real: 1, imag: 0 } }));
});
`);
  const prepared = await preparePythonFixture({ root: process.cwd(), sandbox: preparedRoot, id: "quantum-circuit-verification", executable });
  process.env.OPENQUANTUM_PYTHON_ENV_ROOT = prepared.OPENQUANTUM_PYTHON_ENV_ROOT;
});
after(() => {
  if (previousPythonRoot === undefined) delete process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
  else process.env.OPENQUANTUM_PYTHON_ENV_ROOT = previousPythonRoot;
  fs.rmSync(preparedRoot, { recursive: true, force: true });
});

function canonical(request, verdict = "equivalent", version = "3.10.0") {
  const inputs = normalizeVerificationRequest(request).summaries;
  return { content: [{ type: "text", text: "QCEC classification complete." }], structuredContent: {
    schemaVersion: "1.0", scientificValidation: "observations_available", packageVersion: version, inputs,
    result: { equivalence: verdict, timeoutSeconds: 0,
      inputDigests: { circuitA: inputs.circuitA.sha256, circuitB: inputs.circuitB.sha256 },
      statistics: { preprocessingSeconds: 0, checkSeconds: 0.001, performedSimulations: 0, performedInstantiations: 0, checkers: [] } },
  } };
}

const qasm = qubits => `OPENQASM 2.0; include "qelib1.inc"; qreg q[${qubits}]; h q[0];`;
const pair = qubits => ({ circuitAOpenQasm2: qasm(qubits), circuitBOpenQasm2: qasm(qubits) });

function harnessFixture(t) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "oq-qcec-audit-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const fixture = scientificProjectionFixture({ workspaceRoot: workspace, sessionId: "fixture-qcec-session" });
  return {
    ...fixture, workspace,
    async execute({ request = pair(2), verdict, version, callId = "fixture-qcec-call", seq = 7, ...options } = {}) {
      return fixture.execute({ ...options, request, callId, seq,
        tool: QUANTUM_CIRCUIT_VERIFICATION_TOOL, value: canonical(request, verdict, version) });
    },
  };
}

test("QCEC materializes exact input and analysis, then derives central Acceptance and a readable report", async t => {
  const fixture = harnessFixture(t), { presentation } = await fixture.execute();
  assert.deepEqual(fixture.warnings, []);
  assert.equal(presentation.acceptanceStatus, "passed");
  assert.equal(presentation.resultCommit.artifacts.length, 1);
  const capability = await loadCapability(".agents/skills/quantum-circuit-verification");
  const commit = presentation.resultCommit;
  const result = loadResultPackage(path.join(fixture.workspace, commit.resultPackage.path), capability);
  const acceptance = loadAcceptanceReport(path.join(fixture.workspace, commit.acceptanceReport.path), capability, result);
  assert.deepEqual(validateResultCommitValue(commit, { capability, resultPackage: result, acceptanceReport: acceptance, artifactRoot: fixture.workspace }), []);
  assert.deepEqual(result.value.executionRef, { sessionId: fixture.session.id, eventRange: { from: 7, to: 8 } });
  assert.equal(acceptance.value.checks.length, 6);
  assert.equal(acceptance.value.checks.find(check => check.id === "classification.replayed").observed.mode, "input-identity");
  const reportPath = presentation.details.find(detail => detail.label === "可读验收报告").value;
  const report = fs.readFileSync(path.join(fixture.workspace, reportPath), "utf8");
  assert.match(report, /判定复核状态：`passed`/);
  assert.ok(report.includes(commit.acceptanceReport.path));
});

test("an independently contradicted negative classification fails science without becoming a runtime error", async t => {
  const fixture = harnessFixture(t), { presentation, decision } = await fixture.execute({ verdict: "not_equivalent" });
  assert.equal(decision.kind, "accept");
  assert.equal(presentation.acceptanceStatus, "failed");
  assert.equal(presentation.details[0].value, "not_equivalent");
  assert.deepEqual(fixture.warnings, []);
});

test("probabilistic, generic phase and no-information classifications stay conditional", async t => {
  const fixture = harnessFixture(t);
  for (const [i, verdict] of ["probably_equivalent", "probably_not_equivalent", "equivalent_up_to_phase", "no_information"].entries()) {
    const { presentation } = await fixture.execute({ verdict, callId: `uncertain-${i}`, seq: 10 + i * 3 });
    assert.equal(presentation.acceptanceStatus, "conditional", verdict);
    assert.equal(presentation.details[0].value, verdict);
  }
});

test("the 16-qubit audit scope accepts an exact source-identity proof", async t => {
  const fixture = harnessFixture(t), { presentation } = await fixture.execute({ request: pair(16) });
  assert.equal(presentation.acceptanceStatus, "passed");
  const report = JSON.parse(fs.readFileSync(path.join(fixture.workspace, presentation.resultCommit.acceptanceReport.path)));
  assert.equal(report.checks.find(check => check.id === "request.scope").observed.qubits, 16);
});

test("spaced registers are counted before identity proofs or scientific materialization", async t => {
  const fixture = harnessFixture(t);
  const source = 'OPENQASM 2.0; include "qelib1.inc"; qreg q [ 1 ]; qreg extra\n[ 15 ]; h extra[14];';
  const request = { circuitAOpenQasm2: source, circuitBOpenQasm2: source };
  const { presentation } = await fixture.execute({ request });
  assert.equal(presentation.acceptanceStatus, "passed");
  const report = JSON.parse(fs.readFileSync(path.join(fixture.workspace, presentation.resultCommit.acceptanceReport.path)));
  assert.equal(report.checks.find(check => check.id === "request.scope").observed.qubits, 16);
  for (const declaration of ["qreg extra [17];", "qreg extra [ 17 ];", "qreg/*comment*/extra[17];",
    "qreg extra[0];", "qreg extra[1+1];", "qreg q[1];"]) {
    const invalid = qasm(1) + declaration;
    const outOfScope = { circuitAOpenQasm2: invalid, circuitBOpenQasm2: invalid };
    assert.throws(() => normalizeAuditRequest(outOfScope), /qubits|qreg/);
    assert.throws(() => independentReference(outOfScope), /qubits|qreg/);
    await assert.rejects(scientificResultAdapter(QUANTUM_CIRCUIT_VERIFICATION_TOOL).materialize({
      fileSystem: new LocalFileSystem(new Context(), { cwd: fixture.workspace, diffBasisMaxBytes: 1048576 }),
      sandboxPolicy: { mode: "workspace-write", workspaceRoot: fixture.workspace },
      workspaceRoot: fixture.workspace, sessionId: fixture.session.id, callId: "invalid-scope",
      eventRange: { from: 20, to: 21 }, arguments: outOfScope, canonicalValue: canonical(pair(1)),
      signal: new AbortController().signal,
    }), /qubits|qreg/);
  }
});

test("reused provider call ids in later steps create distinct evidence and preserve the earlier files", async t => {
  const fixture = harnessFixture(t), first = await fixture.execute({ seq: 7 });
  const before = fs.readFileSync(path.join(fixture.workspace, first.presentation.resultCommit.resultPackage.path));
  const second = await fixture.execute({ seq: 17 });
  assert.equal(second.presentation.acceptanceStatus, "passed");
  assert.notEqual(first.presentation.resultCommit.resultPackage.path, second.presentation.resultCommit.resultPackage.path);
  assert.deepEqual(fs.readFileSync(path.join(fixture.workspace, first.presentation.resultCommit.resultPackage.path)), before);
});

test("wrong backend provenance fails central Acceptance", async t => {
  const fixture = harnessFixture(t), { presentation } = await fixture.execute({ version: "0.0.0" });
  assert.equal(presentation.acceptanceStatus, "failed");
});

test("mismatched recorded input, cancellation and symlink escape never publish Acceptance", async t => {
  const fixture = harnessFixture(t);
  let result = await fixture.execute({ recorded: { ...pair(2), circuitBOpenQasm2: "unrelated" } });
  assert.equal(result.presentation.scientificStatus, "observations_available");
  assert.equal(fs.existsSync(path.join(fixture.workspace, "results")), false);
  result = await fixture.execute({ callId: "cancelled", seq: 10, signal: AbortSignal.abort() });
  assert.equal(result.presentation.scientificStatus, "observations_available");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "oq-qcec-outside-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(fixture.workspace, "results"));
  result = await fixture.execute({ callId: "escape", seq: 20 });
  assert.equal(result.presentation.scientificStatus, "observations_available");
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.ok(fixture.warnings.every(value => value === "Scientific result materialization failed; original observations retained"));
});

test("real session sandbox denies scientific writes until the session permits them", async t => {
  const fixture = harnessFixture(t), context = new Context();
  fixture.ctx.sandboxPolicy = new SandboxPolicyService(context, { mode: "workspace-write", workspaceRoot: fixture.workspace });
  fixture.ctx.fs = new SandboxedFileSystem(context, { cwd: fixture.workspace, diffBasisMaxBytes: 1048576 });
  fixture.session.append("sandbox/mode", { mode: "read-only" });
  const denied = await fixture.execute();
  assert.equal(denied.presentation.scientificStatus, "observations_available");
  assert.deepEqual(fs.readdirSync(fixture.workspace), []);
  fixture.session.append("sandbox/mode", { mode: "workspace-write" });
  const accepted = await fixture.execute({ seq: 17 });
  assert.equal(accepted.presentation.acceptanceStatus, "passed");
});

test("computation outside the audit scope retains observations without claiming Acceptance", async t => {
  const fixture = harnessFixture(t);
  for (const request of [pair(18), { circuitAOpenQasm2: qasm(1) + "x q[0];".repeat(600), circuitBOpenQasm2: qasm(1) + "x q[0];".repeat(600) }]) {
    const { presentation } = await fixture.execute({ request });
    assert.equal(presentation.scientificStatus, "observations_available");
    assert.equal(presentation.acceptanceStatus, undefined);
    assert.equal(fs.existsSync(path.join(fixture.workspace, "results")), false);
  }
});

test("Acceptance binds the committed result across interleaved events and replaces only its content", async t => {
  const fixture = harnessFixture(t);
  const { presentation, decision, resultEvent, projectedEvent } = await fixture.execute({
    beforeResult({ session }) {
      assert.equal(fs.existsSync(path.join(fixture.workspace, "results")), false);
      session.append("command/run", { command: "concurrent-before-result" });
    },
    afterResult({ session }) { session.append("command/run", { command: "concurrent-during-audit" }); },
  });
  assert.equal(parseScientificToolResult(QUANTUM_CIRCUIT_VERIFICATION_TOOL, decision.content[0].text).scientificStatus, "observations_available");
  assert.equal(presentation.acceptanceStatus, "passed");
  assert.equal(resultEvent.seq, 9);
  assert.deepEqual(projectedEvent.sourceEventSeqs, [resultEvent.seq]);
  assert.deepEqual(projectedEvent.surfaceOp, { op: "replace", start: resultEvent.seq, end: resultEvent.seq });
  assert.ok(projectedEvent.seq > resultEvent.seq + 1);
  const pkg = JSON.parse(fs.readFileSync(path.join(fixture.workspace, presentation.resultCommit.resultPackage.path)));
  assert.deepEqual(pkg.executionRef.eventRange, { from: 7, to: resultEvent.seq });
  const before = structuredClone(resultEvent.data), after = structuredClone(projectedEvent.data);
  before.message.content[0].content = null; after.message.content[0].content = null;
  assert.deepEqual(after, before);
});

test("turn-stopping drains scientific materialization without requiring another model step", async t => {
  const fixture = harnessFixture(t);
  const { presentation } = await fixture.execute({ drainHook: "agent/turn-stopping" });
  assert.equal(presentation.acceptanceStatus, "passed");
});

test("final content or value changes and mismatched result provenance never materialize", async t => {
  const variants = [
    { finalize: result => ({ ...result, content: [{ type: "text", text: "Finalizer replaced content" }] }) },
    { finalize: result => ({ ...result, value: { forged: true } }) },
    { finalize: result => ({ ...result, isError: true }) },
    { resultOptions: { surfaceOp: "append", sourceEventSeqs: [0] } },
  ];
  for (const options of variants) {
    const fixture = harnessFixture(t);
    const result = await fixture.execute(options);
    assert.equal(result.presentation?.acceptanceStatus, undefined);
    assert.equal(fs.existsSync(path.join(fixture.workspace, "results")), false);
    assert.equal(fixture.session.events.filter(event => event.surfaceOp?.op === "replace").length, 0);
  }
});

test("cancellation or a replaced result surface suppresses delayed materialization", async t => {
  for (const mode of ["cancel", "replace", "read-only"]) {
    const fixture = harnessFixture(t), abort = new AbortController();
    const { presentation, resultEvent, projectedEvent } = await fixture.execute({ signal: abort.signal,
      afterResult({ session, resultEvent: original }) {
        if (mode === "cancel") abort.abort();
        if (mode === "read-only") {
          fixture.ctx.sandboxPolicy.resolve = () => ({ mode: "read-only", workspaceRoot: fixture.workspace });
          session.append("sandbox/mode", { mode: "read-only" });
        }
        if (mode === "replace") session.append("tool/result", {
          ...original.data, message: { ...original.data.message, content: [{ ...original.data.message.content[0], content: [{ type: "text", text: "Another trusted extension replaced this result" }] }] },
        }, { surfaceOp: { op: "replace", start: original.seq, end: original.seq }, sourceEventSeqs: [original.seq] });
      },
    });
    assert.equal(presentation?.acceptanceStatus, undefined);
    assert.equal(fs.existsSync(path.join(fixture.workspace, "results")), false);
    assert.equal(fixture.session.events.filter(event => event.surfaceOp?.op === "replace").length, mode === "replace" ? 1 : 0);
    if (mode !== "replace") assert.equal(projectedEvent, resultEvent);
  }
});

test("cancellation or surface replacement during evidence writes cannot leave a passed report", async t => {
  for (const mode of ["cancel", "replace"]) {
    const fixture = harnessFixture(t), abort = new AbortController();
    const fileSystem = fixture.ctx.fs;
    const wrapped = Object.create(fileSystem);
    wrapped.writeText = async (...args) => {
      const written = await fileSystem.writeText(...args);
      if (fileSystem.processPath(args[0]).endsWith("/result-package.json")) {
        if (mode === "cancel") abort.abort();
        else {
          const original = fixture.session.events.findLast(event => event.type === "tool/result");
          fixture.session.append("tool/result", {
            ...original.data, message: { ...original.data.message, content: [{ ...original.data.message.content[0], content: [{ type: "text", text: "Replacement during audit" }] }] },
          }, { surfaceOp: { op: "replace", start: original.seq, end: original.seq }, sourceEventSeqs: [original.seq] });
        }
      }
      return written;
    };
    fixture.ctx.fs = wrapped;
    const { presentation } = await fixture.execute({ signal: abort.signal });
    assert.equal(presentation?.acceptanceStatus, undefined);
    const files = fs.readdirSync(fixture.workspace, { recursive: true });
    assert.ok(files.some(file => file.endsWith("result-package.json")), "The audit must actually have begun");
    assert.ok(files.every(file => !file.endsWith("acceptance-report.json") && !file.endsWith("readable-report.md")));
    assert.equal(fixture.session.events.filter(event => event.surfaceOp?.op === "replace").length, mode === "replace" ? 1 : 0);
  }
});

test("post-execute policies overriding the canonical value cannot obtain a scientific projection", async t => {
  const fixture = harnessFixture(t), downstream = { kind: "accept", value: { forged: true } };
  const result = await fixture.execute({ downstream });
  assert.equal(result.decision, downstream);
  assert.equal(result.presentation, undefined);
});
