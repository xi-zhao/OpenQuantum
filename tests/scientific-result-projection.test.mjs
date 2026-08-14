import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  apply,
  encodeScientificToolResult,
  parseScientificToolResult,
  projectMaterializedScientificResult,
  projectScientificToolResult,
  SOLVE_AND_VALIDATE_TOOL,
  SOLVE_TOOL,
  VALIDATE_TOOL,
} from "../runtime/openquantum/agent-presets/openquantum/scientific-result-projection.mjs";
import { ScientificActivityPanel } from "../src/components/openquantum/ScientificActivityPanel";
import { DeepSeekHarnessAdapterCore } from "../src/harness/deepseek-adapter-core";
import { DeepSeekHarnessTransport } from "../src/harness/transport";

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

function resultEnvelope(value) {
  return { result: { ok: true, value } };
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
  return projectMaterializedScientificResult(solveAndValidateCanonicalValue(), {
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
  });
}

function toolCall(seq, callId, name) {
  return {
    type: "tool/call",
    seq,
    time: seq,
    data: { turn: 1, step: 1, callId, name, arguments: "{}" },
  };
}

function toolResult(seq, callId, text, isError = false) {
  return {
    type: "tool/result",
    seq,
    time: seq,
    data: {
      turn: 1,
      step: 1,
      message: {
        id: `result-${callId}`,
        role: "user",
        source: { kind: "tool", callId },
        content: [
          {
            type: "tool-result",
            toolCallId: callId,
            content: [{ type: "text", text }],
            isError,
          },
        ],
      },
    },
  };
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

  const canonicalValue = solveCanonicalValue();
  const decision = await listener(
    { name: SOLVE_TOOL, parent: undefined },
    {
      isError: false,
      value: canonicalValue,
      content: canonicalValue.content,
    },
    async () => ({ kind: "accept" }),
  );

  assert.equal(decision.kind, "accept");
  assert.equal(decision.content.length, 1);
  assert.match(decision.content[0].text, /Original solve summary/);
  const projection = parseScientificToolResult(
    SOLVE_TOOL,
    decision.content[0].text,
  );
  assert.equal(projection.operation, "solve");
  assert.equal(projection.scientificStatus, "not_evaluated");
  assert.deepEqual(
    projection.details.map((item) => item.label),
    [
      "VQE 扇区能量",
      "精确参考能量",
      "绝对能量差",
      "优化事实",
      "函数评估次数",
    ],
  );
  assert.ok(decision.content[0].text.length < 2_000);
});

