#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { quantumHardwareMcpIntegration } from "../src/settings/server/quantum-hardware-mcp.mjs";

export const QUANTUM_HARDWARE_MCP_SOURCE =
  quantumHardwareMcpIntegration.sourceUrl;
export const QUANTUM_HARDWARE_MCP_REVISION =
  quantumHardwareMcpIntegration.revision;
export const QUANTUM_HARDWARE_MCP_RELATIVE_ROOT =
  quantumHardwareMcpIntegration.relativeRoot;

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const REQUIRED_FILES = quantumHardwareMcpIntegration.requiredFiles;
const MARKER = ".openquantum-source.json";

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-16_384);
    });
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-16_384);
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(
        new Error(
          `${command} failed${signal ? ` with ${signal}` : ` with exit ${code ?? "unknown"}`}: ${stderr.trim() || stdout.trim()}`,
        ),
      );
    });
  });
}

async function assertRegularFile(filePath) {
  const info = await lstat(filePath);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`${filePath} must be a regular file`);
  }
}

async function assertDirectory(directoryPath) {
  const info = await lstat(directoryPath);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`${directoryPath} must be a regular directory`);
  }
}

export async function inspectQuantumHardwareMcp(
  root,
  {
    source = QUANTUM_HARDWARE_MCP_SOURCE,
    revision = QUANTUM_HARDWARE_MCP_REVISION,
  } = {},
) {
  const target = path.join(root, QUANTUM_HARDWARE_MCP_RELATIVE_ROOT);
  await assertDirectory(target);
  for (const relativeFile of REQUIRED_FILES) {
    await assertRegularFile(path.join(target, relativeFile));
  }
  const markerPath = path.join(target, MARKER);
  await assertRegularFile(markerPath);
  const marker = JSON.parse(await readFile(markerPath, "utf8"));
  if (
    marker?.schemaVersion !== "1.0" ||
    marker.source !== source ||
    marker.revision !== revision
  ) {
    throw new Error("Quantum Hardware MCP source marker does not match the pinned release");
  }
  return { target, source, revision };
}

export async function installQuantumHardwareMcp(
  root,
  {
    source = QUANTUM_HARDWARE_MCP_SOURCE,
    revision = QUANTUM_HARDWARE_MCP_REVISION,
    runGit = run,
  } = {},
) {
  const externalRoot = path.join(root, ".openquantum", "external");
  const target = path.join(root, QUANTUM_HARDWARE_MCP_RELATIVE_ROOT);
  await mkdir(externalRoot, { recursive: true, mode: 0o700 });

  try {
    return { ...(await inspectQuantumHardwareMcp(root, { source, revision })), status: "ready" };
  } catch (error) {
    let targetExists = true;
    try {
      await lstat(target);
    } catch (targetError) {
      if (targetError && typeof targetError === "object" && targetError.code === "ENOENT") {
        targetExists = false;
      } else {
        throw targetError;
      }
    }
    if (targetExists) {
      throw new Error(
        `Existing ${target} is not the pinned installation; move it aside before retrying`,
        { cause: error },
      );
    }
  }

  const temporary = await mkdtemp(path.join(externalRoot, ".quantum-hardware-mcp-"));
  try {
    await runGit("git", ["init", "--quiet"], temporary);
    await runGit("git", ["remote", "add", "origin", source], temporary);
    await runGit(
      "git",
      ["fetch", "--quiet", "--depth", "1", "origin", revision],
      temporary,
    );
    await runGit("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], temporary);
    const actualRevision = await runGit("git", ["rev-parse", "HEAD"], temporary);
    if (actualRevision !== revision) {
      throw new Error(`Fetched ${actualRevision}; expected ${revision}`);
    }
    for (const relativeFile of REQUIRED_FILES) {
      await assertRegularFile(path.join(temporary, relativeFile));
    }
    await writeFile(
      path.join(temporary, MARKER),
      `${JSON.stringify({ schemaVersion: "1.0", source, revision }, null, 2)}\n`,
      { flag: "wx", mode: 0o600 },
    );
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }

  return { ...(await inspectQuantumHardwareMcp(root, { source, revision })), status: "installed" };
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
