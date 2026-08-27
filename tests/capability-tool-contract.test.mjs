import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  readDeclaredMcpToolContract,
  readDeclaredNativeToolContracts,
  readDefaultCapabilityContractChecks,
} from "../scripts/lib/capability-tool-contract.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("MCP contract reader returns policy-owned Tool effects and evidence", () => {
  assert.deepEqual(
    readDeclaredMcpToolContract({
      projectRoot,
      capabilityId: "quantum-ground-state",
      serverName: "openquantum_quantum",
    }),
    [
      { name: "solve_and_validate_ground_state", effect: "read-only", effectEvidence: "mcp-annotations" },
      { name: "solve_ground_state", effect: "read-only", effectEvidence: "mcp-annotations" },
      { name: "validate_ground_state", effect: "read-only", effectEvidence: "mcp-annotations" },
    ],
  );
});

test("MCP contract reader fails closed for undeclared capabilities and servers", () => {
  assert.throws(
    () =>
      readDeclaredMcpToolContract({
        projectRoot,
        capabilityId: "missing-capability",
        serverName: "missing_server",
      }),
    /must declare capability missing-capability exactly once/,
  );
  assert.throws(
    () =>
      readDeclaredMcpToolContract({
        projectRoot,
        capabilityId: "quantum-ground-state",
        serverName: "missing_server",
      }),
    /must declare MCP server missing_server exactly once/,
  );
});

test("reviewed-source contracts carry their repository evidence reference", () => {
  const contracts = readDeclaredMcpToolContract({
    projectRoot,
    capabilityId: "qiskit-circuit-workbench",
    serverName: "qiskit",
  });

  assert.ok(
    contracts.every(
      (contract) =>
        contract.effectEvidence === "reviewed-source" &&
        contract.effectEvidenceRef ===
          "docs/integrations/QISKIT_MCP_EFFECT_REVIEW.md",
    ),
  );
});

test("native Tool contract reader returns Provider, activation and effect", () => {
  assert.deepEqual(
    readDeclaredNativeToolContracts({
      projectRoot,
      capabilityId: "platform-diagnostics",
    }),
    [
      {
        name: "bash",
        providerPlugin: "@deepseek-ai/dsh-tool-bash",
        activation: "conditional",
        contractCheck: "tests/harness-native-quantum.test.mjs",
        effect: "external-write",
        effectEvidence: "conservative-provider",
      },
      {
        name: "pwsh",
        providerPlugin: "@deepseek-ai/dsh-tool-pwsh",
        activation: "conditional",
        contractCheck: "tests/harness-native-quantum.test.mjs",
        effect: "external-write",
        effectEvidence: "conservative-provider",
      },
    ],
  );
});

test("default contract checks are derived from package MCP and native Tool policy", () => {
  assert.deepEqual(readDefaultCapabilityContractChecks({ projectRoot }), [
    ".agents/skills/fieldqkit-hardware/test/mcp.test.mjs",
    ".agents/skills/qec-memory-experiment/test/mcp.test.mjs",
    ".agents/skills/qpanda-qubo/test/mcp.test.mjs",
    ".agents/skills/quantum-circuit-verification/test/mcp.test.mjs",
    ".agents/skills/quantum-ground-state/test/mcp.test.mjs",
    ".agents/skills/quantum-information-audit/test/mcp.test.mjs",
    ".agents/skills/tyxonq-workbench/test/mcp.test.mjs",
    "tests/harness-native-quantum.test.mjs",
  ]);
});
