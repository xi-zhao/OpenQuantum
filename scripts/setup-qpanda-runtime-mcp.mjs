#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { qpandaRuntimeMcpIntegration } from "../src/settings/server/qpanda-runtime-mcp.mjs";
import { installPinnedSource, inspectPinnedSource } from "./lib/install-pinned-source.mjs";

export const QPANDA_RUNTIME_MCP_SOURCE = qpandaRuntimeMcpIntegration.sourceUrl;
export const QPANDA_RUNTIME_MCP_REVISION = qpandaRuntimeMcpIntegration.revision;
export const QPANDA_RUNTIME_MCP_RELATIVE_ROOT = qpandaRuntimeMcpIntegration.relativeRoot;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export function inspectQpandaRuntimeMcp(root, options = {}) {
  return inspectPinnedSource(root, qpandaRuntimeMcpIntegration, options);
}

export function installQpandaRuntimeMcp(root, options = {}) {
  return installPinnedSource(root, qpandaRuntimeMcpIntegration, options);
}

async function main() {
  const result = await installQpandaRuntimeMcp(projectRoot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(
    "Source is installed but disabled. Configure QPANDA3_API_KEY in Settings, then enable the MCP and restart Harness. " +
      "The first tool call builds the pinned pyproject environment via uv; pyqpanda3 is a native wheel and needs Python 3.10–3.13.\n",
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
