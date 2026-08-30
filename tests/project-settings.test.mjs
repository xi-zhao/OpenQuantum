import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseDocument } from "yaml";

import * as projectSettings from "../src/settings/server/project-settings.mjs";
import { quantumHardwareMcpIntegration } from "../src/settings/server/quantum-hardware-mcp.mjs";

const {
  executeProjectSettingsCommand,
  ProjectSettingsConflictError,
  readProjectSettings,
} = projectSettings;

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, ".agents/skills/demo-skill"), { recursive: true });
  await mkdir(path.join(root, "runtime/openquantum/agent-presets/openquantum"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, ".agents/skills/demo-skill/SKILL.md"),
    `---\nname: demo-skill\ndescription: Demo scientific skill\n---\n\n# Demo\n`,
  );
  await writeFile(
    path.join(root, ".agents/skills/demo-skill/capability.yaml"),
    `schemaVersion: "1.0"\nid: demo-skill\nversion: 1.2.3\ndisplayName: Demo Skill\nmaturity:\n  status: stable\n`,
  );
  await writeFile(
    path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"),
    `- id: demo-mcp\n  name: '@deepseek-ai/dsh-mcp-client'\n  config:\n    serverName: demo_quantum\n    transport: stdio\n    command: !!js process.execPath\n    args:\n      - !!js process.cwd() + '/.agents/skills/demo-skill/mcp/server.mjs'\n    toolCallTimeoutMs: 60000\n    failOnStartupError: true\n    reconnect:\n      enabled: true\n      initialDelayMs: 500\n      maxDelayMs: 30000\n      maxAttempts: 10\n`,
  );
  return root;
}

test("project settings exposes one read projection and one command Interface", () => {
  assert.deepEqual(Object.keys(projectSettings).sort(), [
    "ProjectSettingsConflictError",
    "executeProjectSettingsCommand",
    "readProjectSettings",
  ]);
});

test("project settings exposes safe Skill and MCP projections", async (t) => {
  const root = await fixture(t);
  const snapshot = await readProjectSettings(root);

  assert.deepEqual(snapshot.skills, [
    {
      name: "demo-skill",
      displayName: "Demo Skill",
      description: "Demo scientific skill",
      version: "1.2.3",
      maturity: "stable",
      modelInvocable: true,
      userInvocable: true,
      managed: false,
      revision: snapshot.skills[0].revision,
    },
  ]);
  assert.deepEqual(snapshot.mcpServers, [
    {
      serverName: "demo_quantum",
      displayName: "demo_quantum",
      description: "项目 Agent preset 声明的 Harness 原生 MCP 服务。",
      provider: "Project",
      sourceUrl: null,
      packageName: null,
      packageVersion: null,
      credentialRefs: [],
      requiredCredentialRefs: [],
      setup: null,
      managed: false,
      transport: "stdio",
      target: "./.agents/skills/demo-skill/mcp/server.mjs",
      enabled: true,
      toolCallTimeoutMs: 60000,
      failOnStartupError: true,
      reconnect: {
        enabled: true,
        initialDelayMs: 500,
        maxDelayMs: 30000,
        maxAttempts: 10,
      },
    },
  ]);
  assert.deepEqual(snapshot.mcpCredentials, []);
  assert.match(snapshot.mcpRevision, /^[a-f0-9]{64}$/);
});

test("Skill invocation settings use revision CAS and official frontmatter", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const updated = await executeProjectSettingsCommand(root, {
    action: "skill.update",
    name: "demo-skill",
    revision: before.skills[0].revision,
    modelInvocable: false,
    userInvocable: false,
  });

  assert.equal(updated.skills[0].modelInvocable, false);
  assert.equal(updated.skills[0].userInvocable, false);
  const raw = await readFile(
    path.join(root, ".agents/skills/demo-skill/SKILL.md"),
    "utf8",
  );
  assert.match(raw, /disable-model-invocation: true/);
  assert.match(raw, /user-invocable: false/);
  await assert.rejects(
    executeProjectSettingsCommand(root, {
      action: "skill.update",
      name: "demo-skill",
      revision: before.skills[0].revision,
      modelInvocable: true,
      userInvocable: true,
    }),
    ProjectSettingsConflictError,
  );
});

