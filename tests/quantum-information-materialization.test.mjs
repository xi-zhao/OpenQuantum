import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Context } from "@deepseek-ai/cordis";
import { LocalFileSystem } from "@deepseek-ai/dsh-fs-local";

import {
  computeReferenceAnalysis,
} from "../.agents/skills/quantum-information-audit/validators/state-math.mjs";
import { validateStateAnalysis } from "../.agents/skills/quantum-information-audit/validators/validate-state-analysis.mjs";
import {
  apply,
  parseScientificToolResult,
  QUANTUM_INFORMATION_AUDIT_TOOL,
} from "../runtime/openquantum/agent-presets/openquantum/scientific-result-projection.mjs";

function bellRequest() {
  return {
    matrixReal: [
      [0.5, 0, 0, 0.5],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0.5, 0, 0, 0.5],
    ],
    subsystemDimensions: [2, 2],
    transposeSubsystems: [0],
  };
}

function analysisFor(request) {
  const reference = computeReferenceAnalysis(request);
  const { densityByReplayedCriteria, ...state } = reference.state;
  return {
    ...reference,
    packageVersion: "1.3.1",
    state: {
      ...state,
      toqitoDensity: densityByReplayedCriteria,
    },
  };
}

function canonicalValue(request, mutate = (analysis) => analysis) {
  const analysis = mutate(structuredClone(analysisFor(request)));
  return {
    content: [{ type: "text", text: "Original quantum-information summary." }],
    structuredContent: {
      schemaVersion: "1.0",
      packageVersion: analysis.packageVersion,
      analysis,
      validation: validateStateAnalysis({ request, analysis }),
      scientificValidation: "observations_available",
      limitations: [],
    },
  };
}

function localFileSystem(workspaceRoot) {
  const context = new Context();
  return new LocalFileSystem(context, {
    cwd: workspaceRoot,
    diffBasisMaxBytes: 1024 * 1024,
  });
}

async function executePostAdapter({ workspaceRoot, request, value, callId }) {
  const warnings = [];
  let listener;
  const ctx = {
    fs: localFileSystem(workspaceRoot),
    logger: { warn: (message) => warnings.push(message) },
    on(name, callback) {
      assert.equal(name, "tools/post-execute");
      listener = callback;
    },
  };
  apply(ctx);
  const session = {
    id: `session-${callId}`,
    header: { cwd: workspaceRoot },
    events: [
      {
        type: "tool/call",
        seq: 11,
        data: { callId, name: QUANTUM_INFORMATION_AUDIT_TOOL },
      },
    ],
    seq: 12,
  };
  const decision = await listener(
    {
      name: QUANTUM_INFORMATION_AUDIT_TOOL,
      callId,
      arguments: request,
      agent: { session },
      parent: undefined,
      signal: new AbortController().signal,
    },
    { isError: false, value, content: value.content },
    async () => ({ kind: "accept" }),
  );
  return { decision, session, warnings };
}

function readCommitJson(workspaceRoot, reference) {
  const absolutePath = path.join(workspaceRoot, reference.path);
  assert.equal(fs.statSync(absolutePath).isFile(), true);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

test("QI Adapter materializes exact bytes and derives passed Acceptance", async (t) => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qia-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const request = bellRequest();
  const { decision, session, warnings } = await executePostAdapter({
    workspaceRoot,
    request,
    value: canonicalValue(request),
    callId: "qia-bell-call",
  });

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    QUANTUM_INFORMATION_AUDIT_TOOL,
    decision.content[0].text,
  );
  assert.equal(presentation.scientificStatus, "acceptance_available");
  assert.equal(presentation.acceptanceStatus, "passed");
  assert.equal(presentation.resultCommit.capability.id, "quantum-information-audit");
  assert.deepEqual(
    presentation.resultCommit.artifacts.map((artifact) => artifact.type).sort(),
    ["state-analysis", "validation-bundle"],
  );

  const resultPackage = readCommitJson(
    workspaceRoot,
    presentation.resultCommit.resultPackage,
  );
  const acceptance = readCommitJson(
    workspaceRoot,
    presentation.resultCommit.acceptanceReport,
  );
  assert.deepEqual(resultPackage.executionRef, {
    sessionId: session.id,
    eventRange: { from: 11, to: 12 },
  });
  assert.equal(resultPackage.artifacts.length, 2);
  assert.equal(acceptance.status, "passed");
  assert.equal(acceptance.checks.length, 10);
  assert.equal(
    acceptance.checks.find((check) => check.id === "provenance.complete")
      .status,
    "pass",
  );
});

test("QI Adapter independently rejects a tampered numerical fact", async (t) => {
  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "openquantum-qia-tampered-"),
  );
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const request = bellRequest();
  const value = canonicalValue(request, (analysis) => {
    analysis.partialTranspose.negativity = 0.25;
    return analysis;
  });
  const { decision, warnings } = await executePostAdapter({
    workspaceRoot,
    request,
    value,
    callId: "qia-tampered-call",
  });

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    QUANTUM_INFORMATION_AUDIT_TOOL,
    decision.content[0].text,
  );
  assert.equal(presentation.scientificStatus, "acceptance_available");
  assert.equal(presentation.acceptanceStatus, "failed");
  const acceptance = readCommitJson(
    workspaceRoot,
    presentation.resultCommit.acceptanceReport,
  );
  assert.equal(
    acceptance.checks.find((check) => check.id === "negativity.replayed").status,
    "fail",
  );
});

test("QI Adapter rejects facts that do not come from the pinned toqito version", async (t) => {
  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "openquantum-qia-version-"),
  );
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const request = bellRequest();
  const value = canonicalValue(request, (analysis) => {
    analysis.packageVersion = "9.9.9";
    return analysis;
  });
  const { decision, warnings } = await executePostAdapter({
    workspaceRoot,
    request,
    value,
    callId: "qia-version-call",
  });

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    QUANTUM_INFORMATION_AUDIT_TOOL,
    decision.content[0].text,
  );
  assert.equal(presentation.acceptanceStatus, "failed");
  const acceptance = readCommitJson(
    workspaceRoot,
    presentation.resultCommit.acceptanceReport,
  );
  const provenance = acceptance.checks.find(
    (check) => check.id === "provenance.complete",
  );
  assert.equal(provenance.status, "fail");
  assert.equal(provenance.observed.packageVersionMatches, false);
});
