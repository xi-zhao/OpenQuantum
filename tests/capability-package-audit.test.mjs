import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditCapabilityPackages } from "../scripts/lib/capability-package-audit.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

async function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function temporaryProject(t, policy) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "openquantum-capability-audit-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  await write(root, ".agents/capability-packages.yml", policy);
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    "[]\n",
  );
  return root;
}

async function addTrackedSkill(root, id) {
  await write(
    root,
    `.agents/skills/${id}/SKILL.md`,
    `---\nname: ${id}\ndescription: Test capability.\n---\n\n# ${id}\n`,
  );
  execFileSync(
    "git",
    ["add", `.agents/skills/${id}/SKILL.md`],
    { cwd: root },
  );
}

function packageEntrypointPolicy(entrypoint) {
  return `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: package
          entrypoint: ${JSON.stringify(entrypoint)}
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`;
}

async function writePackageMcpPreset(root, entrypoint) {
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: !!js process.execPath
    args:
      - !!js process.cwd() + '/${entrypoint}'
    cwd: !!js process.cwd()
`,
  );
}

test("repository capability packages conform to their declared L0-L3 evidence", async () => {
  const report = await auditCapabilityPackages({ projectRoot });

  assert.equal(report.schemaVersion, "1.1");
  assert.equal(report.scope, "static-declaration");
  assert.equal(report.status, "pass", report.issues.join("\n"));
  assert.deepEqual(report.summary.levelCounts, {
    L0: 1,
    L1: 6,
    L2: 1,
    L3: 2,
  });
  assert.equal(report.packages.length, 10);
  assert(
    report.packages.every((entry) => entry.status === "pass"),
    report.issues.join("\n"),
  );
  assert(
    report.packages.every(
      (entry) =>
        JSON.stringify(Object.keys(entry.execution).sort()) ===
        JSON.stringify(
          ["checks", "mcpServers", "nativeTools"].sort(),
        ),
    ),
    "execution report must expose the policy v1.1 field names",
  );
  assert.deepEqual(
    report.packages.find((entry) => entry.id === "platform-diagnostics")
      ?.execution.nativeTools,
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
  assert.deepEqual(
    report.packages.find((entry) => entry.id === "quantum-ground-state")
      ?.execution.mcpServers[0].tools,
    [
      { name: "solve_and_validate_ground_state", effect: "read-only" },
      { name: "solve_ground_state", effect: "read-only" },
      { name: "validate_ground_state", effect: "read-only" },
    ],
  );
  assert.equal(
    report.packages.find((entry) => entry.id === "quantum-ground-state")
      ?.execution.mcpServers[0].effectEvidence,
    "mcp-annotations",
  );
  assert.equal(
    report.packages.find((entry) => entry.id === "quantum-ground-state")
      ?.execution.mcpServers[0].entrypoint,
    ".agents/skills/quantum-ground-state/mcp/server.mjs",
  );
  assert.equal(
    report.packages.find((entry) => entry.id === "qiskit-circuit-workbench")
      ?.execution.mcpServers[0].effectEvidenceRef,
    "docs/integrations/QISKIT_MCP_EFFECT_REVIEW.md",
  );
});

test("tracked repository Skills cannot bypass the capability package policy", async (t) => {
  const root = await temporaryProject(
    t,
    'schemaVersion: "1.1"\npackages: []\n',
  );
  await addTrackedSkill(root, "unlisted-capability");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "tracked capability unlisted-capability is missing from .agents/capability-packages.yml",
    ),
  );
});

test("L1 execution fails closed when its declared MCP server is absent from the preset", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: missing_server
          source: package
          entrypoint: .agents/skills/demo-capability/mcp/server.mjs
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(
    root,
    ".agents/skills/demo-capability/mcp/server.mjs",
    "export const server = true;\n",
  );
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server missing_server is not declared by an MCP Client in the Agent Preset",
    ),
  );
});

test("package MCP declarations require a canonical package-local entrypoint", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: package
          entrypoint: .agents/skills/demo-capability/mcp/server.mjs
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(
    root,
    ".agents/skills/demo-capability/mcp/server.mjs",
    "export const server = true;\n",
  );
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: untrusted-launcher
    args:
      - !!js process.cwd() + '/.agents/skills/demo-capability/mcp/server.mjs'
    cwd: !!js process.cwd()
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server demo_server does not use its declared package entrypoint as the unique Node launch target",
    ),
  );
});

test("package MCP entrypoints must exist as regular repository files", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: package
          entrypoint: .agents/skills/demo-capability/mcp/server.mjs
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: !!js process.execPath
    args:
      - !!js process.cwd() + '/.agents/skills/demo-capability/mcp/server.mjs'
    cwd: !!js process.cwd()
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.some((issue) =>
      issue.startsWith(
        "demo-capability: MCP server demo_server entrypoint cannot be resolved:",
      ),
    ),
  );
});

test("package MCP entrypoints cannot escape their owning capability", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: package
          entrypoint: .agents/skills/other-capability/mcp/server.mjs
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(
    root,
    ".agents/skills/other-capability/mcp/server.mjs",
    "export const server = true;\n",
  );
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: !!js process.execPath
    args:
      - !!js process.cwd() + '/.agents/skills/other-capability/mcp/server.mjs'
    cwd: !!js process.cwd()
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server demo_server entrypoint must be a safe canonical POSIX path inside .agents/skills/demo-capability/",
    ),
  );
});

test("package MCP entrypoints reject Cordis expression injection characters", async (t) => {
  const injectedEntrypoint =
    ".agents/skills/demo-capability/mcp/' + process.exit(1) + '/server.mjs";
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: package
          entrypoint: "${injectedEntrypoint.replaceAll('"', '\\"')}"
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, injectedEntrypoint, "export const server = true;\n");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: !!js process.execPath
    args:
      - !!js process.cwd() + '/${injectedEntrypoint}'
    cwd: !!js process.cwd()
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server demo_server entrypoint must be a safe canonical POSIX path inside .agents/skills/demo-capability/",
    ),
  );
});

test("package MCP entrypoints accept canonical repository-local POSIX paths", async (t) => {
  const entrypoint =
    ".agents/skills/demo-capability/mcp-v2/server_test.v1.mjs";
  const root = await temporaryProject(t, packageEntrypointPolicy(entrypoint));
  await addTrackedSkill(root, "demo-capability");
  await write(root, entrypoint, "export const server = true;\n");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await writePackageMcpPreset(root, entrypoint);

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "pass", report.issues.join("\n"));
});

test("package MCP entrypoints reject unsafe or non-canonical path forms", async (t) => {
  const prefix = ".agents/skills/demo-capability/";
  const cases = [
    {
      name: "single quote expression escape",
      entrypoint: `${prefix}mcp/' + process.exit(1) + '/server.mjs`,
    },
    {
      name: "double quote",
      entrypoint: `${prefix}mcp/server".mjs`,
    },
    {
      name: "backslash separator",
      entrypoint: String.raw`${prefix}mcp\server.mjs`,
    },
    {
      name: "control character",
      entrypoint: `${prefix}mcp/server\t.mjs`,
    },
    {
      name: "absolute path",
      entrypoint: "/.agents/skills/demo-capability/mcp/server.mjs",
    },
    {
      name: "current-directory segment",
      entrypoint: `${prefix}mcp/./server.mjs`,
    },
    {
      name: "parent-directory segment",
      entrypoint: `${prefix}mcp/../server.mjs`,
    },
    {
      name: "empty segment",
      entrypoint: `${prefix}mcp//server.mjs`,
    },
    {
      name: "trailing separator",
      entrypoint: `${prefix}mcp/server.mjs/`,
    },
  ];
  const safeEntrypoint = `${prefix}mcp/server.mjs`;
  const expectedIssue =
    `demo-capability: MCP server demo_server entrypoint must be a safe ` +
    `canonical POSIX path inside ${prefix}`;

  for (const scenario of cases) {
    await t.test(scenario.name, async (caseTest) => {
      const root = await temporaryProject(
        caseTest,
        packageEntrypointPolicy(scenario.entrypoint),
      );
      await addTrackedSkill(root, "demo-capability");
      await write(root, safeEntrypoint, "export const server = true;\n");
      await write(
        root,
        "tests/demo.test.mjs",
        "export const checked = true;\n",
      );
      await writePackageMcpPreset(root, safeEntrypoint);

      const report = await auditCapabilityPackages({ projectRoot: root });

      assert.equal(report.status, "fail");
      assert(
        report.issues.includes(expectedIssue),
        `${scenario.name}: ${report.issues.join("\n")}`,
      );
    });
  }
});

