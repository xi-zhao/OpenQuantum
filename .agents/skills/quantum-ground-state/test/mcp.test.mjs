import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { readDeclaredMcpToolContract } from "../../../../scripts/lib/capability-tool-contract.mjs";

const skillRoot = fileURLToPath(new URL("..", import.meta.url));
const projectRoot = path.resolve(skillRoot, "../../..");
const serverPath = path.join(skillRoot, "mcp/server.mjs");
const declaredToolContract = readDeclaredMcpToolContract({
  projectRoot,
  capabilityId: "quantum-ground-state",
  serverName: "openquantum_quantum",
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(skillRoot, relativePath), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function standardResult(result) {
  assert.ok("content" in result, "expected a standard MCP tool result");
  return result;
}

function observation(output, id) {
  const found = output.observations.find((item) => item.id === id);
  assert.ok(found, `missing observation ${id}`);
  return found;
}

function resultPackageFor(facts) {
  const artifacts = [
    facts.problemSpec,
    facts.hamiltonianManifest,
    facts.exactReference,
    facts.groundStateResult,
    facts.convergenceTrace,
    facts.resourceEstimate,
  ];
  return {
    kind: "openquantum-result-package-v1.1",
    value: {
      schemaVersion: "1.1",
      packageId: "qgs-mcp-package-001",
      capability: { id: "quantum-ground-state", version: "0.2.0" },
      createdAt: "2026-08-14T00:00:00.000Z",
      executionRef: {
        sessionId: "qgs-mcp-test-session",
        eventRange: { from: 10, to: 20 },
      },
      acceptanceProfile: {
        id: "supplied-pauli-statevector",
        version: "1.0.0",
        sha256: "3da476e36d255d0dac46252222a0df3132c9b4038af805ad049f523a562c613a",
      },
      inputs: [
        {
          id: "request-snapshot",
          type: "ground-state-request",
          path: "request.json",
          mediaType: "application/json",
          bytes: 1,
          sha256: "c".repeat(64),
        },
      ],
      artifacts: artifacts.map((artifact, index) => ({
        id: `${artifact.artifactType}-artifact`,
        type: artifact.artifactType,
        path: `${artifact.artifactType}.json`,
        mediaType: "application/json",
        bytes: index + 1,
        sha256: String(index + 1).repeat(64),
      })),
      provenance: {
        tools: [{ id: "qgs-solver", version: "0.1.0", digest: "d".repeat(64) }],
        environment: [
          { id: "node", version: process.versions.node, digest: "e".repeat(64) },
        ],
        dependencies: [],
      },
    },
  };
}

function validationBundle(request, facts) {
  return {
    schemaVersion: "1.0",
    resultPackage: resultPackageFor(facts),
    profile: readJson("acceptance-profiles/supplied-pauli-statevector-v1.json"),
    request,
    facts,
  };
}

const protocolFixture = readJson("evals/fixtures/requests/protocol-fixture.json");

let client;
let transport;
let tools;
let serverStderr = "";

before(async () => {
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: projectRoot,
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => {
    serverStderr += chunk.toString("utf8");
  });
  client = new Client(
    { name: "openquantum-qgs-mcp-test", version: "1.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  tools = (await client.listTools()).tools;
});

after(async () => {
  await client?.close();
  assert.equal(serverStderr, "", `MCP server wrote to stderr: ${serverStderr}`);
});

test("stdio MCP lists the atomic workflow and advanced tools with strict Harness-compatible schemas", () => {
  assert.deepEqual(
    tools.map((tool) => tool.name),
    declaredToolContract.map((tool) => tool.name),
  );
  assert.ok(declaredToolContract.every((tool) => tool.effect === "read-only"));
  assert.ok(
    declaredToolContract.every(
      (tool) => tool.effectEvidence === "mcp-annotations",
    ),
  );
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.outputSchema.type, "object");
    assert.equal(tool.outputSchema.additionalProperties, false);
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  }
  assert.equal(
    tools.find((tool) => tool.name === "solve_ground_state").inputSchema.properties.request
      .additionalProperties,
    false,
  );
});

test("stdio MCP atomically solves and validates without fabricating provenance", async () => {
  const analyzed = standardResult(
    await client.callTool({
      name: "solve_and_validate_ground_state",
      arguments: { request: protocolFixture },
    }),
  );

  assert.equal(analyzed.isError, undefined);
  assert.equal(analyzed.content.length, 1);
  assert.equal(analyzed.content[0].type, "text");
  assert.ok(analyzed.content[0].text.length < 700);
  assert.match(analyzed.content[0].text, /15 pass, 0 fail, 1 not checked/);
  assert.match(analyzed.content[0].text, /No overall Acceptance decision/);
  assert.deepEqual(Object.keys(analyzed.structuredContent), ["facts", "validation"]);
  assert.deepEqual(Object.keys(analyzed.structuredContent.facts), [
    "problemSpec",
    "hamiltonianManifest",
    "exactReference",
    "groundStateResult",
    "convergenceTrace",
    "resourceEstimate",
  ]);
  const validation = analyzed.structuredContent.validation;
  assert.equal(validation.scopeMatch.status, "in_scope");
  assert.equal(validation.observations.length, 16);
  assert.ok(
    validation.observations
      .filter((item) => item.id !== "provenance.complete")
      .every((item) => item.status === "pass"),
  );
  assert.deepEqual(observation(validation, "provenance.complete"), {
    id: "provenance.complete",
    status: "not_checked",
    observed: {
      materializedResultPackage: false,
      reason:
        "The computation is still an execution-local MCP result, not a Harness-materialized Result Package.",
    },
    evidenceRefs: [],
    nextAction:
      "Materialize the input and six facts as a validated Result Package, then run the full Validator before deriving Acceptance.",
  });
  assert.equal("status" in validation, false);
  assert.equal("acceptance" in validation, false);
  assert.doesNotMatch(JSON.stringify(analyzed.structuredContent), /mcp-local-session/);
});

test("stdio MCP solves facts and validates observations without an overall acceptance", async () => {
  const solved = standardResult(
    await client.callTool({
      name: "solve_ground_state",
      arguments: { request: protocolFixture },
    }),
  );

  assert.equal(solved.isError, undefined);
  assert.equal(solved.content.length, 1);
  assert.equal(solved.content[0].type, "text");
  assert.ok(solved.content[0].text.length < 500);
  assert.match(solved.content[0].text, /No scientific acceptance decision/);
  const facts = solved.structuredContent;
  assert.deepEqual(Object.keys(facts), [
    "problemSpec",
    "hamiltonianManifest",
    "exactReference",
    "groundStateResult",
    "convergenceTrace",
    "resourceEstimate",
  ]);
  assert.equal(facts.groundStateResult.converged, true);
  assert.doesNotMatch(JSON.stringify(facts), /"(?:status|score|acceptance)"\s*:/);

  const validated = standardResult(
    await client.callTool({
      name: "validate_ground_state",
      arguments: { bundle: validationBundle(protocolFixture, facts) },
    }),
  );
  assert.equal(validated.isError, undefined);
  assert.ok(validated.content[0].text.length < 500);
  assert.match(validated.content[0].text, /No overall acceptance decision/);
  assert.deepEqual(Object.keys(validated.structuredContent), [
    "scopeMatch",
    "observations",
    "limitations",
    "statement",
  ]);
  assert.ok(validated.structuredContent.observations.every((item) => item.status === "pass"));
  assert.equal("status" in validated.structuredContent, false);
  assert.equal("score" in validated.structuredContent, false);
  assert.equal("acceptance" in validated.structuredContent, false);
});

test("stdio MCP preserves truthful low-budget facts as failed convergence observations", async () => {
  const request = clone(protocolFixture);
  request.requestId = "qgs-mcp-low-budget-001";
  request.method.optimizer.maxEvaluations = 32;
  const solved = standardResult(
    await client.callTool({ name: "solve_ground_state", arguments: { request } }),
  );
  assert.equal(solved.isError, undefined);
  assert.equal(solved.structuredContent.groundStateResult.converged, false);

  const validated = standardResult(
    await client.callTool({
      name: "validate_ground_state",
      arguments: {
        bundle: validationBundle(request, solved.structuredContent),
      },
    }),
  );
  assert.equal(validated.isError, undefined);
  assert.equal(observation(validated.structuredContent, "vqe.converged").status, "fail");
  assert.equal(
    observation(validated.structuredContent, "optimizer.trace-replayed").status,
    "pass",
  );
  assert.equal("status" in validated.structuredContent, false);
});

test("stdio MCP validator detects tampered facts", async () => {
  const solved = standardResult(
    await client.callTool({
      name: "solve_ground_state",
      arguments: { request: protocolFixture },
    }),
  );
  const tampered = clone(solved.structuredContent);
  tampered.groundStateResult.energyHartree += 0.01;

  const validated = standardResult(
    await client.callTool({
      name: "validate_ground_state",
      arguments: { bundle: validationBundle(protocolFixture, tampered) },
    }),
  );
  assert.equal(validated.isError, undefined);
  assert.equal(
    observation(validated.structuredContent, "result.expectation-replayed").status,
    "fail",
  );
  assert.equal("acceptance" in validated.structuredContent, false);
});

test("stdio MCP rejects out-of-range requests, extra arguments, and profile tampering", async () => {
  const outOfRange = clone(protocolFixture);
  outOfRange.hamiltonian.terms[0].coefficient = 1_000_001;
  const bounded = standardResult(
    await client.callTool({
      name: "solve_ground_state",
      arguments: { request: outOfRange },
    }),
  );
  assert.equal(bounded.isError, true);
  assert.match(bounded.content[0].text, /must be <= 1000000/);
  assert.equal(bounded.structuredContent, undefined);

  const extra = standardResult(
    await client.callTool({
      name: "solve_ground_state",
      arguments: { request: protocolFixture, outputPath: "/tmp/result.json" },
    }),
  );
  assert.equal(extra.isError, true);
  assert.match(extra.content[0].text, /arguments must contain exactly: request/);

  const solved = standardResult(
    await client.callTool({
      name: "solve_ground_state",
      arguments: { request: protocolFixture },
    }),
  );
  const bundle = validationBundle(protocolFixture, solved.structuredContent);
  bundle.profile.checks.find((check) => check.id === "vqe.energy-accuracy").threshold = 1;
  const forgedProfile = standardResult(
    await client.callTool({
      name: "validate_ground_state",
      arguments: { bundle },
    }),
  );
  assert.equal(forgedProfile.isError, true);
  assert.match(forgedProfile.content[0].text, /profile must exactly match/);
});
