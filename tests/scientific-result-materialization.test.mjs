import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";

import { solveGroundState } from "../.agents/skills/quantum-ground-state/scripts/solve.mjs";
import {
  trustedAcceptanceProfile,
} from "../.agents/skills/quantum-ground-state/mcp/contracts.mjs";
import { validateGroundStateComputation } from "../.agents/skills/quantum-ground-state/validators/validate-result.mjs";
import { materializeGroundStateResult } from "../runtime/openquantum/agent-presets/openquantum/scientific-result-materializer.mjs";
import {
  apply,
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

test("Harness post-execute materializes facts and projects central Acceptance", async (t) => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qgs-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const fileSystem = localFileSystem(workspaceRoot);
  const request = fixtureRequest();
  const canonicalValue = atomicValue(request);
  const warnings = [];
  let listener;
  const ctx = {
    fs: fileSystem,
    logger: { warn: (message) => warnings.push(message) },
    on(name, callback) {
      assert.equal(name, "tools/post-execute");
      listener = callback;
    },
  };
  apply(ctx);

  const callEvent = {
    type: "tool/call",
    seq: 7,
    data: {
      callId: "qgs-materialized-call",
      name: SOLVE_AND_VALIDATE_TOOL,
    },
  };
  const session = {
    id: "session-qgs-materialized",
    header: { cwd: workspaceRoot },
    events: [callEvent],
    seq: 8,
  };
  const decision = await listener(
    {
      name: SOLVE_AND_VALIDATE_TOOL,
      callId: callEvent.data.callId,
      arguments: { request },
      agent: { session },
      parent: undefined,
      signal: new AbortController().signal,
    },
    {
      isError: false,
      value: canonicalValue,
      content: canonicalValue.content,
    },
    async () => ({ kind: "accept" }),
  );

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    SOLVE_AND_VALIDATE_TOOL,
    decision.content[0].text,
  );
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
  const canonicalValue = atomicValue(request);
  const warnings = [];
  let listener;
  const ctx = {
    fs: localFileSystem(workspaceRoot),
    logger: { warn: (message) => warnings.push(message) },
    on(_name, callback) {
      listener = callback;
    },
  };
  apply(ctx);
  const session = {
    id: "session-qgs-escape",
    header: { cwd: workspaceRoot },
    events: [
      {
        type: "tool/call",
        seq: 1,
        data: { callId: "qgs-escape-call", name: SOLVE_AND_VALIDATE_TOOL },
      },
    ],
    seq: 2,
  };
  const decision = await listener(
    {
      name: SOLVE_AND_VALIDATE_TOOL,
      callId: "qgs-escape-call",
      arguments: { request },
      agent: { session },
      parent: undefined,
      signal: new AbortController().signal,
    },
    { isError: false, value: canonicalValue, content: canonicalValue.content },
    async () => ({ kind: "accept" }),
  );
  const presentation = parseScientificToolResult(
    SOLVE_AND_VALIDATE_TOOL,
    decision.content[0].text,
  );
  assert.equal(presentation.scientificStatus, "observations_available");
  assert.equal(presentation.acceptanceStatus, undefined);
  assert.match(warnings[0], /escapes the Harness workspace/);
  assert.deepEqual(fs.readdirSync(outsideRoot), []);
});