test("legacy managed Skill removal stays recoverable without exposing a Skill authoring command", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".agents/skills/custom-quantum-flow"), { recursive: true });
  await writeFile(
    path.join(root, ".agents/skills/custom-quantum-flow/.openquantum-settings.json"),
    `${JSON.stringify({ schemaVersion: "1.0", kind: "openquantum-custom-skill", displayName: "Custom Quantum Flow" })}\n`,
  );
  await writeFile(
    path.join(root, ".agents/skills/custom-quantum-flow/SKILL.md"),
    "---\nname: custom-quantum-flow\ndescription: Use this Skill for a project-specific workflow; never for cloud execution.\ndisable-model-invocation: true\n---\n\n# Workflow\n",
  );
  const created = await readProjectSettings(root);
  const skill = created.skills.find((candidate) => candidate.name === "custom-quantum-flow");
  assert.equal(skill.managed, true);
  assert.equal(skill.displayName, "Custom Quantum Flow");
  assert.equal(skill.modelInvocable, false);
  assert.equal(skill.userInvocable, true);
  const raw = await readFile(
    path.join(root, ".agents/skills/custom-quantum-flow/SKILL.md"),
    "utf8",
  );
  assert.match(raw, /disable-model-invocation: true/);
  assert.match(raw, /never for cloud execution/);
  const removed = await executeProjectSettingsCommand(root, {
    action: "skill.remove",
    name: skill.name,
    revision: skill.revision,
  });
  assert.equal(removed.skills.some((candidate) => candidate.name === skill.name), false);
  const trash = await readdir(path.join(root, ".openquantum/trash/skills"));
  assert.equal(trash.some((entry) => entry.startsWith(`${skill.name}-`)), true);

  const builtin = created.skills.find((candidate) => candidate.name === "demo-skill");
  await assert.rejects(
    executeProjectSettingsCommand(root, {
      action: "skill.remove",
      name: builtin.name,
      revision: builtin.revision,
    }),
    /不能从设置中心移除/,
  );
});

test("MCP settings update only bounded Harness connection policy", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const updated = await executeProjectSettingsCommand(root, {
    action: "mcp.update",
    serverName: "demo_quantum",
    revision: before.mcpRevision,
    enabled: false,
    toolCallTimeoutMs: 90000,
    reconnect: {
      enabled: false,
      initialDelayMs: 750,
      maxDelayMs: 45000,
      maxAttempts: 7,
    },
  });
  assert.equal(updated.mcpServers[0].enabled, false);
  assert.equal(updated.mcpServers[0].toolCallTimeoutMs, 90000);
  assert.equal(updated.mcpServers[0].reconnect.maxAttempts, 7);

  const raw = await readFile(
    path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"),
    "utf8",
  );
  const value = parseDocument(raw).toJS();
  assert.equal(value[0].disabled, true);
  assert.equal(value[0].config.serverName, "demo_quantum");
  assert.equal(value[0].config.toolCallTimeoutMs, 90000);
  assert.equal(value[0].config.reconnect.enabled, false);
});

