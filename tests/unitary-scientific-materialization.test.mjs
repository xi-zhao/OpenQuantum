import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { before, after } from "node:test";
import { Context } from "@deepseek-ai/cordis";
import { SandboxedFileSystem } from "@deepseek-ai/dsh-fs-sandbox";
import { SandboxPolicyService } from "@deepseek-ai/dsh-sandbox-policy";
import LocalSandbox from "@deepseek-ai/dsh-sandbox-local";
import { loadCapability, loadResultPackage, loadAcceptanceReport, validateResultCommitValue } from "../.agents/skill-contracts/index.mjs";
import { scientificResultAdapter } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";
import { parseScientificToolResult } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-protocol.mjs";
import { scientificProjectionFixture } from "./helpers/scientific-projection.mjs";
import { unitaryFixtures, unitaryCanonical, prepareUnitaryFixtures } from "./helpers/unitary-scientific-fixtures.mjs";

let preparedRoot;
const sandboxContext = new Context();
let sandboxFiber;
const previous = process.env.OPENQUANTUM_PYTHON_ENV_ROOT;

before(async () => {
  sandboxFiber = await sandboxContext.plugin(LocalSandbox, {});
  preparedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oq-unitary-python-"));
  Object.assign(process.env, await prepareUnitaryFixtures(process.cwd(), preparedRoot));
});

after(async () => {
  await sandboxFiber.dispose();
  if (previous === undefined) delete process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
  else process.env.OPENQUANTUM_PYTHON_ENV_ROOT = previous;
  fs.rmSync(preparedRoot, { recursive: true, force: true });
});

function fixture(t) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oq-unitary-result-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const f = scientificProjectionFixture({ workspaceRoot });
  f.ctx.sandbox = sandboxContext.sandbox;
  return { ...f, workspaceRoot };
}

