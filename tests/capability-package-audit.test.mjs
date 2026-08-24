import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditCapabilityPackages } from "../scripts/lib/capability-package-audit.mjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

async function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

async function temporaryProject(t, policy) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "openquantum-capability-audit-"),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  await write(root, ".agents/capability-packages.yml", policy);
  await write(
    root,
    "runtime/openquantum/agent-presets/openquantum/agent.cordis.yml",
    "[]\n",
  );
  return root;
}

async function addTrackedSkill(root, id) {
  await write(
    root,
    `.agents/skills/${id}/SKILL.md`,
    `---\nname: ${id}\ndescription: Test capability.\n---\n\n# ${id}\n`,
  );
  execFileSync(
    "git",
    ["add", `.agents/skills/${id}/SKILL.md`],
    { cwd: root },
  );
}

test("repository capability packages conform to their declared L0-L3 evidence", async () => {
  const report = await auditCapabilityPackages({ projectRoot });

  assert.equal(report.status, "pass", report.issues.join("\n"));
  assert.deepEqual(report.summary.levelCounts, {
    L0: 1,
    L1: 6,
    L2: 2,
    L3: 1,
  });
  assert.equal(report.packages.length, 10);
  assert(
    report.packages.every((entry) => entry.status === "pass"),
    report.issues.join("\n"),
  );
});

test("tracked repository Skills cannot bypass the capability package policy", async (t) => {
  const root = await temporaryProject(
    t,
    'schemaVersion: "1.0"\npackages: []\n',
  );
  await addTrackedSkill(root, "unlisted-capability");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "tracked capability unlisted-capability is missing from .agents/capability-packages.yml",
    ),
  );
});

test("L1 execution fails closed when its declared MCP server is not registered", async (t) => {
  const root = await temporaryProject(
    t,
    `schemaVersion: "1.0"
packages:
  - id: demo-capability
    level: L1
    execution:
      servers:
        - name: missing_server
          source: package
      runners: []
      checks:
        - tests/demo.test.mjs
`,
  );
  await addTrackedSkill(root, "demo-capability");
  await write(root, "tests/demo.test.mjs", "export const checked = true;\n");

  const report = await auditCapabilityPackages({ projectRoot: root });

  assert.equal(report.status, "fail");
  assert(
    report.issues.includes(
      "demo-capability: MCP server missing_server is not registered",
    ),
  );
});