test("credentialed MCP entries use the same bounded settings Interface", async (t) => {
  const root = await fixture(t);
  const configPath = path.join(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
  );
  const original = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    `${original}\n- id: qiskit-runtime\n  name: ./credentialed-mcp-client.mjs\n  disabled: true\n  config:\n    serverName: qiskit_ibm_runtime\n    transport: stdio\n    command: uvx\n    args:\n      - --from\n      - qiskit-ibm-runtime-mcp-server==0.6.1\n      - qiskit-ibm-runtime-mcp-server\n    env: {}\n    credentialEnv:\n      QISKIT_IBM_TOKEN: QISKIT_IBM_TOKEN\n    toolCallTimeoutMs: 300000\n    failOnStartupError: true\n    reconnect:\n      enabled: true\n      initialDelayMs: 1000\n      maxDelayMs: 60000\n      maxAttempts: 10\n`,
  );
  const before = await readProjectSettings(root);
  assert.deepEqual(before.mcpCredentials, [
    {
      ref: "QISKIT_IBM_TOKEN",
      displayName: "IBM Quantum API Token",
      description:
        "供 IBM Runtime、IBM Transpiler 与可选硬件 MCP 共用；密钥只保存在 Harness 凭据库。",
      documentationUrl: "https://quantum.ibm.com/account",
      serverNames: ["qiskit_ibm_runtime"],
    },
  ]);

  await assert.rejects(
    executeProjectSettingsCommand(
      root,
      {
        action: "mcp.update",
        serverName: "qiskit_ibm_runtime",
        revision: before.mcpRevision,
        enabled: true,
        toolCallTimeoutMs: 180000,
        reconnect: {
          enabled: true,
          initialDelayMs: 1500,
          maxDelayMs: 45000,
          maxAttempts: 8,
        },
      },
      {
        credentials: {
          async describe() {
            return { configured: false, writable: true };
          },
        },
      },
    ),
    /请先配置必需凭据：QISKIT_IBM_TOKEN/,
  );
  await executeProjectSettingsCommand(
    root,
    {
      action: "mcp.update",
      serverName: "qiskit_ibm_runtime",
      revision: before.mcpRevision,
      enabled: true,
      toolCallTimeoutMs: 180000,
      reconnect: {
        enabled: true,
        initialDelayMs: 1500,
        maxDelayMs: 45000,
        maxAttempts: 8,
      },
    },
    {
      credentials: {
        async describe(ref) {
          assert.equal(ref, "QISKIT_IBM_TOKEN");
          return { configured: true, writable: true };
        },
      },
    },
  );
  const value = parseDocument(await readFile(configPath, "utf8")).toJS();
  assert.equal(value[1].disabled, undefined);
  assert.equal(value[1].config.serverName, "qiskit_ibm_runtime");
  assert.equal(value[1].config.credentialEnv.QISKIT_IBM_TOKEN, "QISKIT_IBM_TOKEN");
  assert.equal(value[1].config.toolCallTimeoutMs, 180000);
});

test("hardware MCP setup state is bound to the reviewed local source", async (t) => {
  const root = await fixture(t);
  const configPath = path.join(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
  );
  const original = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    `${original}\n- id: quantum-hardware\n  name: ./credentialed-mcp-client.mjs\n  disabled: true\n  config:\n    serverName: quantum_hardware\n    transport: stdio\n    command: uv\n    args:\n      - run\n      - --with-requirements\n      - !!js process.cwd() + '/.openquantum/external/quantum-hardware-mcp/requirements.txt'\n      - python\n      - !!js process.cwd() + '/.openquantum/external/quantum-hardware-mcp/server.py'\n    credentialEnv:\n      IBM_QUANTUM_TOKEN: QISKIT_IBM_TOKEN\n`,
  );

  const missing = await readProjectSettings(root);
  const missingServer = missing.mcpServers.find(
    (server) => server.serverName === "quantum_hardware",
  );
  assert.equal(missingServer?.setup?.status, "required");
  assert.equal(
    missingServer?.target,
    "./.openquantum/external/quantum-hardware-mcp/server.py",
  );
  await assert.rejects(
    executeProjectSettingsCommand(
      root,
      {
        action: "mcp.update",
        serverName: "quantum_hardware",
        revision: missing.mcpRevision,
        enabled: true,
        toolCallTimeoutMs: missingServer.toolCallTimeoutMs,
        reconnect: missingServer.reconnect,
      },
      {
        credentials: {
          async describe() {
            return { configured: true, writable: true };
          },
        },
      },
    ),
    /固定版本源码尚未就绪/,
  );

  const sourceRoot = path.join(root, quantumHardwareMcpIntegration.relativeRoot);
  await mkdir(sourceRoot, { recursive: true });
  for (const fileName of quantumHardwareMcpIntegration.requiredFiles) {
    await writeFile(path.join(sourceRoot, fileName), `${fileName}\n`);
  }
  await writeFile(
    path.join(sourceRoot, ".openquantum-source.json"),
    `${JSON.stringify({
      schemaVersion: "1.0",
      source: quantumHardwareMcpIntegration.sourceUrl,
      revision: quantumHardwareMcpIntegration.revision,
    })}\n`,
  );

  const ready = await readProjectSettings(root);
  assert.equal(
    ready.mcpServers.find(
      (server) => server.serverName === "quantum_hardware",
    )?.setup?.status,
    "ready",
  );
});

