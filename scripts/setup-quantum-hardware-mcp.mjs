#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { quantumHardwareMcpIntegration } from "../src/settings/server/quantum-hardware-mcp.mjs";
import { installPinnedSource, inspectPinnedSource } from "./lib/install-pinned-source.mjs";

export const QUANTUM_HARDWARE_MCP_SOURCE = quantumHardwareMcpIntegration.sourceUrl;
export const QUANTUM_HARDWARE_MCP_REVISION = quantumHardwareMcpIntegration.revision;
export const QUANTUM_HARDWARE_MCP_RELATIVE_ROOT = quantumHardwareMcpIntegration.relativeRoot;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export function inspectQuantumHardwareMcp(root, options = {}) {
  return inspectPinnedSource(root, quantumHardwareMcpIntegration, options);
}

export function installQuantumHardwareMcp(root, options = {}) {
  return installPinnedSource(root, quantumHardwareMcpIntegration, options);
}

async function main() {
  const result = await installQuantumHardwareMcp(projectRoot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(
    "Source is installed but disabled. Configure the required IBM credential in Settings, then enable the MCP and restart Harness.\n",
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
