import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { McpSettingsSection } from "../src/components/openquantum/settings/McpSettingsSection";

const reconnect = {
  enabled: true,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxAttempts: 10,
};

test("MCP settings presents official Qiskit defaults and redacted IBM credentials", () => {
  const markup = renderToStaticMarkup(
    createElement(McpSettingsSection, {
      revision: "a".repeat(64),
      savingKey: null,
      onSave: () => {},
      credentials: [
        {
          ref: "QISKIT_IBM_TOKEN",
          displayName: "IBM Quantum API Token",
          description: "Shared token",
          documentationUrl: "https://quantum.ibm.com/account",
          serverNames: ["qiskit_ibm_runtime"],
          configured: false,
          writable: true,
        },
      ],
      servers: [
        {
          serverName: "qiskit",
          displayName: "Qiskit Circuits",
          description: "Official circuit tools",
          provider: "Qiskit",
          sourceUrl: "https://github.com/Qiskit/mcp-servers",
          packageName: "qiskit-mcp-server",
          packageVersion: "0.3.1",
          credentialRefs: [],
          requiredCredentialRefs: [],
          setup: null,
          managed: false,
          transport: "stdio",
          target: "uvx --from qiskit-mcp-server==0.3.1 qiskit-mcp-server",
          enabled: true,
          toolCallTimeoutMs: 120000,
          failOnStartupError: true,
          reconnect,
        },
        {
          serverName: "qiskit_ibm_runtime",
          displayName: "IBM Quantum Runtime",
          description: "Official cloud runtime",
          provider: "Qiskit / IBM Quantum",
          sourceUrl: "https://github.com/Qiskit/mcp-servers",
          packageName: "qiskit-ibm-runtime-mcp-server",
          packageVersion: "0.6.1",
          credentialRefs: ["QISKIT_IBM_TOKEN"],
          requiredCredentialRefs: ["QISKIT_IBM_TOKEN"],
          setup: null,
          managed: false,
          transport: "stdio",
          target: "uvx qiskit-ibm-runtime-mcp-server",
          enabled: false,
          toolCallTimeoutMs: 300000,
          failOnStartupError: true,
          reconnect,
        },
      ],
    }),
  );

  assert.match(markup, /Qiskit Circuits/);
  assert.match(markup, /IBM Quantum Runtime/);
  assert.match(markup, /Token 未配置/);
  assert.match(markup, /IBM Quantum API Token · 必需 · 未配置/);
  assert.match(markup, /type="password"/);
  assert.equal(markup.includes("secret"), false);
});

test("MCP settings blocks shared token removal while a cloud consumer is enabled", () => {
  const credential = {
    ref: "QISKIT_IBM_TOKEN",
    displayName: "IBM Quantum API Token",
    description: "Shared token",
    documentationUrl: "https://quantum.ibm.com/account",
    serverNames: ["qiskit_ibm_runtime"],
    configured: true,
    writable: true,
  };
  const server = {
    serverName: "qiskit_ibm_runtime",
    displayName: "IBM Quantum Runtime",
    description: "Official cloud runtime",
    provider: "Qiskit / IBM Quantum",
    sourceUrl: "https://github.com/Qiskit/mcp-servers",
    packageName: "qiskit-ibm-runtime-mcp-server",
    packageVersion: "0.6.1",
    credentialRefs: [credential.ref],
    requiredCredentialRefs: [credential.ref],
    setup: null,
    managed: false,
    transport: "stdio",
    target: "uvx qiskit-ibm-runtime-mcp-server",
    enabled: true,
    toolCallTimeoutMs: 300000,
    failOnStartupError: true,
    reconnect,
  };
  const markup = renderToStaticMarkup(
    createElement(McpSettingsSection, {
      revision: "a".repeat(64),
      savingKey: null,
      onSave: () => {},
      credentials: [credential],
      servers: [server],
    }),
  );

  assert.match(markup, /请先停用 IBM Quantum Runtime，再移除共享 Token/);
  assert.match(markup, /移除已保存的 Token/);
});

test("MCP settings exposes registration and guarded removal for project entries", () => {
  const markup = renderToStaticMarkup(
    createElement(McpSettingsSection, {
      revision: "c".repeat(64),
      savingKey: null,
      onSave: () => {},
      credentials: [],
      servers: [
        {
          serverName: "community_quantum",
          displayName: "community_quantum",
          description: "Project MCP",
          provider: "Project",
          sourceUrl: null,
          packageName: null,
          packageVersion: null,
          credentialRefs: [],
          requiredCredentialRefs: [],
          setup: null,
          managed: true,
          transport: "stdio",
          target: "uvx community-mcp",
          enabled: false,
          toolCallTimeoutMs: 60000,
          failOnStartupError: false,
          reconnect,
        },
      ],
    }),
  );

  assert.match(markup, /注册已有 MCP Server/);
  assert.match(markup, /不下载、安装或创建 MCP Server/);
  assert.match(markup, /PROJECT/);
  assert.match(markup, />移除</);
});

test("MCP settings presents hardware setup, required IBM, and optional IonQ credentials", () => {
  const credentials = [
    {
      ref: "QISKIT_IBM_TOKEN",
      displayName: "IBM Quantum API Token",
      description: "IBM",
      documentationUrl: "https://quantum.ibm.com/account",
      serverNames: ["quantum_hardware"],
      configured: false,
      writable: true,
    },
    {
      ref: "IONQ_API_KEY",
      displayName: "IonQ API Key",
      description: "IonQ",
      documentationUrl: "https://cloud.ionq.com/",
      serverNames: ["quantum_hardware"],
      configured: false,
      writable: true,
    },
  ];
  const markup = renderToStaticMarkup(
    createElement(McpSettingsSection, {
      revision: "d".repeat(64),
      savingKey: null,
      onSave: () => {},
      credentials,
      servers: [
        {
          serverName: "quantum_hardware",
          displayName: "Quantum Hardware MCP",
          description: "Real QPU control",
          provider: "Community",
          sourceUrl: "https://github.com/Lokesh-2025/quantum-hardware-mcp",
          packageName: "quantum-hardware-mcp",
          packageVersion: "13fbe9f13fd6",
          credentialRefs: credentials.map((credential) => credential.ref),
          requiredCredentialRefs: ["QISKIT_IBM_TOKEN"],
          setup: {
            status: "required",
            message: "尚未安装本地源码；安装完成前不能启用此 MCP。",
            command: "npm run mcp:quantum-hardware:setup",
          },
          managed: false,
          transport: "stdio",
          target: "./.openquantum/external/quantum-hardware-mcp/server.py",
          enabled: false,
          toolCallTimeoutMs: 600000,
          failOnStartupError: true,
          reconnect,
        },
      ],
    }),
  );

  assert.match(markup, /Quantum Hardware MCP/);
  assert.match(markup, /npm run mcp:quantum-hardware:setup/);
  assert.match(markup, /IBM Quantum API Token · 必需 · 未配置/);
  assert.match(markup, /IonQ API Key · 可选 · 未配置/);
});
