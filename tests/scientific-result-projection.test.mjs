import assert from "node:assert/strict";
import test from "node:test";

import {
  apply,
  encodeScientificToolResult,
  parseScientificToolResult,
  projectMaterializedScientificResult,
  projectScientificToolResult,
  QUANTUM_INFORMATION_AUDIT_TOOL,
  SOLVE_AND_VALIDATE_TOOL,
} from "../runtime/openquantum/agent-presets/openquantum/scientific-result-projection.mjs";

function solveCanonicalValue() {
  return {
    content: [{ type: "text", text: "Original solve summary." }],
    structuredContent: {
      problemSpec: { requestId: "qgs-ui-projection-001" },
      groundStateResult: {
        artifactType: "ground-state-result",
        energyHartree: -1.85727503020238,
        converged: true,
        evaluationCount: 112,
      },
      exactReference: {
        artifactType: "exact-reference",
        groundEnergyHartree: -1.8572750302023797,
      },
    },
  };
}

function validationCanonicalValue() {
  return {
    content: [{ type: "text", text: "Original validation summary." }],
    structuredContent: {
      scopeMatch: { status: "in_scope" },
      observations: [
        { id: "energy", status: "pass" },
        { id: "trace", status: "pass" },
        { id: "convergence", status: "warn" },
      ],
      limitations: [],
      statement: "observations only",
    },
  };
}

function solveAndValidateCanonicalValue() {
  return {
    content: [{ type: "text", text: "Original atomic workflow summary." }],
    structuredContent: {
      facts: solveCanonicalValue().structuredContent,
      validation: {
        ...validationCanonicalValue().structuredContent,
        observations: [
          { id: "energy", status: "pass" },
          { id: "trace", status: "pass" },
          { id: "provenance.complete", status: "not_checked" },
        ],
      },
    },
  };
}

function materializedProjection() {
  const sha256 = "a".repeat(64);
  const resultCommit = {
    kind: "openquantum.result-commit",
    schemaVersion: "1.0",
    createdAt: "2026-08-14T00:00:00.000Z",
    capability: {
      id: "quantum-ground-state",
      version: "0.2.0",
      manifestSha256: sha256,
    },
    resultPackage: {
      packageId: "qgs-materialized",
      path: "results/openquantum/qgs/result-package.json",
      bytes: 100,
      sha256,
    },
    acceptanceReport: {
      reportId: "qgs-acceptance-materialized",
      status: "passed",
      path: "results/openquantum/qgs/acceptance-report.json",
      bytes: 100,
      sha256,
    },
    artifacts: [
      "problem-spec",
      "hamiltonian-manifest",
      "exact-reference",
      "ground-state-result",
      "convergence-trace",
      "resource-estimate",
    ].map((type) => ({
      id: type,
      type,
      mediaType: "application/json",
      path: `results/openquantum/qgs/artifacts/${type}.json`,
      bytes: 100,
      sha256,
    })),
  };
  return projectMaterializedScientificResult(
    SOLVE_AND_VALIDATE_TOOL,
    solveAndValidateCanonicalValue(),
    {
      validation: {
        ...validationCanonicalValue().structuredContent,
        observations: [
          { id: "energy", status: "pass" },
          { id: "trace", status: "pass" },
          { id: "provenance.complete", status: "pass" },
        ],
      },
      acceptanceStatus: "passed",
      resultCommit,
      resultPackagePath: resultCommit.resultPackage.path,
    },
  );
}

test("post-execute adapter persists a bounded scientific projection in tool/result content", async () => {
  let listener;
  const ctx = {
    on(name, callback) {
      assert.equal(name, "tools/post-execute");
      listener = callback;
    },
  };
  apply(ctx);
  assert.equal(typeof listener, "function");

  const canonicalValue = solveAndValidateCanonicalValue().structuredContent;
  const decision = await listener(
    { name: SOLVE_AND_VALIDATE_TOOL, parent: undefined },
    {
      isError: false,
      value: canonicalValue,
      content: [{ type: "text", text: "Original atomic workflow summary." }],
    },
    async () => ({ kind: "accept" }),
  );

  assert.equal(decision.kind, "accept");
  assert.equal(decision.content.length, 1);
  assert.match(decision.content[0].text, /Original atomic workflow summary/);
  const projection = parseScientificToolResult(
    SOLVE_AND_VALIDATE_TOOL,
    decision.content[0].text,
  );
  assert.equal(projection.operation, "solve-and-validate");
  assert.equal(projection.scientificStatus, "observations_available");
  assert.deepEqual(
    projection.details.map((item) => item.label),
    [
      "VQE 扇区能量",
      "精确参考能量",
      "绝对能量差",
      "适用范围",
      "通过",
      "警告",
      "失败",
      "未检查",
    ],
  );
  assert.ok(decision.content[0].text.length < 2_000);
});

test("scientific envelope rejects mismatched tools and malformed payloads", () => {
  const solveProjection = projectScientificToolResult(
    SOLVE_AND_VALIDATE_TOOL,
    solveAndValidateCanonicalValue().structuredContent,
  );
  const encoded = encodeScientificToolResult(solveProjection);
  assert.equal(
    parseScientificToolResult(SOLVE_AND_VALIDATE_TOOL, encoded).operation,
    "solve-and-validate",
  );
  assert.equal(
    parseScientificToolResult(QUANTUM_INFORMATION_AUDIT_TOOL, encoded),
    undefined,
  );
  assert.equal(
    parseScientificToolResult(
      SOLVE_AND_VALIDATE_TOOL,
      `${encoded.slice(0, -1)}!`,
    ),
    undefined,
  );
});

test("atomic workflow projection keeps observations separate from Acceptance", () => {
  const projection = projectScientificToolResult(
    SOLVE_AND_VALIDATE_TOOL,
    solveAndValidateCanonicalValue(),
  );
  assert.equal(projection.operation, "solve-and-validate");
  assert.equal(projection.scientificStatus, "observations_available");
  assert.match(projection.summary, /整体科学验收仍需 Harness 物化后单独推导/);
  assert.deepEqual(
    Object.fromEntries(projection.details.map((item) => [item.label, item.value])),
    {
      "VQE 扇区能量": "-1.85727503 Ha",
      "精确参考能量": "-1.85727503 Ha",
      "绝对能量差": "2.220446049e-16 Ha",
      适用范围: "in_scope",
      通过: "2",
      警告: "0",
      失败: "0",
      未检查: "1",
    },
  );
});

test("scientific result replay rejects non-canonical commit paths and extra fields", () => {
  const projected = materializedProjection();
  const unsafePath = structuredClone(projected);
  unsafePath.resultCommit.resultPackage.path =
    "results/openquantum/qgs/../result-package.json";
  assert.equal(
    parseScientificToolResult(
      SOLVE_AND_VALIDATE_TOOL,
      encodeScientificToolResult(unsafePath),
    ),
    undefined,
  );

  const extraField = structuredClone(projected);
  extraField.resultCommit.untrusted = true;
  assert.equal(
    parseScientificToolResult(
      SOLVE_AND_VALIDATE_TOOL,
      encodeScientificToolResult(extraField),
    ),
    undefined,
  );
});
