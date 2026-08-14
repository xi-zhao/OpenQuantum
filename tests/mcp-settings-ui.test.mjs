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
          credentialRef: null,
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
          credentialRef: "QISKIT_IBM_TOKEN",
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
  assert.match(markup, /启用前请先配置 IBM Quantum API Token/);
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
    credentialRef: credential.ref,
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
