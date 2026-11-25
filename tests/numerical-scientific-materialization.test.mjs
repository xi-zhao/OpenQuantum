import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { before, after } from "node:test";
import { Context } from "@deepseek-ai/cordis";
import { SandboxedFileSystem } from "@deepseek-ai/dsh-fs-sandbox";
import { SandboxPolicyService } from "@deepseek-ai/dsh-sandbox-policy";
import { loadCapability, loadResultPackage, loadAcceptanceReport, validateResultCommitValue } from "../.agents/skill-contracts/index.mjs";
import { scientificResultAdapter } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";
import { parseScientificToolResult } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";
import { scientificProjectionFixture } from "./helpers/scientific-projection.mjs";
import { numericalFixtures, numericalCanonical, prepareNumericalFixtures } from "./helpers/numerical-scientific-fixtures.mjs";

let preparedRoot;
const previous = process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
before(async () => {
  preparedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oq-numerical-python-"));
  Object.assign(process.env, await prepareNumericalFixtures(process.cwd(), preparedRoot));
});
after(() => {
  if (previous === undefined) delete process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
  else process.env.OPENQUANTUM_PYTHON_ENV_ROOT = previous;
  fs.rmSync(preparedRoot, { recursive: true, force: true });
});
function fixture(t) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oq-numerical-result-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const f = scientificProjectionFixture({ workspaceRoot });
  return { ...f, workspaceRoot };
}
for (const spec of numericalFixtures) {
  test(`${spec.id}: canonical and bare names materialize re-read facts and deterministic readable central Acceptance`, async t => {
    assert.equal(scientificResultAdapter(spec.tool), scientificResultAdapter(spec.bare));
    const f = fixture(t);
    for (const [i, input] of spec.cases.entries()) {
      const { presentation, decision } = await f.execute({ tool: i % 2 ? spec.bare : spec.tool, request: input.request,
        value: numericalCanonical(spec, input), callId: `case-${i}` });
      assert.deepEqual(f.warnings, []);
      assert.equal(parseScientificToolResult(spec.tool, decision.content[0].text).scientificStatus, "observations_available");
      assert.equal(presentation?.acceptanceStatus, "passed");
      const capability = await loadCapability(`.agents/skills/${spec.id}`), commit = presentation.resultCommit;
      const pkg = loadResultPackage(path.join(f.workspaceRoot, commit.resultPackage.path), capability);
      const report = loadAcceptanceReport(path.join(f.workspaceRoot, commit.acceptanceReport.path), capability, pkg);
      assert.deepEqual(validateResultCommitValue(commit, { capability, resultPackage: pkg, acceptanceReport: report, artifactRoot: f.workspaceRoot }), []);
      assert.equal(report.value.checks.find(c => c.id === "provenance.complete").status, "pass");
      const readablePath = presentation.details.find(item => item.label === "可读验收报告").value;
      const readable = fs.readFileSync(path.join(f.workspaceRoot, readablePath), "utf8");
      assert.match(readable, /科学验收状态：`passed`/);
      const { renderReport } = await import(`../.agents/skills/${spec.id}/core/render-report.mjs`);
      assert.equal(readable, renderReport({ request: input.request, artifacts: { [spec.key]: input[spec.key] },
        acceptanceReport: report.value, resultPackage: pkg.value, acceptanceReportPath: commit.acceptanceReport.path, resultPackagePath: commit.resultPackage.path }));
      assert.ok(pkg.value.provenance.tools.some(item => item.id.includes("render-report")));
    }
  });
  test(`${spec.id}: false numerical claims fail despite forged computational observations`, async t => {
    const f = fixture(t), value = numericalCanonical(spec);
    if (spec.key === "facts") value.structuredContent.facts.result.logicalErrorRate = 0.999;
    else value.structuredContent.result.stateFidelity = 0.123;
    value.structuredContent.validation.observations = [{ id: "provenance.complete", status: "pass" }];
    const { presentation, decision } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value });
    assert.equal(decision.kind, "accept");
    assert.equal(presentation.acceptanceStatus, "failed");
  });
  test(`${spec.id}: unavailable independent reference remains conditional`, async t => {
    const f = fixture(t), saved = process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
    process.env.OPENQUANTUM_PYTHON_ENV_ROOT = path.join(preparedRoot, "missing");
    try {
      const { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: numericalCanonical(spec) });
      assert.deepEqual(f.warnings, []);
      assert.equal(presentation.acceptanceStatus, "conditional");
    } finally { process.env.OPENQUANTUM_PYTHON_ENV_ROOT = saved; }
  });
  for (const suffix of ["request.json", `${spec.key === "facts" ? "memory" : "hamiltonian"}-result.json`, "readable-report.md"]) {
    test(`${spec.id}: tampered ${suffix} bytes cannot publish Acceptance`, async t => {
      const f = fixture(t), original = f.ctx.fs, wrapped = Object.create(original);
      wrapped.writeText = async (...args) => {
        const output = await original.writeText(...args);
        const file = original.processPath(args[0]);
        if (file.endsWith(`/${suffix}`)) fs.appendFileSync(file, " ");
        return output;
      };
      f.ctx.fs = wrapped;
      const { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: numericalCanonical(spec) });
      assert.equal(presentation.scientificStatus, "observations_available");
      assert.equal(presentation.acceptanceStatus, undefined);
      assert.equal(f.warnings.length, 1);
    });
  }
  test(`${spec.id}: effective read-only policy, cancellation, input mismatch and escaped roots fail closed`, async t => {
    for (const scenario of ["read-only", "cancelled", "mismatch", "escape", "out-of-scope"]) {
      const f = fixture(t), context = new Context();
      f.ctx.sandboxPolicy = new SandboxPolicyService(context, { mode: "workspace-write", workspaceRoot: f.workspaceRoot });
      f.ctx.fs = new SandboxedFileSystem(context, { cwd: f.workspaceRoot, diffBasisMaxBytes: 1048576 });
      if (scenario === "read-only") f.session.append("sandbox/mode", { mode: "read-only" });
      if (scenario === "escape") {
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), "oq-numerical-outside-"));
        t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
        fs.symlinkSync(outside, path.join(f.workspaceRoot, "results"));
      }
      const request = structuredClone(spec.cases[0].request);
      if (scenario === "out-of-scope") Object.assign(request, spec.key === "facts" ? { shots: 100001 } : { numQubits: 7 });
      const { presentation } = await f.execute({ tool: spec.tool, request, value: numericalCanonical(spec),
        ...(scenario === "cancelled" ? { signal: AbortSignal.abort() } : {}),
        ...(scenario === "mismatch" ? { recorded: {} } : {}) });
      assert.equal(presentation.acceptanceStatus, undefined, scenario);
      assert.equal(f.session.events.filter(e => e.surfaceOp?.op === "replace").length, 0);
    }
  });
  test(`${spec.id}: input and artifact hashes remain bound on later package replay`, async t => {
    const f = fixture(t), { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: numericalCanonical(spec) });
    const commit = presentation.resultCommit, capability = await loadCapability(`.agents/skills/${spec.id}`);
    const filename = path.join(f.workspaceRoot, commit.artifacts[0].path);
    const original = fs.readFileSync(filename);
    assert.equal(createHash("sha256").update(original).digest("hex"), commit.artifacts[0].sha256);
    fs.appendFileSync(filename, " ");
    assert.throws(() => loadResultPackage(path.join(f.workspaceRoot, commit.resultPackage.path), capability), /sha256|bytes/);
  });
}