test("custom stdio MCP is registered disabled with a dynamic credential and can be removed", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const created = await executeProjectSettingsCommand(root, {
    action: "mcp.register",
    revision: before.mcpRevision,
    serverName: "community_quantum",
    transport: "stdio",
    command: "uvx",
    args: ["--from", "community-quantum-mcp==1.2.3", "community-quantum-mcp"],
    credentialRef: "COMMUNITY_QUANTUM_TOKEN",
  });
  const server = created.mcpServers.find(
    (candidate) => candidate.serverName === "community_quantum",
  );
  assert.equal(server.enabled, false);
  assert.equal(server.managed, true);
  assert.equal(server.failOnStartupError, false);
  assert.deepEqual(server.credentialRefs, ["COMMUNITY_QUANTUM_TOKEN"]);
  assert.deepEqual(server.requiredCredentialRefs, ["COMMUNITY_QUANTUM_TOKEN"]);
  assert.equal(server.setup, null);
  assert.deepEqual(created.mcpCredentials.find(
    (credential) => credential.ref === "COMMUNITY_QUANTUM_TOKEN",
  ), {
    ref: "COMMUNITY_QUANTUM_TOKEN",
    displayName: "COMMUNITY_QUANTUM_TOKEN",
    description: "供自定义 MCP 使用的 Harness 安全凭据。",
    documentationUrl: null,
    serverNames: ["community_quantum"],
  });
  const raw = await readFile(
    path.join(root, "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml"),
    "utf8",
  );
  assert.match(raw, /id: mcp-user-community_quantum/);
  assert.match(raw, /name: \.\/credentialed-mcp-client\.mjs/);
  assert.match(raw, /cwd: !!js process\.cwd\(\)/);
  assert.equal(raw.includes("COMMUNITY_QUANTUM_TOKEN: secret"), false);

  const removed = await executeProjectSettingsCommand(root, {
    action: "mcp.remove",
    serverName: server.serverName,
    revision: created.mcpRevision,
  });
  assert.equal(
    removed.mcpServers.some((candidate) => candidate.serverName === server.serverName),
    false,
  );
});

test("custom HTTP MCP accepts HTTP(S) endpoints without embedded credentials", async (t) => {
  const root = await fixture(t);
  const before = await readProjectSettings(root);
  const created = await executeProjectSettingsCommand(root, {
    action: "mcp.register",
    revision: before.mcpRevision,
    serverName: "public_remote",
    transport: "streamable-http",
    url: "https://example.com/mcp",
  });
  const server = created.mcpServers.find((candidate) => candidate.serverName === "public_remote");
  assert.equal(server.transport, "streamable-http");
  assert.equal(server.target, "https://example.com/mcp");
  assert.equal(server.managed, true);

  await assert.rejects(
    executeProjectSettingsCommand(root, {
      action: "mcp.register",
      revision: created.mcpRevision,
      serverName: "private_remote",
      transport: "streamable-http",
      url: "https://token@example.com/mcp",
    }),
    /无内嵌凭据/,
  );
});

