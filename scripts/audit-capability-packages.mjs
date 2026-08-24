#!/usr/bin/env node

import { fileURLToPath } from "node:url";

import { auditCapabilityPackages } from "./lib/capability-package-audit.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const report = await auditCapabilityPackages({ projectRoot });

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  const counts = Object.entries(report.summary.levelCounts)
    .map(([level, count]) => `${level}=${count}`)
    .join(" ");
  process.stdout.write(
    `${report.status.toUpperCase()} capability package conformance: ` +
      `${report.summary.packageCount} packages (${counts})\n`,
  );
  for (const entry of report.packages) {
    process.stdout.write(
      `- ${entry.status.toUpperCase()} ${entry.id} ${entry.level}\n`,
    );
  }
  for (const issue of report.issues) {
    process.stderr.write(`- ${issue}\n`);
  }
}

if (report.status !== "pass") {
  process.exitCode = 1;
}
