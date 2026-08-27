#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { readDefaultCapabilityContractChecks } from "./lib/capability-tool-contract.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const checks = readDefaultCapabilityContractChecks({ projectRoot });

if (checks.length === 0) {
  throw new Error("Capability policy does not declare any default contract checks");
}

process.stdout.write(
  `Running ${checks.length} policy-declared capability contract checks\n`,
);
const result = spawnSync(process.execPath, ["--test", ...checks], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
}
