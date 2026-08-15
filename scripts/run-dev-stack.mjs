import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const services = [
  {
    name: "harness",
    command: process.execPath,
    args: [
      path.join(projectRoot, "scripts", "run-harness.mjs"),
      "--port",
      "3000",
      "--trusted-host",
      "localhost:3000",
    ],
  },
];
const children = services.map((service) => ({
  ...service,
  child: spawn(service.command, service.args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  }),
}));
let stopping = false;

function stopAll(signal) {
  if (stopping) {
    return;
  }

  stopping = true;

  for (const service of children) {
    if (service.child.exitCode === null) {
      service.child.kill(signal);
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => stopAll(signal));
}

for (const service of children) {
  service.child.once("error", (error) => {
    console.error(`Failed to start ${service.name}: ${error.message}`);
    process.exitCode = 1;
    stopAll("SIGTERM");
  });

  service.child.once("exit", (code, signal) => {
    if (!stopping) {
      console.error(
        `${service.name} stopped unexpectedly (${signal ?? `exit ${code ?? 1}`}).`,
      );
      process.exitCode = code ?? 1;
      stopAll("SIGTERM");
    }
  });
}
