import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { Context } from "@deepseek-ai/cordis";
import * as mcpClient from "@deepseek-ai/dsh-mcp-client";
import { SystemPrompt } from "@deepseek-ai/dsh-system-prompt";
import { ToolRuntime } from "@deepseek-ai/dsh-tools";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const toolName = "mcp__qec_cancellation_test__run_qec_memory_experiment";

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

async function waitFor(read, message) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (result) return result;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await delay(20);
  }
  assert.fail(message);
}

function stubSource(pidsPath) {
  return `#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const { request } = JSON.parse(Buffer.concat(chunks));
if (request.seed === 1) {
  const child = spawn(process.execPath, ["-e", "process.send('ready'); setInterval(() => {}, 1000)"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  child.once("message", () => writeFileSync(${JSON.stringify(pidsPath)}, JSON.stringify({ parent: process.pid, child: child.pid })));
  setInterval(() => {}, 1000);
} else {
  const canonical = JSON.stringify(Object.fromEntries(Object.keys(request).sort().map((key) => [key, request[key]])));
  process.stdout.write(JSON.stringify({
    packages: { stim: "test-fixture", pymatching: "test-fixture" },
    experiment: request,
    experimentDigest: createHash("sha256").update(canonical).digest("hex"),
    result: {
      shots: request.shots,
      logicalErrors: 0,
      successfulShots: request.shots,
      logicalErrorRate: 0,
      wilson95: { low: 0, high: 0.04 },
    },
  }));
}
`;
}

test("Harness cancellation reaches the QEC computation tree and preserves the MCP connection", {
  // The executable PATH shim exercises POSIX process groups; Windows tree
  // termination belongs to the shared process-runner tests.
  skip: process.platform === "win32" ? "POSIX executable uv fixture" : false,
  timeout: 20000,
}, async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openquantum-harness-cancel-"));
  const pidsPath = path.join(directory, "pids.json");
  const fibers = [];
  const controller = new AbortController();
  t.after(async () => {
    controller.abort();
    for (const fiber of fibers.toReversed()) await fiber.dispose();
    try {
      const pids = JSON.parse(await readFile(pidsPath, "utf8"));
      for (const pid of Object.values(pids)) {
        if (isRunning(pid)) process.kill(pid, "SIGKILL");
      }
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ESRCH") throw error;
    }
    await rm(directory, { recursive: true, force: true });
  });
  await writeFile(path.join(directory, "uv"), stubSource(pidsPath), { mode: 0o700 });

  const context = new Context();
  fibers.push(await context.plugin(SystemPrompt, {}));
  fibers.push(await context.plugin(ToolRuntime, { mode: "native" }));
  fibers.push(await context.plugin(mcpClient, {
    serverName: "qec_cancellation_test",
    transport: "stdio",
    command: process.execPath,
    args: [path.join(projectRoot, ".agents/skills/qec-memory-experiment/mcp/server.mjs")],
    cwd: directory,
    env: { PATH: `${directory}${path.delimiter}${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}` },
    toolCallTimeoutMs: 10000,
    failOnStartupError: true,
    reconnect: { enabled: false },
  }));

  const request = {
    basis: "z", distance: 3, rounds: 1, shots: 100,
    physicalErrorRate: 0, seed: 1,
  };
  const pending = context.tools.execute({
    callId: "cancel-qec",
    name: toolName,
    arguments: request,
    signal: controller.signal,
  });
  const pids = await waitFor(async () => JSON.parse(await readFile(pidsPath, "utf8")), "QEC fixture never started");
  assert.ok(Object.values(pids).every(isRunning), "both owned processes must be running before cancellation");
  controller.abort();
  const cancelled = await pending;
  assert.equal(cancelled.isError, true);
  assert.match(cancelled.error.message, /abort|cancel/i);
  // MCP cancellation is a notification; its client-side rejection can precede
  // the server receiving it. Wait for bounded server-side cleanup as well.
  await waitFor(() => Object.values(pids).every((pid) => !isRunning(pid)), "cancelled QEC computation left an owned process running");

  const next = await context.tools.execute({
    callId: "qec-after-cancel",
    name: toolName,
    arguments: { ...request, seed: 2 },
    signal: new AbortController().signal,
  });
  assert.equal(next.isError, false, JSON.stringify(next));
  assert.equal(next.value.structuredContent.facts.result.shots, request.shots);
  assert.equal(next.value.structuredContent.experiment.seed, 2);
  assert.ok(next.value.structuredContent.validation.observations
    .filter((observation) => observation.id !== "provenance.complete")
    .every((observation) => observation.status === "pass"));
});
