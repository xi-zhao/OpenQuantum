import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const qasm = 'OPENQASM 2.0; include "qelib1.inc"; qreg q[1]; h q[0];';
const qecArguments = { basis: "z", distance: 3, rounds: 3, shots: 1000, physicalErrorRate: 0, seed: 1234 };
const cases = [
  ["qec-memory-experiment", "run_qec_memory_experiment", qecArguments],
  ["quantum-circuit-verification", "verify_circuit_equivalence", { circuitAOpenQasm2: qasm, circuitBOpenQasm2: qasm }],
  ["quantum-information-audit", "audit_density_matrix", {
    matrixReal: [[0.5, 0, 0, 0.5], [0, 0, 0, 0], [0, 0, 0, 0], [0.5, 0, 0, 0.5]],
    subsystemDimensions: [2, 2],
    transposeSubsystems: [0],
  }],
  ["qpanda-qubo", "solve_qpanda_qubo", { quadratic: [[0, 0], [0, 0]], linear: [1, -1], method: "traversal" }],
  ["tyxonq-workbench", "simulate_tyxonq_circuit", { numQubits: 1, operations: [{ gate: "h", qubits: [0] }], mode: "exact" }],
];

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

async function fixture(t, capability) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "openquantum-mcp-cancel-"));
  const uvPath = path.join(directory, "uv");
  const knownPids = [];
  await writeFile(uvPath, `#!/usr/bin/env node
const { spawn } = await import("node:child_process");
const { writeFileSync } = await import("node:fs");
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks));
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
const key = input.request?.seed ?? "call";
writeFileSync(${JSON.stringify(directory)} + "/" + key + ".json", JSON.stringify({ parent: process.pid, child: child.pid }));
setInterval(() => {}, 1000);
`);
  await chmod(uvPath, 0o755);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(projectRoot, ".agents/skills", capability, "mcp/server.mjs")],
    cwd: projectRoot,
    env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH ?? ""}` },
  });
  const client = new Client({ name: "openquantum-cancellation-test", version: "1.0.0" });
  t.after(async () => {
    await client.close();
    for (const pid of knownPids) {
      try {
        if (isRunning(pid)) process.kill(pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
    await rm(directory, { recursive: true, force: true });
  });
  await client.connect(transport);
  return {
    client,
    async ready(key = "call") {
      const pids = await waitFor(
        async () => JSON.parse(await readFile(path.join(directory, `${key}.json`), "utf8")),
        `${capability} did not start its bridge`,
      );
      knownPids.push(...Object.values(pids));
      return pids;
    },
    stopped: (pids) => waitFor(
      () => Object.values(pids).every((pid) => !isRunning(pid)),
      `${capability} did not cancel its computing processes`,
    ),
  };
}

test("MCP cancellation reaches every local Python bridge", { skip: process.platform === "win32" }, async (t) => {
  for (const [capability, name, argumentsValue] of cases) {
    await t.test(capability, async (t) => {
      const current = await fixture(t, capability);
      const controller = new AbortController();
      const result = current.client.callTool({ name, arguments: argumentsValue }, undefined, { signal: controller.signal });
      const rejected = assert.rejects(result, /cancel|abort/i);
      const pids = await current.ready(argumentsValue.seed);
      controller.abort();
      await rejected;
      await current.stopped(pids);
      assert.ok((await current.client.listTools()).tools.some((tool) => tool.name === name));
    });
  }
});

test("cancelling one invocation leaves a concurrent computation and MCP server alive", { skip: process.platform === "win32" }, async (t) => {
  const current = await fixture(t, "qec-memory-experiment");
  const controllers = [new AbortController(), new AbortController()];
  const results = controllers.map((controller, index) => current.client.callTool({
    name: "run_qec_memory_experiment",
    arguments: { ...qecArguments, seed: index + 1 },
  }, undefined, { signal: controller.signal }));
  const rejected = results.map((result) => assert.rejects(result, /cancel|abort/i));
  const pids = await Promise.all([current.ready(1), current.ready(2)]);
  controllers[0].abort();
  await rejected[0];
  await current.stopped(pids[0]);
  assert.ok(Object.values(pids[1]).every(isRunning));
  assert.ok((await current.client.listTools()).tools.length > 0);
  controllers[1].abort();
  await rejected[1];
  await current.stopped(pids[1]);
});