test("repository preset exposes reviewed quantum MCPs with safe defaults", async () => {
  const snapshot = await readProjectSettings(process.cwd());
  const byName = new Map(snapshot.mcpServers.map((server) => [server.serverName, server]));

  assert.equal(byName.get("qiskit")?.enabled, true);
  assert.equal(byName.get("qiskit")?.packageVersion, "0.3.1");
  assert.equal(byName.get("qiskit_docs")?.enabled, true);
  assert.equal(byName.get("qiskit_docs")?.packageVersion, "0.3.0");
  assert.equal(byName.get("qiskit_ibm_runtime")?.enabled, false);
  assert.equal(byName.get("qiskit_ibm_transpiler")?.enabled, false);
  assert.equal(byName.get("qiskit_gym")?.enabled, false);
  assert.equal(byName.get("quantum_hardware")?.enabled, false);
  assert.ok(
    ["ready", "required"].includes(
      byName.get("quantum_hardware")?.setup?.status,
    ),
  );
  assert.equal(byName.get("qpanda_runtime")?.enabled, false);
  assert.equal(byName.get("qpanda_runtime")?.provider, "OriginQ / 本源量子");
  assert.deepEqual(byName.get("qpanda_runtime")?.requiredCredentialRefs, [
    "QPANDA3_API_KEY",
  ]);
  assert.deepEqual(byName.get("qpanda_runtime")?.credentialRefs, [
    "QPANDA3_API_KEY",
  ]);
  assert.ok(
    ["ready", "required"].includes(
      byName.get("qpanda_runtime")?.setup?.status,
    ),
  );
  assert.deepEqual(byName.get("quantum_hardware")?.requiredCredentialRefs, [
    "QISKIT_IBM_TOKEN",
  ]);
  assert.deepEqual(byName.get("quantum_hardware")?.credentialRefs, [
    "QISKIT_IBM_TOKEN",
    "IONQ_API_KEY",
  ]);
  assert.equal(byName.get("openquantum_quantum")?.enabled, true);
  assert.equal(byName.get("fieldqkit")?.enabled, true);
  assert.equal(byName.get("fieldqkit")?.packageVersion, "0.1.2@3ef2493");
  assert.deepEqual(byName.get("fieldqkit")?.requiredCredentialRefs, []);
  assert.deepEqual(byName.get("fieldqkit")?.credentialRefs, [
    "QUAFU_API_TOKEN",
    "TIANYAN_API_TOKEN",
    "GUODUN_API_TOKEN",
    "TENCENT_API_TOKEN",
    "ORIGIN_API_TOKEN",
    "FIELDQUANTUM_API_TOKEN",
    "LOGICALQUBIT_API_TOKEN",
  ]);
  assert.equal(byName.get("toqito_audit")?.enabled, true);
  assert.equal(byName.get("toqito_audit")?.displayName, "量子信息审计");
  assert.equal(byName.get("toqito_audit")?.packageVersion, "1.3.1");
  assert.equal(byName.get("toqito_audit")?.provider, "toqito / OpenQuantum");
  assert.deepEqual(byName.get("toqito_audit")?.credentialRefs, []);
  assert.equal(byName.get("qcec_local")?.enabled, true);
  assert.equal(byName.get("qcec_local")?.displayName, "量子电路等价性验证");
  assert.equal(byName.get("qcec_local")?.packageVersion, "3.7.0");
  assert.equal(byName.get("qcec_local")?.provider, "MQT / OpenQuantum");
  assert.deepEqual(byName.get("qcec_local")?.credentialRefs, []);
  assert.equal(byName.get("qec_local")?.enabled, true);
  assert.equal(byName.get("qec_local")?.displayName, "QEC Memory 实验");
  assert.equal(byName.get("qec_local")?.packageVersion, "1.16.0 + 2.4.0");
  assert.equal(
    byName.get("qec_local")?.provider,
    "Stim / PyMatching / OpenQuantum",
  );
  assert.deepEqual(byName.get("qec_local")?.credentialRefs, []);
  assert.equal(byName.get("tyxonq_local")?.enabled, false);
  assert.equal(byName.get("tyxonq_local")?.displayName, "TyxonQ Local");
  assert.equal(byName.get("tyxonq_local")?.packageVersion, "1.2.0");
  assert.equal(byName.get("tyxonq_local")?.provider, "TyxonQ / OpenQuantum");
  assert.deepEqual(byName.get("tyxonq_local")?.credentialRefs, []);
  assert.equal(byName.get("qmclaw_local")?.enabled, true);
  assert.equal(byName.get("qmclaw_local")?.displayName, "QMClaw 超导测控");
  assert.equal(
    byName.get("qmclaw_local")?.packageVersion,
    "0.1.0@18d7fa1",
  );
  assert.equal(
    byName.get("qmclaw_local")?.provider,
    "QMClaw / OpenQuantum",
  );
  assert.deepEqual(byName.get("qmclaw_local")?.credentialRefs, []);
  assert.equal(byName.get("qpanda_qubo")?.enabled, true);
  assert.equal(byName.get("qpanda_qubo")?.displayName, "QPanda QUBO 建模与求解");
  assert.equal(byName.get("qpanda_qubo")?.packageVersion, "2.0.0");
  assert.deepEqual(byName.get("qpanda_qubo")?.credentialRefs, []);
  assert.deepEqual(snapshot.mcpCredentials.find(
    (credential) => credential.ref === "QISKIT_IBM_TOKEN",
  )?.serverNames, [
    "qiskit_ibm_runtime",
    "qiskit_ibm_transpiler",
    "quantum_hardware",
  ]);
  assert.deepEqual(snapshot.mcpCredentials.find(
    (credential) => credential.ref === "QUAFU_API_TOKEN",
  )?.serverNames, ["fieldqkit"]);
  assert.deepEqual(snapshot.mcpCredentials.find(
    (credential) => credential.ref === "QPANDA3_API_KEY",
  )?.serverNames, ["qpanda_runtime"]);
  assert.equal(
    snapshot.skills.find((skill) => skill.name === "fieldqkit-hardware")
      ?.displayName,
    "FieldQKit 量子硬件",
  );
  assert.equal(
    snapshot.skills.find((skill) => skill.name === "tyxonq-workbench")
      ?.displayName,
    "TyxonQ 本地仿真",
  );
  assert.equal(
    snapshot.skills.find((skill) => skill.name === "qmclaw-workbench")
      ?.displayName,
    "QMClaw 超导测控",
  );

  const raw = await readFile(
    path.join(
      process.cwd(),
      "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    ),
    "utf8",
  );
  assert.equal(raw.includes("your_ibm_quantum_token"), false);
  assert.match(raw, /qiskit-mcp-server==0\.3\.1/);
  assert.match(raw, /qec-memory-experiment\/mcp\/server\.mjs/);
  assert.match(raw, /qiskit-docs-mcp-server==0\.3\.0/);
  assert.match(raw, /fieldqkit-hardware\/mcp\/server\.mjs/);
  assert.match(raw, /quantum-information-audit\/mcp\/server\.mjs/);
  assert.match(raw, /quantum-circuit-verification\/mcp\/server\.mjs/);
  assert.match(raw, /tyxonq-workbench\/mcp\/server\.mjs/);
  assert.match(raw, /qmclaw-workbench\/mcp\/server\.mjs/);
});

test("project settings rejects a symlinked Skill file", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".agents/skills/linked-skill"));
  await symlink(
    path.join(root, ".agents/skills/demo-skill/SKILL.md"),
    path.join(root, ".agents/skills/linked-skill/SKILL.md"),
  );
  await assert.rejects(readProjectSettings(root), /普通文件/);
});

