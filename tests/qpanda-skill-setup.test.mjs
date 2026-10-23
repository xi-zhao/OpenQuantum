import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  installQpandaSkill,
  inspectQpandaSkill,
  QPANDA_SKILL_RELATIVE_ROOT,
} from "../scripts/setup-qpanda-skill.mjs";

import { installPinnedSource, inspectPinnedSource } from "../scripts/lib/install-pinned-source.mjs";

const exec = promisify(execFile);

async function git(cwd, ...args) {
  const result = await exec("git", args, { cwd });
  return result.stdout.trim();
}

test("qpanda skill setup publishes one pinned local checkout and is idempotent", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-qpanda-skill-"));
  const source = path.join(root, "source");
  const project = path.join(root, "project");
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(source);
  await mkdir(path.join(project, ".agents", "skills"), { recursive: true });
  await git(source, "init", "--quiet");
  await writeFile(
    path.join(source, "SKILL.md"),
    "---\nname: pyqpanda3\ndescription: \"fixture\"\n---\n\n# pyqpanda3\n",
  );
  await git(source, "add", "SKILL.md");
  await git(
    source,
    "-c",
    "user.name=OpenQuantum Test",
    "-c",
    "user.email=test@openquantum.local",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  );
  const revision = await git(source, "rev-parse", "HEAD");

  const installed = await installQpandaSkill(project, { source, revision });
  assert.equal(installed.status, "installed");
  assert.equal(installed.target, path.join(project, QPANDA_SKILL_RELATIVE_ROOT));
  const marker = JSON.parse(
    await readFile(path.join(installed.target, ".openquantum-source.json"), "utf8"),
  );
  assert.deepEqual(marker, { schemaVersion: "1.0", source, revision });

  const ready = await installQpandaSkill(project, { source, revision });
  assert.equal(ready.status, "ready");
  assert.equal(
    (await inspectQpandaSkill(project, { source, revision })).revision,
    revision,
  );
});

test("qpanda skill setup never overwrites an unverified existing checkout", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-qpanda-skill-guard-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, QPANDA_SKILL_RELATIVE_ROOT);
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, "SKILL.md"), "unreviewed\n");

  await assert.rejects(
    installQpandaSkill(root, {
      source: path.join(root, "unused-source"),
      revision: "1".repeat(40),
    }),
    /is not the pinned installation/,
  );
  assert.equal(await readFile(path.join(target, "SKILL.md"), "utf8"), "unreviewed\n");
});


test("generic pinned Skill defaults remain usable without an MCP review declaration", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "openquantum-generic-skill-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const project = path.join(root, "project");
  await mkdir(source);
  await mkdir(project);
  await git(source, "init", "--quiet");
  await writeFile(path.join(source, "SKILL.md"), "# A pinned offline Skill fixture\n");
  await git(source, "add", "SKILL.md");
  await git(source, "-c", "user.name=OpenQuantum Test", "-c", "user.email=test@openquantum.local", "commit", "--quiet", "-m", "generic Skill fixture");
  const integration = {
    sourceUrl: source, revision: await git(source, "rev-parse", "HEAD"),
    relativeRoot: ".openquantum/external/generic-skill", requiredFiles: ["SKILL.md"],
  };
  assert.equal((await installPinnedSource(project, integration)).status, "installed");
  assert.equal((await installPinnedSource(project, integration)).status, "ready");
  assert.equal((await inspectPinnedSource(project, integration)).revision, integration.revision);
  await assert.rejects(inspectPinnedSource(project, {
    ...integration, reviewServerName: "fixture-without-a-source-review",
  }), /missing its source review/, "a declared MCP review cannot silently fall back to a Git-only check");
});
