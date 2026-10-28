import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { scientificProjectionFixture } from "./helpers/scientific-projection.mjs";

import {
  computeReferenceAnalysis,
} from "../.agents/skills/quantum-information-audit/validators/state-math.mjs";
import { validateStateAnalysis } from "../.agents/skills/quantum-information-audit/validators/validate-state-analysis.mjs";
import {
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

async function executePostAdapter({ workspaceRoot, request, value, callId }) {
  const fixture = scientificProjectionFixture({ workspaceRoot, sessionId: `session-${callId}` });
  const result = await fixture.execute({ tool: QUANTUM_INFORMATION_AUDIT_TOOL, request, value, callId, seq: 11 });
  return { content: result.content, session: fixture.session, warnings: fixture.warnings };
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
  const { content, session, warnings } = await executePostAdapter({
    workspaceRoot,
    request,
    value: canonicalValue(request),
    callId: "qia-bell-call",
  });

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    QUANTUM_INFORMATION_AUDIT_TOOL,
    content[0].text,
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
  const readablePath = presentation.details.find(detail => detail.label === "可读验收报告").value;
  const readable = fs.readFileSync(path.join(workspaceRoot, readablePath), "utf8");
  assert.match(readable, /中央验收状态：`passed`/);
  assert.ok(readable.includes("| (0, 3) | 0.5 |"));
  assert.ok(!readable.includes("| (1, 2) | 0.5 |"), "The input matrix must not be replaced by its partial transpose");
  assert.ok(readable.includes(presentation.resultCommit.acceptanceReport.path));
  assert.equal(
    acceptance.checks.find((check) => check.id === "provenance.complete")
      .status,
    "pass",
  );
});

test("large QI matrices keep full evidence while the readable report stays bounded", async t => {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openquantum-qia-large-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  const request = {
    matrixReal: Array.from({ length: 64 }, () => Array(64).fill(1 / 64)),
    subsystemDimensions: [8, 8], transposeSubsystems: [0],
  };
  const { content, warnings } = await executePostAdapter({
    workspaceRoot, request, value: canonicalValue(request), callId: "qia-large-call",
  });
  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(QUANTUM_INFORMATION_AUDIT_TOOL, content[0].text);
  assert.equal(presentation.acceptanceStatus, "passed");
  const readablePath = presentation.details.find(detail => detail.label === "可读验收报告").value;
  const report = fs.readFileSync(path.join(workspaceRoot, readablePath), "utf8");
  assert.ok(Buffer.byteLength(report) < 65536);
  assert.match(report, /64 \/ 4096/);
  const resultPackage = readCommitJson(workspaceRoot, presentation.resultCommit.resultPackage);
  const inputPath = path.join(workspaceRoot, path.dirname(presentation.resultCommit.resultPackage.path), resultPackage.inputs[0].path);
  assert.deepEqual(JSON.parse(fs.readFileSync(inputPath, "utf8")).matrixReal, request.matrixReal);
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
  const { content, warnings } = await executePostAdapter({
    workspaceRoot,
    request,
    value,
    callId: "qia-tampered-call",
  });

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    QUANTUM_INFORMATION_AUDIT_TOOL,
    content[0].text,
  );
  assert.equal(presentation.scientificStatus, "acceptance_available");
  assert.equal(presentation.acceptanceStatus, "failed");
  const readablePath = presentation.details.find(detail => detail.label === "可读验收报告").value;
  assert.match(fs.readFileSync(path.join(workspaceRoot, readablePath), "utf8"), /中央验收状态：`failed`/);
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
  const { content, warnings } = await executePostAdapter({
    workspaceRoot,
    request,
    value,
    callId: "qia-version-call",
  });

  assert.deepEqual(warnings, []);
  const presentation = parseScientificToolResult(
    QUANTUM_INFORMATION_AUDIT_TOOL,
    content[0].text,
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