test("package MCP launch arguments reject hidden non-string extras", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: package
          entrypoint: .agents/skills/demo-capability/mcp/server.mjs
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: mcp-annotations
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(
    root,
    ".agents/skills/demo-capability/mcp/server.mjs",
    "export const server = true;\n",
  );
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: !!js process.execPath
    args:
      - !!js process.cwd() + '/.agents/skills/demo-capability/mcp/server.mjs'
      - 123
    cwd: !!js process.cwd()
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server demo_server does not use its declared package entrypoint as the unique Node launch target",
    ),
  );
});

test("external MCP declarations cannot execute package-local code", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: external
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: reviewed-source
          effectEvidenceRef: docs/demo-review.md
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(root, "docs/demo-review.md", "# Reviewed source\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    command: node
    args:
      - .agents/skills/demo-capability/mcp/server.mjs
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: external MCP server demo_server unexpectedly executes package-local code",
    ),
  );
});

test("L1 execution requires an explicit Tool contract for every MCP server", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: external
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: reviewed-source
          tools: []
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability.execution.mcpServers[0].tools must be a non-empty array",
    ),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution must declare at least one Tool contract",
    ),
  );
});

test("L1 execution fails closed when its native Tool is absent from the Agent Preset", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers: []
      nativeTools:
        - name: missing_tool
          providerPlugin: "@example/missing-tool-provider"
          activation: always
          contractCheck: tests/demo.test.mjs
          effect: read-only
          effectEvidence: conservative-provider
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: native Tool missing_tool provider @example/missing-tool-provider is not declared in the Agent Preset",
    ),
  );
});