test("scientific envelope rejects mismatched tools and malformed payloads", () => {
  const solveProjection = projectScientificToolResult(
    SOLVE_TOOL,
    solveCanonicalValue(),
  );
  const encoded = encodeScientificToolResult(solveProjection);
  assert.equal(parseScientificToolResult(SOLVE_TOOL, encoded).operation, "solve");
  assert.equal(parseScientificToolResult(VALIDATE_TOOL, encoded), undefined);
  assert.equal(
    parseScientificToolResult(SOLVE_TOOL, `${encoded.slice(0, -1)}!`),
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

test("Harness history folds scientific tool runtime and review status separately", async () => {
  const solveProjection = projectScientificToolResult(
    SOLVE_TOOL,
    solveCanonicalValue(),
  );
  const solveText = `Solve complete.\n${encodeScientificToolResult(
    solveProjection,
  )}`;
  const historyEvents = [
    toolCall(1, "qgs-solve:0", SOLVE_TOOL),
    toolResult(2, "qgs-solve:0", solveText),
    toolCall(3, "qgs-validate:0", VALIDATE_TOOL),
    toolCall(4, "qgs-atomic:0", SOLVE_AND_VALIDATE_TOOL),
    toolResult(
      5,
      "qgs-atomic:0",
      `Atomic complete.\n${encodeScientificToolResult(
        projectScientificToolResult(
          SOLVE_AND_VALIDATE_TOOL,
          solveAndValidateCanonicalValue(),
        ),
      )}`,
    ),
    toolCall(6, "qgs-materialized:0", SOLVE_AND_VALIDATE_TOOL),
    toolResult(
      7,
      "qgs-materialized:0",
      `Materialized complete.\n${encodeScientificToolResult(
        materializedProjection(),
      )}`,
    ),
  ];
  const client = {
    sessions: {
      history: async () =>
        resultEnvelope({
          events: historyEvents.map((event) => ({ event })),
          hasMore: false,
        }),
    },
  };
  const transport = new DeepSeekHarnessTransport(client);
  const conversation = await transport.getSnapshot("session-science");

  assert.equal(conversation.scientificActivities.length, 4);
  assert.deepEqual(
    conversation.scientificActivities.map((activity) => ({
      operation: activity.operation,
      runtimeStatus: activity.runtimeStatus,
      scientificStatus: activity.scientificStatus,
    })),
    [
      {
        operation: "solve",
        runtimeStatus: "completed",
        scientificStatus: "not_evaluated",
      },
      {
        operation: "validate",
        runtimeStatus: "running",
        scientificStatus: "not_available",
      },
      {
        operation: "solve-and-validate",
        runtimeStatus: "completed",
        scientificStatus: "observations_available",
      },
      {
        operation: "solve-and-validate",
        runtimeStatus: "completed",
        scientificStatus: "acceptance_available",
      },
    ],
  );

  const core = new DeepSeekHarnessAdapterCore({
    initialSessionId: "session-science",
    transport: {
      listSessions: async () => [
        {
          id: "session-science",
          title: "科学记录",
          updatedAt: 1,
          running: false,
          blank: false,
        },
      ],
      getSnapshot: async () => conversation,
      createSession: async () => "unused",
      startPrompt: () => {
        throw new Error("unused");
      },
      cancel: async () => {},
      respondToInteraction: async () => {},
      async *events() {},
    },
  });
  const snapshot = await core.snapshot();
  assert.equal(snapshot.activeSession.scientificActivities.length, 4);
  assert(Object.isFrozen(snapshot.activeSession.scientificActivities));
  assert(Object.isFrozen(snapshot.activeSession.scientificActivities[0].details));
});

test("scientific activity UI never equates runtime completion with acceptance", () => {
  const validationProjection = projectScientificToolResult(
    VALIDATE_TOOL,
    validationCanonicalValue(),
  );
  const markup = renderToStaticMarkup(
    createElement(ScientificActivityPanel, {
      activities: [
        {
          id: "materialized-call",
          toolName: SOLVE_AND_VALIDATE_TOOL,
          ...materializedProjection(),
          runtimeStatus: "completed",
          sequence: 8,
        },
        {
          id: "atomic-call",
          toolName: SOLVE_AND_VALIDATE_TOOL,
          ...projectScientificToolResult(
            SOLVE_AND_VALIDATE_TOOL,
            solveAndValidateCanonicalValue(),
          ),
          runtimeStatus: "completed",
          sequence: 6,
        },
        {
          id: "solve-call",
          toolName: SOLVE_TOOL,
          ...projectScientificToolResult(SOLVE_TOOL, solveCanonicalValue()),
          runtimeStatus: "completed",
          sequence: 2,
        },
        {
          id: "validation-call",
          toolName: VALIDATE_TOOL,
          ...validationProjection,
          runtimeStatus: "completed",
          sequence: 4,
        },
      ],
    }),
  );

  assert.match(markup, /运行：已完成/);
  assert.match(markup, /科学：尚未验收/);
  assert.match(markup, /科学：已有逐项观察/);
  assert.match(markup, /科学：已有整体验收/);
  assert.match(markup, /验收：通过/);
  assert.match(markup, /通过/);
  assert.equal((markup.match(/验收：通过/g) ?? []).length, 1);
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
