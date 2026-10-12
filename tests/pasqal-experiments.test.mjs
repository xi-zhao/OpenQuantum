import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readCapabilities } from "../runtime/chatgpt/catalog.mjs";
import { describeSdk } from "../src/lib/sdk-access.mjs";
import { projectSkill } from "../scripts/build-chatgpt.mjs";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, ".agents/skills/pasqal-experiments");

test("Pasqal workflow shares the full Pulser/Cloud environment in Desktop and Codex", async () => {
  const capability = (await readCapabilities(root)).find(item => item.id === "pasqal-experiments");
  assert.equal(capability.status, "available");
  assert.deepEqual(capability.sdkIds, ["pulser-dynamics"]);
  assert.deepEqual(capability.mcp, []);
  assert.equal(capability.hostTools.length, 2);
  const sdk = await describeSdk(root, "pulser-dynamics");
  assert.ok(sdk.modules.includes("pasqal_cloud"));
  assert.ok(sdk.dependencies.includes("pulser-core==1.9.1"));
  assert.ok(sdk.dependencies.includes("pasqal-cloud==0.24.0"));
  const generated = projectSkill(capability, { version: "test" });
  assert.match(generated, /pulser-dynamics/);
  assert.match(generated, /不得绕过用户禁用/);
  for (const stage of ["application-to-idea", "idea-to-spec", "spec-to-sequence", "validate-emu", "noise-emulate", "qpu-submit", "harvest-and-analyze"]) {
    assert.ok(capability.skill.includes(stage), stage);
  }
});

test("vendored Pasqal research references retain the fixed source and exact hashes", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "upstream-manifest.json"), "utf8"));
  assert.equal(manifest.revision, "2b0353d83e65ce4cc44c9bfa7e7dfe2549201bb1");
  for (const [name, hash] of Object.entries(manifest.files)) {
    const actual = await fs.readFile(path.join(directory, "upstream", name));
    assert.equal(createHash("sha256").update(actual).digest("hex"), hash, name);
  }
  assert.match(await fs.readFile(path.join(directory, "LICENSE.upstream"), "utf8"), /Apache License/);
});

test("real Pulser numerics and real Pasqal SDK lifecycle run with external sockets disabled", {
  skip: process.env.OPENQUANTUM_REAL_PASQAL !== "1", timeout: 180000,
}, async () => {
  const sdk = await describeSdk(root, "pulser-dynamics");
  assert.equal(sdk.environmentState, "prepared", "Run node scripts/setup-sdk.mjs pulser-dynamics first");
  const evidence = path.join(root, ".openquantum/pasqal-evidence");
  await fs.mkdir(evidence, { recursive: true });
  const run = spawnSync(sdk.run.command, ["-B", path.join(directory, "test/workflow_test.py")], {
    cwd: root, env: { ...process.env, MPLCONFIGDIR: path.join(evidence, "matplotlib"), PYTHONDONTWRITEBYTECODE: "1" },
    encoding: "utf8", timeout: 160000,
  });
  await fs.writeFile(path.join(evidence, "python-tests.log"), `${run.stdout}\n${run.stderr}`);
  assert.equal(run.status, 0, `${run.error?.message ?? ""}\n${run.stdout}\n${run.stderr}`);
  assert.match(run.stderr, /\nOK\n/);
});