test("static tool-* Provider declarations do not require an auditor allowlist", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers: []
      nativeTools:
        - name: custom_tool
          providerPlugin: "@example/custom-tool-provider"
          activation: always
          contractCheck: tests/demo.test.mjs
          effect: workspace-write
          effectEvidence: conservative-provider
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    '- id: tool-custom\n  name: "@example/custom-tool-provider"\n',
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.scope, "static-declaration");
  assert.equal(report.status, "pass", report.issues.join("\n"));
});

test("ordinary Cordis plugins cannot impersonate native Tool Providers", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers: []
      nativeTools:
        - name: custom_tool
          providerPlugin: "@example/not-a-tool-provider"
          activation: always
          contractCheck: tests/demo.test.mjs
          effect: read-only
          effectEvidence: conservative-provider
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    '- id: persona\n  name: "@example/not-a-tool-provider"\n',
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: native Tool custom_tool provider @example/not-a-tool-provider is not declared in the Agent Preset",
    ),
  );
});

test("declared activation must match the Agent Preset condition", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: external
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: reviewed-source
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  disabled: true
  config:
    serverName: demo_server
    args: []
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server demo_server activation is opt-in in the Agent Preset, not always",
    ),
  );
});

test("Tool contracts reject unknown side-effect classes", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: external
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: reviewed-source
          tools:
            - name: mutate_demo
              effect: network-maybe
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability.execution.mcpServers[0].tools[0].effect must be one of read-only, workspace-write, external-write",
    ),
  );
});

test("Tool contracts reject unknown side-effect evidence", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: external
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: model-guess
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability.execution.mcpServers[0].effectEvidence must be one of mcp-annotations, reviewed-source",
    ),
  );
});

test("reviewed-source evidence requires a repository review artifact", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers:
        - name: demo_server
          source: external
          activation: always
          contractCheck: tests/demo.test.mjs
          effectEvidence: reviewed-source
          tools:
            - name: inspect_demo
              effect: read-only
      nativeTools: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    `- id: mcp-demo
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: demo_server
    args: []
`,
  );

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability.execution.mcpServers[0].effectEvidenceRef must be a non-empty project-relative path",
    ),
  );
});

test("local runners cannot satisfy the L1 execution boundary", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.1"
packages:
  - id: demo-capability
    level: L1
    execution:
      mcpServers: []
      nativeTools: []
      localRunners:
        - scripts/run.mjs
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "scripts/run.mjs", "export const run = true;\n");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability.execution.localRunners is not allowed; Agent execution must enter through a declared Tool",
    ),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution contains unsupported field localRunners",
    ),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution must declare at least one Tool contract",
    ),
  );
});

test("capability policy rejects the real v1.0 execution shape with migration guidance", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.0"
packages:
  - id: demo-capability
    level: L1
    execution:
      servers: []
      runners:
        - scripts/run.mjs
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "scripts/run.mjs", "export const run = true;\n");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes('policy.schemaVersion must equal "1.1"'),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution contains unsupported field servers",
    ),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution contains unsupported field runners",
    ),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution.servers was renamed to mcpServers in policy v1.1",
    ),
  );
  assert(
    report.issues.includes(
      "demo-capability.execution.runners is no longer an execution entry in policy v1.1; expose actions through a Tool Provider",
    ),
  );
});

test("failure reports retain the v1.1 report contract", async () => {
  const missingRoot = path.join(
    os.tmpdir(),
    `openquantum-missing-root-${Date.now()}`,
  );

  const report = await auditCapabilityPackages({ projectRoot: missingRoot });

  assert.equal(report.schemaVersion, "1.1");
  assert.equal(report.scope, "static-declaration");
  assert.equal(report.status, "fail");
});
