#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parseDocument } from "yaml";

import { readDeclaredMcpToolContract } from "./lib/capability-tool-contract.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const presetPath = path.join(
  projectRoot,
  "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
);
const TOOL_CONTRACTS = Object.freeze(
  Object.fromEntries(
    ["qiskit", "qiskit_docs"].map((serverName) => [
      serverName,
      readDeclaredMcpToolContract({
        projectRoot,
        capabilityId: "qiskit-circuit-workbench",
        serverName,
      }),
    ]),
  ),
);

function serverConfigs() {
  const document = parseDocument(fs.readFileSync(presetPath, "utf8"), {
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) throw document.errors[0];
  const entries = document.toJS();
  if (!Array.isArray(entries)) throw new Error("Agent preset must be a list");
  return new Map(
    entries
      .map((entry) => entry?.config)
      .filter((config) => TOOL_CONTRACTS[config?.serverName])
      .map((config) => [config.serverName, config]),
  );
}

function verifyEffect(serverName, contract, actual) {
  if (contract.effect !== "read-only") {
    throw new Error(
      `${serverName}.${contract.name} uses unsupported probe effect ${contract.effect}`,
    );
  }
  if (contract.effectEvidence === "mcp-annotations") {
    if (
      actual.annotations?.readOnlyHint !== true ||
      actual.annotations?.destructiveHint === true
    ) {
      throw new Error(
        `${serverName}.${contract.name} does not prove read-only annotations: ${JSON.stringify(actual.annotations ?? null)}`,
      );
    }
    return;
  }
  if (contract.effectEvidence !== "reviewed-source") {
    throw new Error(
      `${serverName}.${contract.name} uses unsupported effect evidence ${contract.effectEvidence}`,
    );
  }
  if (
    actual.annotations?.readOnlyHint === false ||
    actual.annotations?.destructiveHint === true
  ) {
    throw new Error(
      `${serverName}.${contract.name} annotations contradict its reviewed-source read-only contract: ${JSON.stringify(actual.annotations)}`,
    );
  }
}

async function inspectServer(serverName, config) {
  let stderr = "";
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    cwd: projectRoot,
    stderr: "pipe",
  });
  transport.stderr?.on("data", (chunk) => {
    stderr = `${stderr}${chunk.toString("utf8")}`.slice(-16_384);
  });
  const client = new Client(
    { name: `openquantum-${serverName}-probe`, version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport, {
      timeout: 180_000,
      maxTotalTimeout: 180_000,
    });
    const tools = (await client.listTools(undefined, { timeout: 30_000 })).tools;
    const names = tools.map((tool) => tool.name);
    const expectedNames = TOOL_CONTRACTS[serverName].map((tool) => tool.name);
    const missing = expectedNames.filter((name) => !names.includes(name));
    const unexpected = names.filter(
      (name) => !expectedNames.includes(name),
    );
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `${serverName} Tool contract mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`,
      );
    }
    for (const contract of TOOL_CONTRACTS[serverName]) {
      verifyEffect(
        serverName,
        contract,
        tools.find((tool) => tool.name === contract.name),
      );
    }
    return {
      serverName,
      command: [config.command, ...config.args].join(" "),
      status: "ready",
      tools: TOOL_CONTRACTS[serverName].map((contract) => ({
        name: contract.name,
        effect: contract.effect,
        effectEvidence: contract.effectEvidence,
        effectEvidenceRef: contract.effectEvidenceRef,
        annotations: tools.find((tool) => tool.name === contract.name).annotations,
      })),
    };
  } catch (error) {
    const detail = stderr.trim() ? `\nServer stderr:\n${stderr.trim()}` : "";
    throw new Error(
      `${serverName} probe failed: ${error instanceof Error ? error.message : String(error)}${detail}`,
    );
  } finally {
    await client.close().catch(() => undefined);
  }
}

async function main() {
  const configs = serverConfigs();
  const results = [];
  for (const serverName of Object.keys(TOOL_CONTRACTS)) {
    const config = configs.get(serverName);
    if (!config) throw new Error(`Preset is missing ${serverName}`);
    results.push(await inspectServer(serverName, config));
  }
  process.stdout.write(
    `${JSON.stringify({ schemaVersion: "1.0", source: "Qiskit/mcp-servers", results }, null, 2)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
