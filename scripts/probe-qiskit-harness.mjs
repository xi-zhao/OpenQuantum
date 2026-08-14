#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const testFile = path.join(projectRoot, "tests", "harness-native-quantum.test.mjs");
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", testFile],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      OPENQUANTUM_TEST_QISKIT_MCP: "1",
      OPENQUANTUM_TEST_IBM_RUNTIME_MCP: "1",
    },
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  process.stderr.write(`Failed to start Qiskit Harness probe: ${error.message}\n`);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