function protectedReference(t, spec) {
  fs.mkdirSync("temp", { recursive: true });
  const directory = fs.mkdtempSync(path.resolve("temp/unitary-reference-"));
  const canary = path.join(directory, "canary");
  fs.writeFileSync(canary, "unchanged");
  const executable = path.join(
    process.env.OPENQUANTUM_PYTHON_ENV_ROOT,
    spec.id,
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  const original = fs.readFileSync(executable, "utf8");
  fs.writeFileSync(executable, original.replace(
    "\nconst { isDeepStrictEqual }",
    `\ntry { require('node:fs').writeFileSync(${JSON.stringify(canary)}, 'escaped'); } catch {}\nconst { isDeepStrictEqual }`,
  ));
  t.after(() => {
    fs.writeFileSync(executable, original);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return canary;
}

function forgeFalseClaim(spec, value) {
  const result = value.structuredContent.result;
  if (spec.id === "pyzx-optimization") result.unitaryMaxError = 0.9;
  else if (spec.id === "symmer-tapering") result.reducedSpectrum = [0, 0];
  else if (spec.id === "paulie-algebra") result.dimension = 14;
  else if (spec.id === "graphix-mbqc") result.branches[0].fidelity = 0.4;
}

for (const spec of unitaryFixtures) {
  if (spec.reference) test(`${spec.bare}: Host reference process inherits full confinement and cannot write the installation`, async t => {
    const canary = protectedReference(t, spec), f = fixture(t), policies = [];
    f.ctx.sandbox = {
      async confine(argv, policy) {
        const confined = await sandboxContext.sandbox.confine(argv, policy);
        assert.equal(confined.enforcement, "full");
        policies.push(policy);
        return confined;
      },
    };
    const { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: unitaryCanonical(spec) });
    assert.equal(presentation.acceptanceStatus, "passed");
    assert.equal(policies.length, 1, "The Host must confine its independent reference child");
    assert.deepEqual(policies[0], { mode: "workspace-write", workspaceRoot: fs.realpathSync.native(os.tmpdir()) });
    assert.equal(fs.readFileSync(canary, "utf8"), "unchanged");
  });

  if (spec.reference) test(`${spec.bare}: unavailable or partial confinement never executes the Host reference`, async t => {
    const canary = protectedReference(t, spec);
    for (const sandbox of [undefined, { confine: argv => ({ argv, enforcement: "partial" }) }]) {
      const f = fixture(t);
      f.ctx.sandbox = sandbox;
      const { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: unitaryCanonical(spec) });
      assert.equal(presentation.acceptanceStatus, "conditional");
      assert.equal(fs.readFileSync(canary, "utf8"), "unchanged");
    }
  });

  if (spec.reference) test(`${spec.bare}: cancellation during confinement prevents reference execution and Acceptance publication`, async t => {
    const canary = protectedReference(t, spec), f = fixture(t), abort = new AbortController();
    f.ctx.sandbox = {
      async confine(...args) {
        const confined = await sandboxContext.sandbox.confine(...args);
        abort.abort();
        return confined;
      },
    };
    const { presentation } = await f.execute({
      tool: spec.tool,
      request: spec.cases[0].request,
      value: unitaryCanonical(spec),
      signal: abort.signal,
    });
    assert.equal(presentation.acceptanceStatus, undefined);
    assert.equal(fs.readFileSync(canary, "utf8"), "unchanged");
  });

  if (spec.reference) test(`${spec.bare}: unavailable independent reference remains conditional`, async t => {
    const f = fixture(t), saved = process.env.OPENQUANTUM_PYTHON_ENV_ROOT;
    process.env.OPENQUANTUM_PYTHON_ENV_ROOT = path.join(preparedRoot, "missing");
    try {
      const { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: unitaryCanonical(spec) });
      assert.deepEqual(f.warnings, []);
      assert.equal(presentation.acceptanceStatus, "conditional");
    } finally {
      process.env.OPENQUANTUM_PYTHON_ENV_ROOT = saved;
    }
  });

  test(`${spec.bare}: canonical and bare names materialize re-read facts and deterministic readable central Acceptance`, async t => {
    assert.equal(scientificResultAdapter(spec.tool), scientificResultAdapter(spec.bare));
    const f = fixture(t);
    const { normalizeAuditRequest } = await import(`../.agents/skills/${spec.id}/validators/validate-materialized.mjs`);
    const { renderReport } = await import(`../.agents/skills/${spec.id}/core/render-report.mjs`);
    for (const [i, input] of spec.cases.entries()) {
      const { presentation, decision } = await f.execute({
        tool: i % 2 ? spec.bare : spec.tool,
        request: input.request,
        value: unitaryCanonical(spec, input),
        callId: `case-${i}`,
      });
      assert.deepEqual(f.warnings, []);
      assert.equal(parseScientificToolResult(spec.tool, decision.content[0].text).scientificStatus, "observations_available");
      assert.equal(presentation?.acceptanceStatus, "passed", `${spec.id} case ${spec.names[i]}`);
      const capability = await loadCapability(`.agents/skills/${spec.id}`), commit = presentation.resultCommit;
      const pkg = loadResultPackage(path.join(f.workspaceRoot, commit.resultPackage.path), capability);
      const report = loadAcceptanceReport(path.join(f.workspaceRoot, commit.acceptanceReport.path), capability, pkg);
      assert.deepEqual(validateResultCommitValue(commit, { capability, resultPackage: pkg, acceptanceReport: report, artifactRoot: f.workspaceRoot }), []);
      assert.equal(report.value.checks.find(c => c.id === "provenance.complete").status, "pass");
      const readablePath = presentation.details.find(item => item.label === "可读验收报告").value;
      const readable = fs.readFileSync(path.join(f.workspaceRoot, readablePath), "utf8");
      assert.match(readable, /科学验收状态：`passed`/);
      assert.equal(readable, renderReport({
        request: normalizeAuditRequest(input.request),
        artifacts: { result: input.result },
        acceptanceReport: report.value,
        resultPackage: pkg.value,
        acceptanceReportPath: commit.acceptanceReport.path,
        resultPackagePath: commit.resultPackage.path,
      }));
      assert.ok(pkg.value.provenance.tools.some(item => item.id.includes("render-report")));
    }
  });

  test(`${spec.bare}: skipped, large-scale or generation-only boundaries remain conditional`, async t => {
    const f = fixture(t);
    for (const [i, input] of spec.conditionalCases.entries()) {
      const { presentation } = await f.execute({
        tool: spec.tool,
        request: input.request,
        value: unitaryCanonical(spec, input),
        callId: `cond-${i}`,
      });
      assert.deepEqual(f.warnings, []);
      assert.equal(presentation?.acceptanceStatus, "conditional", `${spec.id}:${input.name}`);
      const capability = await loadCapability(`.agents/skills/${spec.id}`), commit = presentation.resultCommit;
      const pkg = loadResultPackage(path.join(f.workspaceRoot, commit.resultPackage.path), capability);
      const report = loadAcceptanceReport(path.join(f.workspaceRoot, commit.acceptanceReport.path), capability, pkg);
      assert.equal(report.value.checks.find(c => c.id === "provenance.complete").status, "pass");
      assert.equal(report.value.checks.find(c => c.id === "observations.integrity").status, "pass");
    }
  });

  test(`${spec.bare}: false numerical claims fail despite forged computational observations`, async t => {
    const f = fixture(t), value = unitaryCanonical(spec);
    forgeFalseClaim(spec, value);
    value.structuredContent.validation.observations = [{ id: "provenance.complete", status: "pass" }];
    const { presentation, decision } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value });
    assert.equal(decision.kind, "accept");
    assert.equal(presentation.acceptanceStatus, "failed");
  });

  for (const suffix of ["request.json", `${spec.artifact}.json`, "readable-report.md"]) {
    test(`${spec.bare}: tampered ${suffix} bytes cannot publish Acceptance`, async t => {
      const f = fixture(t), original = f.ctx.fs, wrapped = Object.create(original);
      wrapped.writeText = async (...args) => {
        const output = await original.writeText(...args);
        const file = original.processPath(args[0]);
        if (file.endsWith(`/${suffix}`)) fs.appendFileSync(file, " ");
        return output;
      };
      f.ctx.fs = wrapped;
      const { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: unitaryCanonical(spec) });
      assert.equal(presentation.scientificStatus, "observations_available");
      assert.equal(presentation.acceptanceStatus, undefined);
      assert.equal(f.warnings.length, 1);
    });
  }

  test(`${spec.bare}: effective read-only policy, cancellation, input mismatch and escaped roots fail closed`, async t => {
    for (const scenario of ["read-only", "cancelled", "mismatch", "escape"]) {
      const f = fixture(t), context = new Context();
      f.ctx.sandboxPolicy = new SandboxPolicyService(context, { mode: "workspace-write", workspaceRoot: f.workspaceRoot });
      f.ctx.fs = new SandboxedFileSystem(context, { cwd: f.workspaceRoot, diffBasisMaxBytes: 1048576 });
      if (scenario === "read-only") f.session.append("sandbox/mode", { mode: "read-only" });
      if (scenario === "escape") {
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), "oq-unitary-outside-"));
        t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
        fs.symlinkSync(outside, path.join(f.workspaceRoot, "results"));
      }
      const request = structuredClone(spec.cases[0].request);
      const { presentation } = await f.execute({
        tool: spec.tool,
        request,
        value: unitaryCanonical(spec),
        ...(scenario === "cancelled" ? { signal: AbortSignal.abort() } : {}),
        ...(scenario === "mismatch" ? { recorded: {} } : {}),
      });
      assert.equal(presentation.acceptanceStatus, undefined, scenario);
      assert.equal(f.session.events.filter(e => e.surfaceOp?.op === "replace").length, 0);
    }
  });

  test(`${spec.bare}: input and artifact hashes remain bound on later package replay`, async t => {
    const f = fixture(t), { presentation } = await f.execute({ tool: spec.tool, request: spec.cases[0].request, value: unitaryCanonical(spec) });
    const commit = presentation.resultCommit, capability = await loadCapability(`.agents/skills/${spec.id}`);
    const filename = path.join(f.workspaceRoot, commit.artifacts[0].path);
    const original = fs.readFileSync(filename);
    assert.equal(createHash("sha256").update(original).digest("hex"), commit.artifacts[0].sha256);
    fs.appendFileSync(filename, " ");
    assert.throws(() => loadResultPackage(path.join(f.workspaceRoot, commit.resultPackage.path), capability), /sha256|bytes/);
  });
}

test("unitary materialized Validators reject modified Profiles", async () => {
  for (const spec of unitaryFixtures) {
    const capability = await loadCapability(`.agents/skills/${spec.id}`);
    const profile = structuredClone([...capability.acceptanceProfileDefinitions.values()][0]);
    profile.checks[0].required = false;
    const { validateMaterializedResult } = await import(`../.agents/skills/${spec.id}/validators/validate-materialized.mjs`);
    await assert.rejects(validateMaterializedResult({ ...spec.cases[0], profile }), /Profile differ/);
  }
});
