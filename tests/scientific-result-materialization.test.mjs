import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scientificProjectionFixture } from "./helpers/scientific-projection.mjs";

import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";

import { solveGroundState } from "../.agents/skills/quantum-ground-state/scripts/solve.mjs";
import {
  trustedAcceptanceProfile,
} from "../.agents/skills/quantum-ground-state/core/contracts.mjs";
import { validateGroundStateComputation } from "../.agents/skills/quantum-ground-state/validators/validate-result.mjs";
import { scientificResultAdapter } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-adapters.mjs";
import {
  parseScientificToolResult,
  SOLVE_AND_VALIDATE_TOOL,
} from "../runtime/openquantum/agent-presets/openquantum/scientific-result-projection.mjs";

const fixturePath = path.resolve(
  ".agents/skills/quantum-ground-state/evals/fixtures/requests/protocol-fixture.json",
);

function fixtureRequest() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function localFileSystem(workspaceRoot) {
  const context = new Context();
  return new LocalFileSystem(context, {
    cwd: workspaceRoot,
    diffBasisMaxBytes: 1024 * 1024,
  });
}

function atomicValue(request) {
  const facts = solveGroundState(request);
  return {
    content: [{ type: "text", text: "Atomic quantum workflow complete." }],
    structuredContent: {
      facts,
      validation: validateGroundStateComputation({
        profile: trustedAcceptanceProfile(),
        request,
        facts,
      }),
    },
  };
}

function assertRegularJson(workspaceRoot, relativePath) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  assert.equal(fs.statSync(absolutePath).isFile(), true);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function materializeGroundStateResult({ request, facts, ...context }) {
  return scientificResultAdapter(SOLVE_AND_VALIDATE_TOOL).materialize({
    ...context,
    sandboxPolicy: { mode: "workspace-write", workspaceRoot: context.workspaceRoot },
    arguments: { request },
    canonicalValue: { structuredContent: { facts } },
  });
}

test("Harness committed result materializes facts and projects central Acceptance", async (t) => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const request = fixtureRequest();
  const fixture = scientificProjectionFixture({ workspaceRoot, sessionId: "session-qgs-materialized" });
  const { presentation, decision } = await fixture.execute({ tool: SOLVE_AND_VALIDATE_TOOL,
    request: { request }, value: atomicValue(request), callId: "qgs-materialized-call", seq: 7 });
  const { warnings, session } = fixture;
  assert.equal(parseScientificToolResult(SOLVE_AND_VALIDATE_TOOL, decision.content[0].text).scientificStatus, "observations_available");
  assert.deepEqual(warnings, []);
  assert.equal(presentation.scientificStatus, "acceptance_available");
  assert.equal(presentation.acceptanceStatus, "passed");
  assert.equal(presentation.resultCommit.acceptanceReport.status, "passed");
  assert.equal(presentation.resultCommit.artifacts.length, 6);
  const resultPackage = assertRegularJson(
    workspaceRoot,
    presentation.resultCommit.resultPackage.path,
  );
  const acceptance = assertRegularJson(
    workspaceRoot,
    presentation.resultCommit.acceptanceReport.path,
  );
  assert.deepEqual(resultPackage.executionRef, {
    sessionId: session.id,
    eventRange: { from: 7, to: 8 },
  });
  assert.equal(resultPackage.artifacts.length, 6);
  assert.equal(acceptance.status, "passed");
  assert.equal(acceptance.checks.length, 16);
  assert.equal(
    acceptance.checks.find((check) => check.id === "provenance.complete").status,
    "pass",
  );
});

test("materialized low-budget computation derives failed Acceptance", async (t) => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-low-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const request = fixtureRequest();
  request.requestId = "qgs-materialized-low-budget";
  request.method.optimizer.maxEvaluations = 32;
  const facts = solveGroundState(request);
  const materialized = await materializeGroundStateResult({
    fileSystem: localFileSystem(workspaceRoot),
    workspaceRoot,
    sessionId: "session-qgs-low-budget",
    callId: "qgs-low-budget-call",
    eventRange: { from: 2, to: 3 },
    request,
    facts,
    signal: new AbortController().signal,
    now: () => "2026-08-14T00:00:00.000Z",
  });

  assert.equal(materialized.acceptanceStatus, "failed");
  assert.equal(
    materialized.validation.observations.find(
      (observation) => observation.id === "vqe.converged",
    ).status,
    "fail",
  );
  assert.equal(materialized.resultCommit.acceptanceReport.status, "failed");
});

test("workspace escape fails closed to computational observations", async (t) => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-root-"));
  const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-outside-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  t.after(() => fs.rmSync(outsideRoot, { recursive: true, force: true }));
  fs.symlinkSync(outsideRoot, path.join(workspaceRoot, "results"));
  const request = fixtureRequest();
  const fixture = scientificProjectionFixture({ workspaceRoot, sessionId: "session-qgs-escape" });
  const { presentation } = await fixture.execute({ tool: SOLVE_AND_VALIDATE_TOOL, request: { request },
    value: atomicValue(request), callId: "qgs-escape-call", seq: 1 });
  const { warnings } = fixture;
  assert.equal(presentation.scientificStatus, "observations_available");
  assert.equal(presentation.acceptanceStatus, undefined);
  assert.equal(warnings[0], "Scientific result materialization failed; original observations retained");
  assert.deepEqual(fs.readdirSync(outsideRoot), []);
});
