#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parseDocument } from "yaml";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const presetPath = path.join(
  projectRoot,
  "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
);
const EXPECTED_TOOLS = Object.freeze({
  qiskit: Object.freeze([
    "transpile_circuit_tool",
    "analyze_circuit_tool",
    "compare_optimization_levels_tool",
    "load_circuit_from_qasm_tool",
    "export_circuit_to_qasm_tool",
    "convert_qpy_to_qasm3_tool",
    "convert_qasm3_to_qpy_tool",
  ]),
  qiskit_docs: Object.freeze([
    "search_docs_tool",
    "get_page_tool",
    "lookup_error_code_tool",
  ]),
});

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
      .filter((config) => EXPECTED_TOOLS[config?.serverName])
      .map((config) => [config.serverName, config]),
  );
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
    const missing = EXPECTED_TOOLS[serverName].filter((name) => !names.includes(name));
    if (missing.length > 0) {
      throw new Error(`${serverName} is missing tools: ${missing.join(", ")}`);
    }
    return {
      serverName,
      command: [config.command, ...config.args].join(" "),
      status: "ready",
      tools: names,
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
  for (const serverName of Object.keys(EXPECTED_TOOLS)) {
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