test("mounted upstream pyqpanda3 skill loads under its upstream name", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".agents/skills/pyqpanda3"), { recursive: true });
  // Mirror the shape of the pinned OriginQ SKILL.md frontmatter: a quoted long
  // description with CJK and parentheses, an extra `license` field, and a
  // trailing comment line. This guards our strict YAML loader against the exact
  // upstream file that the setup command checks out as-is.
  await writeFile(
    path.join(root, ".agents/skills/pyqpanda3/SKILL.md"),
    [
      "---",
      "name: pyqpanda3",
      'description: "Use when user asks about pyqpanda3 programming, 量子计算编程, QAOA, VQE, QSVM, or 本源量子云 (QCloud). Triggers on: 量子编程, pyqpanda3."',
      "license: Apache License 2.0",
      "# keywords: quantum, pyqpanda3, qaoa, vqe",
      "---",
      "",
      "# pyqpanda3 skill body",
      "",
    ].join("\n"),
  );
  // The checkout also drops a source marker file into the skill directory; it
  // must not be mistaken for a skill and must not break the projection.
  await writeFile(
    path.join(root, ".agents/skills/pyqpanda3/.openquantum-source.json"),
    `${JSON.stringify({ schemaVersion: "1.0", source: "s", revision: "r" })}\n`,
  );

  const snapshot = await readProjectSettings(root);
  const skill = snapshot.skills.find((candidate) => candidate.name === "pyqpanda3");
  assert.ok(skill, "pyqpanda3 skill should be projected");
  assert.equal(skill.managed, false);
  assert.match(skill.description, /pyqpanda3 programming/);
});
